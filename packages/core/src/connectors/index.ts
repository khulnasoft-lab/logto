import { existsSync } from 'fs';
import path from 'path';

import { connectorDirectory } from '@logto/cli/lib/constants';
import { getConnectorPackagesFromDirectory } from '@logto/cli/lib/utilities';
import type { AllConnector, CreateConnector } from '@logto/connector-kit';
import { validateConfig } from '@logto/connector-kit';
import { findPackage } from '@logto/shared';
import chalk from 'chalk';

import RequestError from '@/errors/RequestError';
import { findAllConnectors } from '@/queries/connector';

import { defaultConnectorMethods } from './consts';
import type { LoadConnector, LogtoConnector } from './types';
import { getConnectorConfig, readUrl, validateConnectorModule } from './utilities';

// eslint-disable-next-line @silverhand/fp/no-let
let cachedConnectors: LoadConnector[] | undefined;

export const loadConnectors = async () => {
  if (cachedConnectors) {
    return cachedConnectors;
  }

  // Until we migrate to ESM
  // eslint-disable-next-line unicorn/prefer-module
  const coreDirectory = await findPackage(__dirname);
  const directory = coreDirectory && path.join(coreDirectory, connectorDirectory);

  if (!directory || !existsSync(directory)) {
    return [];
  }

  const connectorPackages = await getConnectorPackagesFromDirectory(directory);

  const connectors = await Promise.all(
    connectorPackages.map(async ({ path: packagePath, name }) => {
      try {
        // eslint-disable-next-line no-restricted-syntax
        const { default: createConnector } = (await import(packagePath)) as {
          default: CreateConnector<AllConnector>;
        };
        const rawConnector = await createConnector({ getConfig: getConnectorConfig });
        validateConnectorModule(rawConnector);

        const connector: LoadConnector = {
          ...defaultConnectorMethods,
          ...rawConnector,
          metadata: {
            ...rawConnector.metadata,
            logo: await readUrl(rawConnector.metadata.logo, packagePath, 'svg'),
            logoDark:
              rawConnector.metadata.logoDark &&
              (await readUrl(rawConnector.metadata.logoDark, packagePath, 'svg')),
            readme: await readUrl(rawConnector.metadata.readme, packagePath, 'text'),
            configTemplate: await readUrl(
              rawConnector.metadata.configTemplate,
              packagePath,
              'text'
            ),
          },
          validateConfig: (config: unknown) => {
            validateConfig(config, rawConnector.configGuard);
          },
        };

        return connector;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.log(
            `${chalk.red(
              `[load-connector] skip ${chalk.bold(name)} due to error: ${error.message}`
            )}`
          );

          return;
        }

        throw error;
      }
    })
  );

  // eslint-disable-next-line @silverhand/fp/no-mutation
  cachedConnectors = connectors.filter(
    (connector): connector is LoadConnector => connector !== undefined
  );

  return cachedConnectors;
};

export const getLogtoConnectors = async (): Promise<LogtoConnector[]> => {
  const connectors = await findAllConnectors();

  const loadConnectorPackages = await loadConnectors();
  const loadConnectorPackageMap = new Map(
    loadConnectorPackages.map((loadConnectorPackage) => [
      loadConnectorPackage.metadata.id,
      loadConnectorPackage,
    ])
  );

  // Console.log('connectors:', connectors);
  console.log('loadConnectorPackages:', loadConnectorPackages);

  return Promise.all(
    connectors.map(async (connector) => {
      const {
        connectorId,
        metadata: { target, logo, logoDark },
      } = connector;
      const loadConnectorPackage = loadConnectorPackageMap.get(connectorId);

      if (!loadConnectorPackage) {
        throw new RequestError({ code: 'entity.not_found', connectorId, status: 404 });
      }

      return {
        ...loadConnectorPackage,
        metadata: {
          ...loadConnectorPackage.metadata,
          target: target ?? loadConnectorPackage.metadata.target,
          logo: logo ?? loadConnectorPackage.metadata.logo,
          logoDark: logoDark ?? loadConnectorPackage.metadata.logoDark,
        },
        dbEntry: connector,
      };
    })
  );
};

export const getLogtoConnectorById = async (id: string): Promise<LogtoConnector> => {
  const connectors = await getLogtoConnectors();
  const pickedConnector = connectors.find(({ dbEntry }) => dbEntry.id === id);

  if (!pickedConnector) {
    throw new RequestError({
      code: 'entity.not_found',
      id,
      status: 404,
    });
  }

  return pickedConnector;
};

import { type ReactNode } from 'react';

import { contactEmailLink } from '@/consts';
import TextLink from '@/ds-components/TextLink';

type Props = {
  children?: ReactNode;
};

function ContactUsPhraseLink({ children }: Props) {
  return <TextLink href={contactEmailLink}>{children}</TextLink>;
}

export default ContactUsPhraseLink;

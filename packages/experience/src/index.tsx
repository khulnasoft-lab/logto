/* eslint-disable-next-line import/no-unassigned-import */
import 'core-js/actual';
import { createRoot } from 'react-dom/client';
import ReactModal from 'react-modal';

import App from './App';

const app = document.querySelector('#app');
const root = app && createRoot(app);
ReactModal.setAppElement('#app');
root?.render(<App />);

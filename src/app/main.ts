import '../styles/global.css';
import { renderShell } from '../layout/shell';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  renderShell(app);
}

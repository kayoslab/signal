import '../styles/global.css';
import { renderIntro } from '../modules/intro/intro-sequence';
import { renderShell } from '../layout/shell';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  renderIntro(app).then(() => renderShell(app));
}

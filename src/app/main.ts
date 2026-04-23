import '../styles/global.css';
import { renderIntro } from '../modules/intro/intro-sequence';
import { renderShell } from '../layout/shell';
import { renderPermissionDebtModule } from '../modules/permission-debt';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  renderIntro(app).then(async () => {
    renderShell(app);
    const dashboard = document.querySelector<HTMLElement>('#dashboard');
    if (dashboard) {
      const permissionDebt = await renderPermissionDebtModule();
      dashboard.appendChild(permissionDebt);
    }
  });
}

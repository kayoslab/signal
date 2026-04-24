import '../styles/global.css';
import { renderIntro } from '../modules/intro/intro-sequence';
import { renderShell } from '../layout/shell';
import { renderPermissionDebtModule } from '../modules/permission-debt';
import { renderZeroClickOsintModule } from '../modules/zero-click-osint';
import { renderShadowProfileModule } from '../modules/shadow-profile';
import { renderThreatModelModule } from '../modules/threat-model';
import { renderHardeningModule } from '../modules/hardening';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  renderIntro(app).then(async () => {
    renderShell(app);
    const dashboard = document.querySelector<HTMLElement>('#dashboard');
    if (dashboard) {
      const zeroClickOsint = renderZeroClickOsintModule();
      dashboard.appendChild(zeroClickOsint);

      const permissionDebt = await renderPermissionDebtModule();
      dashboard.appendChild(permissionDebt);

      const shadowProfile = await renderShadowProfileModule();
      dashboard.appendChild(shadowProfile);

      const threatModel = await renderThreatModelModule();
      dashboard.appendChild(threatModel);

      await renderHardeningModule(dashboard);
    }
  });
}

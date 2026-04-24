import '../styles/global.css';
import { renderIntro } from '../modules/intro/intro-sequence';
import { renderShell } from '../layout/shell';
import { renderFingerprintReceipt } from '../modules/fingerprint';
import { renderPermissionDebtModule } from '../modules/permission-debt';
import { renderZeroClickOsintModule } from '../modules/zero-click-osint';
import { renderShadowProfileModule } from '../modules/shadow-profile';
import { renderThreatModelModule } from '../modules/threat-model';
import { renderHardeningModule } from '../modules/hardening';
import { createInfoButton, createInfoOverlay } from '../ui/infoOverlay';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  document.body.appendChild(createInfoButton());
  document.body.appendChild(createInfoOverlay());

  renderIntro(app).then(async () => {
    renderShell(app);
    const dashboard = document.querySelector<HTMLElement>('#dashboard');
    if (dashboard) {
      // Fingerprint receipt — first on mobile, central report
      const receipt = renderFingerprintReceipt();
      receipt.classList.add('dashboard-receipt');
      dashboard.appendChild(receipt);

      const zeroClickOsint = await renderZeroClickOsintModule();
      zeroClickOsint.classList.add('dashboard-osint');
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

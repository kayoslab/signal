import '../styles/global.css';
import { renderIntro } from '../modules/intro/intro-sequence';
import { renderShell } from '../layout/shell';
import { renderFingerprintReceipt } from '../modules/fingerprint';
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
      // Receipt — always first, centered, prominent
      const receipt = await renderFingerprintReceipt();
      receipt.classList.add('dashboard-receipt');
      dashboard.appendChild(receipt);

      // OSINT — full width card grid
      const zeroClickOsint = await renderZeroClickOsintModule();
      zeroClickOsint.classList.add('dashboard-osint');
      dashboard.appendChild(zeroClickOsint);

      // Balanced bottom row
      const shadowProfile = await renderShadowProfileModule();
      dashboard.appendChild(shadowProfile);

      const threatModel = await renderThreatModelModule();
      dashboard.appendChild(threatModel);

      await renderHardeningModule(dashboard);
    }
  });
}

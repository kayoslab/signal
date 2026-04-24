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
      // Row 1: OSINT — full width
      const zeroClickOsint = await renderZeroClickOsintModule();
      zeroClickOsint.classList.add('dashboard-osint');
      dashboard.appendChild(zeroClickOsint);

      // Row 2: Shadow Profile | Receipt (center) | Threat Model
      const shadowProfile = await renderShadowProfileModule();
      shadowProfile.classList.add('dashboard-side');
      dashboard.appendChild(shadowProfile);

      const receipt = await renderFingerprintReceipt();
      receipt.classList.add('dashboard-receipt');
      dashboard.appendChild(receipt);

      const threatModel = await renderThreatModelModule();
      threatModel.classList.add('dashboard-side');
      dashboard.appendChild(threatModel);

      // Row 3: Hardening — full width
      await renderHardeningModule(dashboard);
    }
  });
}

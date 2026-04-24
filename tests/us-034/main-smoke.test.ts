// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/styles/global.css', () => ({}));

vi.mock('../../src/modules/intro/intro-sequence', () => ({
  renderIntro: vi.fn(),
}));

vi.mock('../../src/layout/shell', () => ({
  renderShell: vi.fn(),
}));

vi.mock('../../src/modules/fingerprint', () => ({
  renderFingerprintReceipt: vi.fn(),
}));

vi.mock('../../src/modules/zero-click-osint', () => ({
  renderZeroClickOsintModule: vi.fn(),
}));

vi.mock('../../src/modules/permission-debt', () => ({
  renderPermissionDebtModule: vi.fn(),
}));

vi.mock('../../src/modules/shadow-profile', () => ({
  renderShadowProfileModule: vi.fn(),
}));

vi.mock('../../src/modules/threat-model', () => ({
  renderThreatModelModule: vi.fn(),
}));

vi.mock('../../src/modules/hardening', () => ({
  renderHardeningModule: vi.fn(),
}));

import { renderIntro } from '../../src/modules/intro/intro-sequence';
import { renderShell } from '../../src/layout/shell';
import { renderFingerprintReceipt } from '../../src/modules/fingerprint';
import { renderZeroClickOsintModule } from '../../src/modules/zero-click-osint';
import { renderPermissionDebtModule } from '../../src/modules/permission-debt';
import { renderShadowProfileModule } from '../../src/modules/shadow-profile';
import { renderThreatModelModule } from '../../src/modules/threat-model';
import { renderHardeningModule } from '../../src/modules/hardening';

describe('US-034: Main page smoke test', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';
  });

  it('bootstraps the app when #app element exists', async () => {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    const dashboardDiv = document.createElement('div');
    dashboardDiv.id = 'dashboard';

    const receiptEl = document.createElement('div');
    receiptEl.className = 'receipt';
    const zeroClickEl = document.createElement('section');
    zeroClickEl.className = 'zero-click';
    const permDebtEl = document.createElement('section');
    permDebtEl.className = 'perm-debt';
    const shadowProfileEl = document.createElement('section');
    shadowProfileEl.className = 'shadow-profile';
    const threatModelEl = document.createElement('section');
    threatModelEl.className = 'threat-model';

    vi.mocked(renderIntro).mockResolvedValue(undefined);
    vi.mocked(renderShell).mockImplementation((root: HTMLElement) => {
      root.appendChild(dashboardDiv);
    });
    vi.mocked(renderFingerprintReceipt).mockReturnValue(receiptEl);
    vi.mocked(renderZeroClickOsintModule).mockResolvedValue(zeroClickEl);
    vi.mocked(renderPermissionDebtModule).mockResolvedValue(permDebtEl);
    vi.mocked(renderShadowProfileModule).mockResolvedValue(shadowProfileEl);
    vi.mocked(renderThreatModelModule).mockResolvedValue(threatModelEl);
    vi.mocked(renderHardeningModule).mockResolvedValue(undefined);

    await import('../../src/app/main');
    // Allow the promise chain inside main.ts to resolve
    await vi.waitFor(() => {
      expect(renderShell).toHaveBeenCalled();
    });

    expect(renderIntro).toHaveBeenCalledWith(appDiv);
    expect(renderShell).toHaveBeenCalledWith(appDiv);
    expect(renderFingerprintReceipt).toHaveBeenCalled();
    expect(renderZeroClickOsintModule).toHaveBeenCalled();
    expect(renderPermissionDebtModule).toHaveBeenCalled();
    expect(renderShadowProfileModule).toHaveBeenCalled();
    expect(renderThreatModelModule).toHaveBeenCalled();
    expect(renderHardeningModule).toHaveBeenCalled();
    expect(dashboardDiv.children).toHaveLength(5);
    expect(dashboardDiv.children[0]).toBe(receiptEl);
    expect(dashboardDiv.children[1]).toBe(zeroClickEl);
    expect(dashboardDiv.children[2]).toBe(permDebtEl);
    expect(dashboardDiv.children[3]).toBe(shadowProfileEl);
    expect(dashboardDiv.children[4]).toBe(threatModelEl);
  });

  it('does not crash when #app element is missing', async () => {
    document.body.innerHTML = '';

    vi.resetModules();
    vi.mocked(renderIntro).mockResolvedValue(undefined);

    await expect(
      import('../../src/app/main')
    ).resolves.not.toThrow();

    expect(renderIntro).not.toHaveBeenCalled();
  });

  it('handles missing #dashboard gracefully', async () => {
    const appDiv = document.createElement('div');
    appDiv.id = 'app';
    document.body.appendChild(appDiv);

    vi.mocked(renderIntro).mockResolvedValue(undefined);
    vi.mocked(renderShell).mockImplementation(() => {
      // Shell renders but doesn't create #dashboard
    });

    vi.resetModules();
    await import('../../src/app/main');
    await vi.waitFor(() => {
      expect(renderShell).toHaveBeenCalled();
    });

    expect(renderZeroClickOsintModule).not.toHaveBeenCalled();
    expect(renderPermissionDebtModule).not.toHaveBeenCalled();
  });
});

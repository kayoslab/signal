import type { SignalSnapshot } from '../../signals/snapshot';
import type { ReceiptRow } from '../../ui/receipt';
import { MISSING } from '../../signals/snapshot';

export const FALLBACK_COPY = 'Not available';

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (value === MISSING.unknown || value === MISSING.unavailable) return true;
  return false;
}

function formatValue(value: unknown): string {
  if (isMissing(value)) return FALLBACK_COPY;
  return String(value);
}

function formatStorage(storageSupport: Record<string, boolean | string>): string {
  const available = Object.entries(storageSupport)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  return available.length > 0 ? available.join(', ') : FALLBACK_COPY;
}

function formatScreenResolution(width: unknown, height: unknown): string {
  if (isMissing(width) || isMissing(height)) return FALLBACK_COPY;
  return `${width} × ${height}`;
}

function formatTouchSupport(value: unknown): string {
  if (isMissing(value)) return FALLBACK_COPY;
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return String(value);
}

function formatLanguages(languages: readonly string[]): string {
  const filtered = languages.filter((l) => !isMissing(l));
  return filtered.length > 0 ? filtered.join(', ') : FALLBACK_COPY;
}

export function formatSnapshotToRows(snapshot: SignalSnapshot): ReceiptRow[] {
  return [
    { label: 'Renderer', value: formatValue(snapshot.rendering.renderer) },
    { label: 'Vendor', value: formatValue(snapshot.rendering.vendor) },
    { label: 'WebGL Version', value: formatValue(snapshot.rendering.webglVersion) },
    { label: 'Storage', value: formatStorage(snapshot.device.storageSupport as unknown as Record<string, boolean | string>) },
    { label: 'Screen Resolution', value: formatScreenResolution(snapshot.device.screenWidth, snapshot.device.screenHeight) },
    { label: 'Device Pixel Ratio', value: formatValue(snapshot.device.devicePixelRatio) },
    { label: 'Touch Support', value: formatTouchSupport(snapshot.device.touchSupport) },
    { label: 'CPU Threads', value: formatValue(snapshot.device.hardwareConcurrency) },
    { label: 'Timezone', value: formatValue(snapshot.locale.timezone) },
    { label: 'Languages', value: formatLanguages(snapshot.locale.languages) },
    { label: 'Platform', value: formatValue(snapshot.locale.platform) },
    { label: 'Do Not Track', value: formatValue(snapshot.locale.doNotTrack) },
  ];
}

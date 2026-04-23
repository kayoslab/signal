import type { SignalSnapshot } from '../signals/snapshot';
import { MISSING } from '../signals/snapshot';
import type { ReceiptRow } from '../ui/receipt';

function isMissing(value: unknown): boolean {
  return value === MISSING.unknown || value === MISSING.unavailable;
}

function formatTimezone(timezone: string): string {
  return isMissing(timezone) ? 'Unavailable' : timezone;
}

function formatLanguages(languages: readonly string[]): string {
  const valid = languages.filter((l) => !isMissing(l));
  return valid.length > 0 ? valid.join(', ') : 'Unavailable';
}

function formatPlatform(platform: string): string {
  return isMissing(platform) ? 'Unavailable' : platform;
}

function formatTouchSupport(touchSupport: boolean | string): string {
  if (isMissing(touchSupport)) return 'Unavailable';
  return touchSupport ? 'Supported' : 'Not supported';
}

function formatCpuThreads(hardwareConcurrency: number | string): string {
  if (isMissing(hardwareConcurrency) || typeof hardwareConcurrency !== 'number') {
    return 'Unavailable';
  }
  return `${hardwareConcurrency} ${hardwareConcurrency === 1 ? 'thread' : 'threads'}`;
}

function formatDoNotTrack(doNotTrack: string): string {
  if (doNotTrack === '1') return 'Enabled';
  if (doNotTrack === '0') return 'Disabled';
  return 'Not set';
}

export function formatSnapshotToReceiptRows(snapshot: SignalSnapshot): ReceiptRow[] {
  return [
    { label: 'Timezone', value: formatTimezone(snapshot.locale.timezone) },
    { label: 'Languages', value: formatLanguages(snapshot.locale.languages) },
    { label: 'Platform', value: formatPlatform(snapshot.locale.platform) },
    { label: 'Touch Support', value: formatTouchSupport(snapshot.device.touchSupport) },
    { label: 'CPU Threads', value: formatCpuThreads(snapshot.device.hardwareConcurrency) },
    { label: 'Do Not Track', value: formatDoNotTrack(snapshot.locale.doNotTrack) },
  ];
}

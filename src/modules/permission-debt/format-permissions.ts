import type { PermissionCheckResult } from '../../permissions/permissions-adapter';
import type { ReceiptRow } from '../../ui/receipt';

const LABEL_MAP: Record<string, string> = {
  notifications: 'Notifications',
  camera: 'Camera',
  microphone: 'Microphone',
  clipboard: 'Clipboard',
  geolocation: 'Location',
};

function toLabel(name: string): string {
  return LABEL_MAP[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatPermissions(permissions: PermissionCheckResult[]): ReceiptRow[] {
  return permissions.map((p) => ({
    label: toLabel(p.name),
    value: p.state,
  }));
}

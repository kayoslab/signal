export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface PermissionCheckResult {
  name: string;
  state: PermissionState;
}

const STANDARD_PERMISSIONS = [
  'geolocation',
  'notifications',
  'camera',
  'microphone',
  'persistent-storage',
  'push',
  'screen-wake-lock',
  'accelerometer',
  'gyroscope',
  'magnetometer',
  'midi',
] as const;

export function hasPermissionsAPI(): boolean {
  return (
    typeof globalThis.navigator !== 'undefined' &&
    typeof globalThis.navigator?.permissions?.query === 'function'
  );
}

export async function queryPermission(name: string): Promise<PermissionState> {
  if (!hasPermissionsAPI()) {
    return 'unsupported';
  }

  try {
    const status = await navigator.permissions.query({
      name: name as PermissionName,
    });
    return status.state as PermissionState;
  } catch {
    return 'unsupported';
  }
}

export async function checkPermissions(): Promise<PermissionCheckResult[]> {
  const results = await Promise.all(
    STANDARD_PERMISSIONS.map(async (name) => ({
      name,
      state: await queryPermission(name),
    })),
  );
  return results;
}

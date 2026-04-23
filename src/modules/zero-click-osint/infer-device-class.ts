type Confidence = 'low' | 'medium' | 'high';

interface DeviceClassResult {
  deviceClass: string;
  confidence: Confidence;
}

const SENTINELS = new Set(['unknown', 'unavailable']);

export function inferDeviceClass(
  screenWidth: number | string,
  dpr: number | string,
  touch: boolean | string,
): DeviceClassResult {
  if (
    typeof screenWidth === 'string' && SENTINELS.has(screenWidth) ||
    typeof dpr === 'string' && SENTINELS.has(dpr as string) ||
    typeof touch === 'string' && SENTINELS.has(touch as string)
  ) {
    return { deviceClass: 'Unknown', confidence: 'low' };
  }

  const width = typeof screenWidth === 'number' ? screenWidth : 0;
  const hasTouch = touch === true;

  if (hasTouch && width < 600) {
    return { deviceClass: 'Mobile', confidence: 'medium' };
  }

  if (hasTouch && width >= 600 && width <= 1100) {
    return { deviceClass: 'Tablet', confidence: 'medium' };
  }

  if (!hasTouch && width > 1100) {
    return { deviceClass: 'Desktop', confidence: 'medium' };
  }

  if (hasTouch && width > 1100) {
    return { deviceClass: 'Desktop', confidence: 'medium' };
  }

  if (!hasTouch && width <= 1100) {
    return { deviceClass: 'Desktop', confidence: 'medium' };
  }

  return { deviceClass: 'Unknown', confidence: 'low' };
}

type Confidence = 'low' | 'medium' | 'high';

interface BrowserFamilyResult {
  family: string;
  confidence: Confidence;
}

const SENTINELS = new Set(['unknown', 'unavailable', '']);

function isSentinel(value: string): boolean {
  return SENTINELS.has(value);
}

export function inferBrowserFamily(
  platform: string,
  renderer: string,
  vendor: string,
): BrowserFamilyResult {
  if (isSentinel(platform) && isSentinel(renderer) && isSentinel(vendor)) {
    return { family: 'Unknown', confidence: 'low' };
  }

  const rendererLower = renderer.toLowerCase();
  const vendorLower = vendor.toLowerCase();

  if (vendorLower === 'mozilla' || rendererLower.startsWith('mesa')) {
    return { family: 'Firefox', confidence: 'medium' };
  }

  if (
    vendorLower.includes('google') ||
    rendererLower.startsWith('angle')
  ) {
    return { family: 'Chrome', confidence: 'medium' };
  }

  if (
    vendorLower === 'apple inc.' &&
    rendererLower === 'apple gpu'
  ) {
    return { family: 'Safari', confidence: 'medium' };
  }

  return { family: 'Unknown', confidence: 'low' };
}

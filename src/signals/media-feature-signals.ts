export interface MediaFeatureSignals {
  prefersColorScheme: string;
  prefersReducedMotion: boolean | string;
  prefersContrast: string;
  forcedColors: boolean | string;
  colorGamut: string;
  dynamicRange: string;
  invertedColors: boolean | string;
}

const UNAVAILABLE = 'unavailable';

function queryMatch(query: string): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  try {
    return globalThis.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function collectMediaFeatureSignals(): MediaFeatureSignals {
  if (typeof globalThis.matchMedia !== 'function') {
    return {
      prefersColorScheme: UNAVAILABLE,
      prefersReducedMotion: UNAVAILABLE,
      prefersContrast: UNAVAILABLE,
      forcedColors: UNAVAILABLE,
      colorGamut: UNAVAILABLE,
      dynamicRange: UNAVAILABLE,
      invertedColors: UNAVAILABLE,
    };
  }

  // Color scheme
  let prefersColorScheme = 'no-preference';
  if (queryMatch('(prefers-color-scheme: dark)')) prefersColorScheme = 'dark';
  else if (queryMatch('(prefers-color-scheme: light)')) prefersColorScheme = 'light';

  // Reduced motion
  const prefersReducedMotion = queryMatch('(prefers-reduced-motion: reduce)');

  // Contrast
  let prefersContrast = 'no-preference';
  if (queryMatch('(prefers-contrast: more)')) prefersContrast = 'more';
  else if (queryMatch('(prefers-contrast: less)')) prefersContrast = 'less';
  else if (queryMatch('(prefers-contrast: forced)')) prefersContrast = 'forced';

  // Forced colors
  const forcedColors = queryMatch('(forced-colors: active)');

  // Color gamut
  let colorGamut = 'srgb';
  if (queryMatch('(color-gamut: rec2020)')) colorGamut = 'rec2020';
  else if (queryMatch('(color-gamut: p3)')) colorGamut = 'p3';
  else if (queryMatch('(color-gamut: srgb)')) colorGamut = 'srgb';

  // Dynamic range
  let dynamicRange = 'standard';
  if (queryMatch('(dynamic-range: high)')) dynamicRange = 'high';

  // Inverted colors
  const invertedColors = queryMatch('(inverted-colors: inverted)');

  return {
    prefersColorScheme,
    prefersReducedMotion,
    prefersContrast,
    forcedColors,
    colorGamut,
    dynamicRange,
    invertedColors,
  };
}

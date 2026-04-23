import type { SignalSnapshot } from '../../signals/snapshot';
import type { OsintCardData } from '../../ui/osint-card';
import { inferBrowserFamily } from './infer-browser-family';
import { inferDeviceClass } from './infer-device-class';
import { inferRegion } from './infer-region';

export function mapSnapshotToFindings(snapshot: SignalSnapshot): OsintCardData[] {
  const cards: OsintCardData[] = [];

  // Timezone
  cards.push({
    title: 'Timezone',
    value: snapshot.locale.timezone,
    source: 'Intl.DateTimeFormat',
    confidence: 'high',
    whyItMatters: 'Narrows geographic region and daily schedule patterns.',
  });

  // Language
  const langs = snapshot.locale.languages;
  const langValue = Array.isArray(langs) ? langs.join(', ') : String(langs);
  cards.push({
    title: 'Language',
    value: langValue,
    source: 'navigator.languages',
    confidence: 'high',
    whyItMatters: 'Reveals locale, cultural context, and likely geographic origin.',
  });

  // Browser Family
  const browser = inferBrowserFamily(
    snapshot.locale.platform,
    snapshot.rendering.renderer,
    snapshot.rendering.vendor,
  );
  cards.push({
    title: 'Browser Family',
    value: browser.family,
    source: 'Platform + WebGL heuristics',
    confidence: browser.confidence,
    whyItMatters: 'Reveals software choices and potential vulnerability surface.',
  });

  // Device Class
  const device = inferDeviceClass(
    snapshot.device.screenWidth,
    snapshot.device.devicePixelRatio,
    snapshot.device.touchSupport,
  );
  cards.push({
    title: 'Device Class',
    value: device.deviceClass,
    source: 'Screen dimensions + touch support',
    confidence: device.confidence,
    whyItMatters: 'Reveals hardware category and usage context.',
  });

  // Screen Profile
  const w = snapshot.device.screenWidth;
  const h = snapshot.device.screenHeight;
  const dpr = snapshot.device.devicePixelRatio;
  const screenValue =
    typeof w === 'number' && typeof h === 'number' && typeof dpr === 'number'
      ? `${w}×${h} @${dpr}x`
      : 'Unavailable';
  cards.push({
    title: 'Screen Profile',
    value: screenValue,
    source: 'screen API + devicePixelRatio',
    confidence: typeof w === 'number' ? 'high' : 'low',
    whyItMatters: 'Screen dimensions and pixel density aid fingerprinting.',
  });

  // Rendering Engine
  const rendererValue = snapshot.rendering.renderer;
  cards.push({
    title: 'Rendering Engine',
    value: rendererValue,
    source: 'WEBGL_debug_renderer_info',
    confidence: snapshot.rendering.webglSupported ? 'high' : 'low',
    whyItMatters: 'GPU renderer string is a highly unique device identifier.',
  });

  // Input Capability
  const touch = snapshot.device.touchSupport;
  const sw = snapshot.device.screenWidth;
  let inputValue: string;
  if (typeof touch === 'string') {
    inputValue = 'Unavailable';
  } else if (touch && typeof sw === 'number' && sw < 600) {
    inputValue = 'Touch';
  } else if (touch) {
    inputValue = 'Touch + Keyboard';
  } else {
    inputValue = 'Keyboard & Mouse';
  }
  cards.push({
    title: 'Input Capability',
    value: inputValue,
    source: 'Touch support + screen heuristics',
    confidence: typeof touch === 'boolean' ? 'medium' : 'low',
    whyItMatters: 'Reveals primary interaction model and device form factor.',
  });

  // Approximate Region
  const region = inferRegion(snapshot.locale.timezone);
  cards.push({
    title: 'Approximate Region',
    value: region.region,
    source: 'Timezone inference',
    confidence: region.confidence,
    whyItMatters: 'Geographic approximation from timezone alone is imprecise but narrows location.',
  });

  return cards;
}

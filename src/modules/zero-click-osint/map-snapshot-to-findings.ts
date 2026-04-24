import type { SignalSnapshot } from '../../signals/snapshot';
import type { AsyncSignals } from '../../signals/async-snapshot';
import type { OsintCardData } from '../../ui/osint-card';
import { inferBrowserFamily } from './infer-browser-family';
import { inferDeviceClass } from './infer-device-class';
import { inferRegion } from './infer-region';

export function mapSnapshotToFindings(
  snapshot: SignalSnapshot,
  asyncSignals?: AsyncSignals,
): OsintCardData[] {
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
      ? `${w}\u00d7${h} @${dpr}x`
      : 'Unavailable';
  cards.push({
    title: 'Screen Profile',
    value: screenValue,
    source: 'screen API + devicePixelRatio',
    confidence: typeof w === 'number' ? 'high' : 'low',
    whyItMatters: 'Screen dimensions and pixel density aid fingerprinting.',
  });

  // Rendering Engine
  cards.push({
    title: 'Rendering Engine',
    value: snapshot.rendering.renderer,
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

  // --- New signals ---

  // Canvas Fingerprint
  if (snapshot.canvas.canvasSupported) {
    cards.push({
      title: 'Canvas Fingerprint',
      value: snapshot.canvas.canvasHash,
      source: 'Canvas 2D API — toDataURL hash',
      confidence: 'high',
      whyItMatters: 'Canvas rendering varies by GPU, driver, and OS. The resulting image hash is one of the most effective cross-site tracking identifiers.',
    });
  }

  // Font Inventory
  if (snapshot.fonts.fontCount > 0) {
    const sample = snapshot.fonts.detectedFonts.slice(0, 5).join(', ');
    const suffix = snapshot.fonts.fontCount > 5 ? ` + ${snapshot.fonts.fontCount - 5} more` : '';
    cards.push({
      title: 'Font Inventory',
      value: `${snapshot.fonts.fontCount} fonts: ${sample}${suffix}`,
      source: 'Canvas text measurement',
      confidence: 'high',
      whyItMatters: 'Installed fonts vary by OS, language packs, and user customization. The combination is highly identifying.',
    });
  }

  // WebGL Parameters
  if (typeof snapshot.webglParams.maxTextureSize === 'number') {
    cards.push({
      title: 'WebGL Parameters',
      value: `Texture: ${snapshot.webglParams.maxTextureSize}, Extensions: ${snapshot.webglParams.extensionCount}`,
      source: 'WebGL getParameter + getSupportedExtensions',
      confidence: 'high',
      whyItMatters: 'The combination of ~90 GPU parameters and extension support creates a near-unique hardware signature.',
    });
  }

  // Speech Voices
  if (typeof snapshot.speech.voiceCount === 'number' && snapshot.speech.voiceCount > 0) {
    cards.push({
      title: 'Speech Voices',
      value: `${snapshot.speech.voiceCount} voices installed`,
      source: 'SpeechSynthesis.getVoices()',
      confidence: 'medium',
      whyItMatters: 'Installed text-to-speech voices vary by OS, locale, and language packs. Rarely blocked by privacy extensions.',
    });
  }

  // CSS Preferences
  cards.push({
    title: 'System Preferences',
    value: `${snapshot.mediaFeatures.prefersColorScheme} theme, ${snapshot.mediaFeatures.colorGamut} gamut, ${snapshot.mediaFeatures.dynamicRange} range`,
    source: 'CSS matchMedia queries',
    confidence: 'medium',
    whyItMatters: 'OS-level display and accessibility preferences are passively readable and contribute to a behavioral fingerprint.',
  });

  // Device Memory
  if (typeof snapshot.device.deviceMemory === 'number') {
    cards.push({
      title: 'Device Memory',
      value: `${snapshot.device.deviceMemory} GB`,
      source: 'navigator.deviceMemory',
      confidence: 'medium',
      whyItMatters: 'Combined with CPU threads, narrows your device to a specific hardware class.',
    });
  }

  // --- Async signals ---

  if (asyncSignals) {
    // Audio Fingerprint
    if (asyncSignals.audio.audioSupported && asyncSignals.audio.audioHash !== 'unavailable') {
      cards.push({
        title: 'Audio Fingerprint',
        value: asyncSignals.audio.audioHash,
        source: 'OfflineAudioContext — DynamicsCompressor output hash',
        confidence: 'high',
        whyItMatters: 'Audio processing produces hardware-specific floating-point rounding patterns. Used alongside canvas for cross-site tracking.',
      });
    }

    // Media Devices
    if (typeof asyncSignals.media.totalDeviceCount === 'number') {
      cards.push({
        title: 'Media Devices',
        value: `${asyncSignals.media.audioInputCount} mic, ${asyncSignals.media.audioOutputCount} speaker, ${asyncSignals.media.videoInputCount} camera`,
        source: 'navigator.mediaDevices.enumerateDevices()',
        confidence: 'medium',
        whyItMatters: 'The number and type of connected audio/video devices is surprisingly unique — even without permission to access them.',
      });
    }

    // WebRTC IP Leak
    if (asyncSignals.webrtc.webrtcSupported && asyncSignals.webrtc.localIPs.length > 0) {
      cards.push({
        title: 'WebRTC IP Leak',
        value: asyncSignals.webrtc.localIPs.join(', '),
        source: 'RTCPeerConnection ICE candidates',
        confidence: 'high',
        whyItMatters: 'Local IP addresses can be discovered without permission via WebRTC, even behind a VPN. This is a well-known privacy leak.',
      });
    }
  }

  return cards;
}

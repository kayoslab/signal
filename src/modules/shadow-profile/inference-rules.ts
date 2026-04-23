import type { SignalSnapshot } from '../../signals/snapshot';
import type { PermissionCheckResult } from '../../permissions/permissions-adapter';
import { createInference, type InferenceStatement } from './inference-schema';

// ---------------------------------------------------------------------------
// Rule Input
// ---------------------------------------------------------------------------

export interface RuleInput {
  snapshot: SignalSnapshot;
  permissions?: PermissionCheckResult[];
}

// ---------------------------------------------------------------------------
// Rule 1: Desktop daytime usage pattern
// ---------------------------------------------------------------------------

export function inferDesktopUsage(snapshot: SignalSnapshot): InferenceStatement | null {
  const { touchSupport } = snapshot.device;
  const hardwareConcurrency = snapshot.device.hardwareConcurrency;
  const screenWidth = snapshot.device.screenWidth;

  if (typeof hardwareConcurrency !== 'number' || typeof screenWidth !== 'number') {
    return null;
  }

  if (hardwareConcurrency < 4 || touchSupport !== false || screenWidth < 1280) {
    return null;
  }

  return createInference({
    statement:
      'This device profile is consistent with a desktop or laptop workstation',
    evidence: [
      { signal: 'hardwareConcurrency', value: String(hardwareConcurrency), source: 'navigator.hardwareConcurrency' },
      { signal: 'touchSupport', value: String(touchSupport), source: 'navigator.maxTouchPoints' },
      { signal: 'screenWidth', value: String(screenWidth), source: 'screen.width' },
    ],
    confidence: 'medium',
  });
}

// ---------------------------------------------------------------------------
// Rule 2: Geographic region inference from timezone
// ---------------------------------------------------------------------------

const TIMEZONE_REGION_MAP: Record<string, string> = {
  'America/New_York': 'eastern North America',
  'America/Chicago': 'central North America',
  'America/Denver': 'western North America',
  'America/Los_Angeles': 'western North America',
  'America/Toronto': 'eastern North America',
  'America/Vancouver': 'western North America',
  'America/Sao_Paulo': 'South America',
  'America/Mexico_City': 'central North America',
  'Europe/London': 'western Europe',
  'Europe/Berlin': 'central Europe',
  'Europe/Paris': 'western Europe',
  'Europe/Madrid': 'western Europe',
  'Europe/Rome': 'southern Europe',
  'Europe/Moscow': 'eastern Europe',
  'Asia/Tokyo': 'eastern Asia',
  'Asia/Shanghai': 'eastern Asia',
  'Asia/Kolkata': 'southern Asia',
  'Asia/Dubai': 'western Asia',
  'Asia/Singapore': 'southeastern Asia',
  'Australia/Sydney': 'Oceania',
  'Pacific/Auckland': 'Oceania',
  'Africa/Cairo': 'northern Africa',
  'Africa/Johannesburg': 'southern Africa',
};

export function inferGeographicRegion(snapshot: SignalSnapshot): InferenceStatement | null {
  const { timezone } = snapshot.locale;
  const region = TIMEZONE_REGION_MAP[timezone];

  if (!region) {
    return null;
  }

  return createInference({
    statement: `Timezone suggests this device is typically used in ${region}`,
    evidence: [
      { signal: 'timezone', value: timezone, source: 'Intl.DateTimeFormat' },
    ],
    confidence: 'medium',
  });
}

// ---------------------------------------------------------------------------
// Rule 3: Privacy-conscious user inference
// ---------------------------------------------------------------------------

export function inferPrivacyConscious(
  snapshot: SignalSnapshot,
  permissions?: PermissionCheckResult[],
): InferenceStatement | null {
  let privacySignalCount = 0;
  const evidence: { signal: string; value: string; source: string }[] = [];

  const { doNotTrack } = snapshot.locale;
  if (doNotTrack === '1') {
    privacySignalCount++;
    evidence.push({ signal: 'doNotTrack', value: doNotTrack, source: 'navigator.doNotTrack' });
  }

  if (permissions && permissions.length > 0) {
    for (const perm of permissions) {
      if (perm.state === 'denied') {
        privacySignalCount++;
        evidence.push({
          signal: `permission:${perm.name}`,
          value: perm.state,
          source: 'Permissions API',
        });
      }
    }
  }

  if (privacySignalCount < 2) {
    return null;
  }

  return createInference({
    statement:
      'Signal pattern is consistent with a privacy-conscious user who actively manages browser settings',
    evidence,
    confidence: 'low',
  });
}

// ---------------------------------------------------------------------------
// Rule 4: High-end hardware profile
// ---------------------------------------------------------------------------

const HIGH_END_GPU_KEYWORDS = ['RTX', 'Pro', 'M1', 'M2', 'M3', 'M4', 'Radeon Pro', 'Quadro'];

export function inferHighEndHardware(snapshot: SignalSnapshot): InferenceStatement | null {
  const hardwareConcurrency = snapshot.device.hardwareConcurrency;
  const devicePixelRatio = snapshot.device.devicePixelRatio;
  const { renderer } = snapshot.rendering;

  if (typeof hardwareConcurrency !== 'number' || typeof devicePixelRatio !== 'number') {
    return null;
  }

  if (hardwareConcurrency < 8 || devicePixelRatio < 2) {
    return null;
  }

  const hasHighEndGpu = HIGH_END_GPU_KEYWORDS.some((keyword) =>
    renderer.includes(keyword),
  );

  if (!hasHighEndGpu) {
    return null;
  }

  return createInference({
    statement:
      'Hardware profile suggests a high-performance or professional-grade device',
    evidence: [
      { signal: 'hardwareConcurrency', value: String(hardwareConcurrency), source: 'navigator.hardwareConcurrency' },
      { signal: 'devicePixelRatio', value: String(devicePixelRatio), source: 'window.devicePixelRatio' },
      { signal: 'renderer', value: renderer, source: 'WebGL RENDERER parameter' },
    ],
    confidence: 'low',
  });
}

// ---------------------------------------------------------------------------
// Rule 5: Multilingual user inference
// ---------------------------------------------------------------------------

export function inferMultilingualUser(snapshot: SignalSnapshot): InferenceStatement | null {
  const { languages } = snapshot.locale;

  if (!languages || languages.length < 2) {
    return null;
  }

  return createInference({
    statement:
      'Browser language configuration suggests a multilingual user or someone operating in a multilingual environment',
    evidence: [
      { signal: 'languages', value: languages.join(', '), source: 'navigator.languages' },
    ],
    confidence: 'low',
  });
}

// ---------------------------------------------------------------------------
// Aggregate: apply all inference rules
// ---------------------------------------------------------------------------

export function applyInferenceRules(input: RuleInput): InferenceStatement[] {
  const { snapshot, permissions } = input;

  const results: (InferenceStatement | null)[] = [
    inferDesktopUsage(snapshot),
    inferGeographicRegion(snapshot),
    inferPrivacyConscious(snapshot, permissions),
    inferHighEndHardware(snapshot),
    inferMultilingualUser(snapshot),
  ];

  return results.filter((r): r is InferenceStatement => r !== null);
}

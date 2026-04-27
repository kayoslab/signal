import type { HardeningInput, HardeningRecommendation } from './hardening-schema';
import { createRecommendation } from './hardening-schema';

const HIGH_RISK_PERMISSIONS = ['camera', 'microphone', 'geolocation'] as const;
const NOTIFICATION_PERMISSIONS = ['notifications', 'push'] as const;
const ENTROPY_THRESHOLD = 70;
const DEBT_THRESHOLD = 40;
const INFERENCE_COUNT_THRESHOLD = 2;
const STORAGE_ENTROPY_THRESHOLD = 30;

function evaluateRevokeHighRiskPermissions(
  input: HardeningInput,
): HardeningRecommendation | null {
  const granted = input.permissions.filter(
    (p) =>
      HIGH_RISK_PERMISSIONS.includes(p.name as (typeof HIGH_RISK_PERMISSIONS)[number]) &&
      p.state === 'granted',
  );

  if (granted.length === 0) return null;

  const names = granted.map((p) => p.name);

  return createRecommendation({
    id: 'revoke-high-risk-permissions',
    title: 'Revoke unused high-risk permissions',
    description:
      'Your browser has granted access to sensitive capabilities such as ' +
      names.join(', ') +
      '. Sites may be able to use these without further prompts.',
    actionSteps: [
      'Open your browser privacy or site settings',
      'Review which sites have access to ' + names.join(', '),
      'Remove access for sites you no longer use or trust',
    ],
    expectedOutcome:
      'Reduces the number of sites that can silently access sensitive device features.',
    relatedFindings: names,
    source: 'permissions-audit',
    difficulty: 'Easy',
  });
}

function evaluateEnableDoNotTrack(
  input: HardeningInput,
): HardeningRecommendation | null {
  const dnt = input.snapshot.locale.doNotTrack;
  if (dnt === 'Enabled' || dnt === 'Enabled (GPC)') return null;

  return createRecommendation({
    id: 'enable-do-not-track',
    title: 'Enable Do Not Track',
    description:
      'Your browser is not sending the Do Not Track signal. While not all sites honor it, enabling it signals your privacy preference.',
    actionSteps: [
      'Open your browser privacy settings',
      'Enable the "Send Do Not Track request" option',
    ],
    expectedOutcome:
      'Signals your preference to opt out of tracking to sites that respect the header.',
    relatedFindings: ['doNotTrack'],
    source: 'locale-signals',
    difficulty: 'Easy',
  });
}

function evaluateReduceFingerprintSurface(
  input: HardeningInput,
): HardeningRecommendation | null {
  if (input.entropy.score < ENTROPY_THRESHOLD) return null;

  return createRecommendation({
    id: 'reduce-fingerprint-surface',
    title: 'Reduce fingerprint surface',
    description:
      'Your browser configuration produces a high entropy score, making your device more distinguishable across sites.',
    actionSteps: [
      'Consider using a privacy-focused browser with built-in fingerprint resistance',
      'Disable WebGL if not needed for your daily browsing',
      'Limit the number of installed browser extensions and fonts',
    ],
    expectedOutcome:
      'Lowers your browser fingerprint uniqueness, making it harder to track you across sites.',
    relatedFindings: ['entropy'],
    source: 'entropy-analysis',
    difficulty: 'Medium',
  });
}

function evaluateReviewNotificationPermissions(
  input: HardeningInput,
): HardeningRecommendation | null {
  const granted = input.permissions.filter(
    (p) =>
      NOTIFICATION_PERMISSIONS.includes(
        p.name as (typeof NOTIFICATION_PERMISSIONS)[number],
      ) && p.state === 'granted',
  );

  if (granted.length === 0) return null;

  const names = granted.map((p) => p.name);

  return createRecommendation({
    id: 'review-notification-permissions',
    title: 'Review notification permissions',
    description:
      'You have granted ' +
      names.join(' and ') +
      ' permissions. Unwanted notifications can be used for phishing or distraction.',
    actionSteps: [
      'Open your browser notification settings',
      'Audit which sites have notification or push access',
      'Block notifications from sites you do not recognize',
    ],
    expectedOutcome:
      'Reduces exposure to unwanted or misleading notification prompts.',
    relatedFindings: names,
    source: 'permissions-audit',
    difficulty: 'Easy',
  });
}

function evaluateIsolateBrowsingProfiles(
  input: HardeningInput,
): HardeningRecommendation | null {
  const significantInferences = input.inferences.filter(
    (i) => i.confidence === 'medium' || i.confidence === 'high',
  );

  if (significantInferences.length < INFERENCE_COUNT_THRESHOLD) return null;

  return createRecommendation({
    id: 'isolate-browsing-profiles',
    title: 'Isolate browsing profiles',
    description:
      'Multiple inferences can be drawn from your current browser session, suggesting advertisers or data brokers could build a profile.',
    actionSteps: [
      'Use separate browser profiles for work and personal browsing',
      'Consider using container tabs or multi-account containers',
      'Use a different browser for sensitive activities',
    ],
    expectedOutcome:
      'Makes it harder for third parties to correlate your activity across different contexts.',
    relatedFindings: ['inferences'],
    source: 'inference-analysis',
    difficulty: 'Medium',
  });
}

function evaluateClearPersistentStorage(
  input: HardeningInput,
): HardeningRecommendation | null {
  const persistentStoragePerm = input.permissions.find(
    (p) => p.name === 'persistent-storage',
  );

  if (persistentStoragePerm?.state === 'granted') {
    return createRecommendation({
      id: 'clear-persistent-storage',
      title: 'Clear persistent storage',
      description:
        'Persistent storage permission is granted, allowing sites to store data that survives normal cleanup.',
      actionSteps: [
        'Open your browser storage or site data settings',
        'Review which sites have persistent storage access',
        'Periodically clear localStorage and IndexedDB data',
      ],
      expectedOutcome:
        'Limits long-term data retention by sites, reducing tracking potential.',
      relatedFindings: ['persistent-storage'],
      source: 'permissions-audit',
      difficulty: 'Easy',
    });
  }

  const storage = input.snapshot.device.storageSupport;
  const allSupported =
    storage.localStorage === true &&
    storage.sessionStorage === true &&
    storage.indexedDB === true;

  if (allSupported && input.entropy.score >= STORAGE_ENTROPY_THRESHOLD) {
    return createRecommendation({
      id: 'clear-persistent-storage',
      title: 'Clear persistent storage',
      description:
        'Your browser supports all major storage mechanisms. Sites can use these to persist tracking data locally.',
      actionSteps: [
        'Periodically clear localStorage and IndexedDB data',
        'Configure your browser to clear site data on exit',
        'Review stored data in your browser developer tools',
      ],
      expectedOutcome:
        'Limits long-term data retention by sites, reducing tracking potential.',
      relatedFindings: ['storage'],
      source: 'storage-analysis',
      difficulty: 'Easy',
    });
  }

  return null;
}

function evaluateAuditPermissionDebt(
  input: HardeningInput,
): HardeningRecommendation | null {
  if (input.permissionDebt.score < DEBT_THRESHOLD) return null;

  return createRecommendation({
    id: 'audit-permission-debt',
    title: 'Audit permission debt',
    description:
      'Your permission debt score indicates a significant number of granted permissions that may no longer be necessary.',
    actionSteps: [
      'Review all granted browser permissions in your settings',
      'Identify permissions that were granted to sites you no longer visit',
      'Revoke unnecessary permissions to reduce your exposure',
    ],
    expectedOutcome:
      'Reduces accumulated permission grants, lowering overall exposure to potential misuse.',
    relatedFindings: ['permissionDebt'],
    source: 'permission-debt-analysis',
    difficulty: 'Medium',
  });
}

export function evaluateHardeningRules(
  input: HardeningInput,
): HardeningRecommendation[] {
  const rules = [
    evaluateRevokeHighRiskPermissions,
    evaluateEnableDoNotTrack,
    evaluateReduceFingerprintSurface,
    evaluateReviewNotificationPermissions,
    evaluateIsolateBrowsingProfiles,
    evaluateClearPersistentStorage,
    evaluateAuditPermissionDebt,
  ];

  const recommendations: HardeningRecommendation[] = [];

  for (const rule of rules) {
    const result = rule(input);
    if (result !== null) {
      recommendations.push(result);
    }
  }

  return recommendations;
}

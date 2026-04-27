import type { EntropyResult } from './entropy-score';

export interface PrivacyPostureResult {
  entropyLabel: 'Low' | 'Moderate' | 'High';
  uniquenessEstimate: string;
  privacyPosture: string;
}

const LOW_THRESHOLD = 25;
const MODERATE_THRESHOLD = 45;
const HIGH_THRESHOLD = 65;

export function computePrivacyPosture(entropy: EntropyResult): PrivacyPostureResult {
  if (entropy.score <= LOW_THRESHOLD) {
    return {
      entropyLabel: 'Low',
      uniquenessEstimate: '~1 in 50 browsers share this profile',
      privacyPosture: 'Common Profile — Few signals distinguish you',
    };
  }

  if (entropy.score <= MODERATE_THRESHOLD) {
    return {
      entropyLabel: 'Moderate',
      uniquenessEstimate: '~1 in 1,500 browsers share this profile',
      privacyPosture: 'Moderately Unique — Some signals stand out',
    };
  }

  if (entropy.score <= HIGH_THRESHOLD) {
    return {
      entropyLabel: 'High',
      uniquenessEstimate: '~1 in 15,000 browsers share this profile',
      privacyPosture: 'Highly Unique — Multiple signals distinguish you',
    };
  }

  return {
    entropyLabel: 'High',
    uniquenessEstimate: '~1 in 50,000 browsers share this profile',
    privacyPosture: 'Very Highly Unique — Strong fingerprint surface',
  };
}

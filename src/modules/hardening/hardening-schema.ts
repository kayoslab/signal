import type { SignalSnapshot } from '../../signals/snapshot';
import type { PermissionCheckResult } from '../../permissions/permissions-adapter';
import type { EntropyResult } from '../../scoring/entropy-score';
import type { PermissionDebtResult } from '../../scoring/permission-debt-score';
import type { InferenceStatement } from '../shadow-profile/inference-schema';
import type { ThreatFinding } from '../threat-model/threat-schema';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface HardeningRecommendation {
  id: string;
  title: string;
  description: string;
  actionSteps: string[];
  expectedOutcome: string;
  relatedFindings: string[];
  source: string;
  difficulty: Difficulty;
}

export interface HardeningInput {
  snapshot: SignalSnapshot;
  permissions: PermissionCheckResult[];
  entropy: EntropyResult;
  permissionDebt: PermissionDebtResult;
  inferences: InferenceStatement[];
  threats: ThreatFinding[];
}

export function createRecommendation(
  fields: HardeningRecommendation,
): HardeningRecommendation {
  return { ...fields };
}

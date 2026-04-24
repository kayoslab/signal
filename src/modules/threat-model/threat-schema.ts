import type { SignalSnapshot } from '../../signals/snapshot';
import type { PermissionCheckResult } from '../../permissions/permissions-adapter';
import type { EntropyResult } from '../../scoring/entropy-score';
import type { PermissionDebtResult } from '../../scoring/permission-debt-score';
import type { InferenceStatement } from '../shadow-profile/inference-schema';

export type ThreatCategory =
  | 'identity-exposure'
  | 'social-engineering'
  | 'permission-abuse'
  | 'shoulder-surfing';

export type Severity = 'Low' | 'Medium' | 'High';

export interface ThreatFinding {
  ruleId: string;
  title: string;
  severity: Severity;
  description: string;
  evidence: string[];
  userImpact: string;
  category: ThreatCategory;
}

export interface ThreatInput {
  snapshot: SignalSnapshot;
  permissions: PermissionCheckResult[];
  entropy: EntropyResult;
  permissionDebt: PermissionDebtResult;
  inferences: InferenceStatement[];
}

export interface ThreatRule {
  id: string;
  title: string;
  category: ThreatCategory;
  explanation: string;
  evaluate: (input: ThreatInput) => ThreatFinding | null;
}

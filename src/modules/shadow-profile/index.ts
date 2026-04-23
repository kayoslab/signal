export {
  INFERENCE_MARKER,
  createInference,
  isValidInference,
  type ConfidenceLabel,
  type EvidenceEntry,
  type InferenceStatement,
} from './inference-schema';

export {
  inferDesktopUsage,
  inferGeographicRegion,
  inferPrivacyConscious,
  inferHighEndHardware,
  inferMultilingualUser,
  applyInferenceRules,
  type RuleInput,
} from './inference-rules';

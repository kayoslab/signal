import type { ThreatRule, ThreatInput, ThreatFinding } from './threat-schema';

const HIGH_RISK_PERMISSIONS = ['camera', 'microphone', 'geolocation'];

const identityExposureRule: ThreatRule = {
  id: 'identity-exposure',
  title: 'Device Fingerprint Uniqueness',
  category: 'identity-exposure',
  explanation:
    'This rule evaluates how distinguishable your browser fingerprint is. ' +
    'An entropy score >= 70 indicates moderate uniqueness (Medium severity), ' +
    'while >= 85 indicates high uniqueness (High severity). ' +
    'High uniqueness means your device can likely be re-identified across websites without cookies.',
  evaluate(input: ThreatInput): ThreatFinding | null {
    const { score, breakdown } = input.entropy;
    if (score < 70) return null;

    const topContributors = breakdown
      .filter((e) => e.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5)
      .map((e) => `${e.signal}: ${e.value} (contribution: ${e.contribution})`);

    return {
      ruleId: this.id,
      title: this.title,
      severity: score >= 85 ? 'High' : 'Medium',
      category: this.category,
      description:
        'Your browser exposes a combination of signals that may allow websites to re-identify your device across visits without relying on cookies.',
      evidence: topContributors.length > 0 ? topContributors : [`Entropy score: ${score}`],
      userImpact:
        'Third parties could correlate your browsing activity across different sites using your device fingerprint.',
    };
  },
};

const socialEngineeringRule: ThreatRule = {
  id: 'social-engineering',
  title: 'Profile Data Exposure',
  category: 'social-engineering',
  explanation:
    'This rule checks whether enough medium or high confidence inferences can be drawn from browser signals ' +
    'to build a targeted social engineering profile. >= 2 qualifying inferences triggers Low severity, ' +
    '>= 3 triggers Medium severity. Low-confidence inferences are excluded.',
  evaluate(input: ThreatInput): ThreatFinding | null {
    const qualifying = input.inferences.filter(
      (inf) => inf.confidence === 'medium' || inf.confidence === 'high',
    );

    if (qualifying.length < 2) return null;

    return {
      ruleId: this.id,
      title: this.title,
      severity: qualifying.length >= 3 ? 'Medium' : 'Low',
      category: this.category,
      description:
        'Multiple inferences about your location, language, and device type can be combined to craft targeted communications that appear personally relevant.',
      evidence: qualifying.map((inf) => `${inf.statement} (confidence: ${inf.confidence})`),
      userImpact:
        'An attacker with access to these signals could craft more convincing phishing or pretexting attempts tailored to your profile.',
    };
  },
};

const permissionAbuseRule: ThreatRule = {
  id: 'permission-abuse',
  title: 'Granted Permission Risk',
  category: 'permission-abuse',
  explanation:
    'This rule checks for granted high-risk browser permissions (camera, microphone, geolocation) ' +
    'and overall permission debt score. Camera + microphone both granted yields High severity, ' +
    'any single high-risk permission granted yields Medium, and debt >= 40 without critical permissions yields Low.',
  evaluate(input: ThreatInput): ThreatFinding | null {
    const grantedHighRisk = input.permissions.filter(
      (p) => p.state === 'granted' && HIGH_RISK_PERMISSIONS.includes(p.name),
    );

    const cameraGranted = grantedHighRisk.some((p) => p.name === 'camera');
    const micGranted = grantedHighRisk.some((p) => p.name === 'microphone');
    const debtScore = input.permissionDebt.score;

    if (grantedHighRisk.length === 0 && debtScore < 40) return null;

    let severity: 'Low' | 'Medium' | 'High';
    if (cameraGranted && micGranted) {
      severity = 'High';
    } else if (grantedHighRisk.length > 0) {
      severity = 'Medium';
    } else {
      severity = 'Low';
    }

    const evidence =
      grantedHighRisk.length > 0
        ? grantedHighRisk.map((p) => `${p.name}: granted`)
        : [`Permission debt score: ${debtScore}`];

    return {
      ruleId: this.id,
      title: this.title,
      severity,
      category: this.category,
      description:
        'Granted browser permissions persist across visits and could be exploited by compromised or malicious scripts on sites you visit.',
      evidence,
      userImpact:
        'A compromised website could access granted permissions to capture media or location data without additional prompts.',
    };
  },
};

const shoulderSurfingRule: ThreatRule = {
  id: 'shoulder-surfing',
  title: 'Visual Eavesdropping Exposure',
  category: 'shoulder-surfing',
  explanation:
    'This rule identifies desktop office-like environments where visual eavesdropping is more likely. ' +
    'It triggers when screen width >= 1920px, device pixel ratio <= 1 (standard-DPI external monitor), ' +
    'and touch is not supported. Severity is always Low as this is a physical proximity risk.',
  evaluate(input: ThreatInput): ThreatFinding | null {
    const { device } = input.snapshot;
    const screenWidth = typeof device.screenWidth === 'number' ? device.screenWidth : NaN;
    const dpr = typeof device.devicePixelRatio === 'number' ? device.devicePixelRatio : NaN;
    const touch = typeof device.touchSupport === 'boolean' ? device.touchSupport : true;

    if (isNaN(screenWidth) || screenWidth < 1920) return null;
    if (isNaN(dpr) || dpr > 1) return null;
    if (touch) return null;

    return {
      ruleId: this.id,
      title: this.title,
      severity: 'Low',
      category: this.category,
      description:
        'A large, standard-DPI screen without touch input suggests a desktop or office monitor setup where on-screen content may be visible to nearby individuals.',
      evidence: [
        `Screen width: ${screenWidth}px`,
        `Device pixel ratio: ${dpr}`,
        `Touch support: ${touch}`,
      ],
      userImpact:
        'Sensitive information displayed on screen may be observable by others in shared or open workspace environments.',
    };
  },
};

const rules: ThreatRule[] = [
  identityExposureRule,
  socialEngineeringRule,
  permissionAbuseRule,
  shoulderSurfingRule,
];

export function evaluateThreatRules(input: ThreatInput): ThreatFinding[] {
  const findings: ThreatFinding[] = [];
  for (const rule of rules) {
    const finding = rule.evaluate(input);
    if (finding) {
      findings.push(finding);
    }
  }
  return findings;
}

export function getRuleExplanations(): Record<string, string> {
  const explanations: Record<string, string> = {};
  for (const rule of rules) {
    explanations[rule.id] = rule.explanation;
  }
  return explanations;
}

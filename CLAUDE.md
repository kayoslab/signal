# Signal Intelligence Project Context

## Project Purpose

Signal Intelligence is a browser-based self-audit that reveals what a device and browser expose before a user logs into any website.

The product should communicate one core idea:

Before clicking anything, your browser is already broadcasting signals.

This is not a novelty project. It must feel credible, privacy-conscious, precise, and professionally designed.

The application analyzes locally available browser signals and presents them through a receipt-centered intelligence dashboard.

## Experience Goals

Users should immediately understand:

1. What their browser reveals passively
2. What permissions they have accumulated
3. What inferences third parties may make
4. What realistic risks those signals create
5. What practical actions they can take

## Non-Negotiable Trust Rules

- No cookies
- No analytics
- No tracking pixels
- No backend profile creation
- No mandatory localStorage
- No external data exfiltration
- All analysis runs locally in browser

If any feature violates this, reject the feature.

## Visual Direction

Avoid hacker clichés.

Use:

- White backgrounds or dark graphite surfaces
- Muted green accents
- Crisp typography
- Clean spacing
- Financial-report precision
- Security operations center clarity

Think:

Stripe + threat intelligence lab.

## Tech Stack

- Language: TypeScript
- Build Tool: Vite
- UI: Vanilla TypeScript + lightweight component structure
- Styling: CSS Modules or scoped CSS
- Testing: Vitest
- Browser E2E: Playwright
- Deployment: Static hosting

## Repository Structure

- src/app/ application bootstrap
- src/layout/ responsive shell and page composition
- src/signals/ browser signal collection
- src/permissions/ permissions API adapters
- src/scoring/ heuristics and risk scoring
- src/modules/ dashboard panels
- src/ui/ shared components
- src/styles/ tokens and global styles
- tests/ unit and browser tests
- public/ static assets

## Required Modules

### 1. Intro Sequence

Animated opening message showing signal count and privacy promise.

### 2. Fingerprint Receipt

Central report showing:

- timezone
- languages
- platform
- renderer
- storage support
- touch support
- CPU threads
- do not track
- entropy score
- uniqueness estimate
- privacy posture

Actions:

- Copy
- Share Image
- Re-run Audit

### 3. Zero Click OSINT

Cards showing what can be known passively.

Each card must contain:

- finding
- source
- confidence
- why it matters

### 4. Permission Debt

Audit granted, denied, prompt and unsupported permissions.

Return debt score.

### 5. Shadow Profile

Inference engine showing what advertisers or brokers may assume.

Every statement must be explicitly labeled:

[Inference]

No certainty language.

### 6. Threat Model: You

Translate findings into user-relevant risks.

Use Low / Medium / High severity badges.

### 7. Hardening Actions

Specific, practical recommendations based on findings.

## Coding Rules

- Prefer small pure functions
- Separate data collection from rendering
- All heuristics must be explainable
- Never mix DOM logic into scoring modules
- Use feature detection before browser API access
- Gracefully handle unsupported APIs
- Avoid large frameworks unless justified
- Keep bundle lightweight

## Testing Requirements

Run before completion of any ticket:

- npm run lint
- npm run typecheck
- npm run test

Before release:

- Playwright smoke test
- Mobile viewport check
- Desktop viewport check
- No console errors

## Accessibility Requirements

- Keyboard accessible
- Focus states visible
- Sufficient contrast
- Reduced motion support
- Semantic headings and landmarks

## Content Rules

- Never exaggerate risk
- Never claim certainty where inference is used
- Avoid fear language
- Explain simply
- Use concise executive-grade wording

## Constraints Agents Must Respect

- This must feel like a trustworthy security product
- Performance should be fast on first load
- All data should remain client-side
- No dark patterns
- No gimmicky animations
- No fake hacking visuals
- Any architecture change must update this file
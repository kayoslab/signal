# Signal Intelligence

A browser-based self-audit that reveals what your device and browser expose before you log into any website.

Before clicking anything, your browser is already broadcasting signals.

## What It Does

Signal Intelligence analyzes locally available browser signals and presents them through a receipt-centered intelligence dashboard. Users immediately understand:

1. **What their browser reveals passively** — timezone, languages, platform, GPU renderer, screen properties, and more
2. **What permissions they have accumulated** — a debt score quantifying granted API access
3. **What inferences third parties may make** — a shadow profile showing what advertisers or data brokers could assume
4. **What realistic risks those signals create** — a personal threat model with severity ratings
5. **What practical actions they can take** — hardening recommendations ranked by difficulty

Every analysis runs entirely in the browser. Nothing is stored. Nothing is sent anywhere.

## Privacy

- No cookies
- No analytics
- No tracking pixels
- No backend profile creation
- No mandatory localStorage
- No external data exfiltration
- All analysis runs locally in the browser

## Dashboard Modules

### Intro Sequence

An animated opening that counts the number of signals your browser is broadcasting before you interact with anything.

### Fingerprint Receipt

A receipt-style report listing raw browser signals: timezone, languages, platform, GPU renderer, storage support, touch capability, CPU threads, Do Not Track status, entropy score, uniqueness estimate, and privacy posture. Supports copy, share, and re-run.

### Zero-Click OSINT

Cards showing what can be known about you passively, without any interaction. Each card includes the finding, its source API, a confidence level, and why it matters.

### Permission Debt

Audits granted, denied, prompt, and unsupported browser permissions (notifications, camera, microphone, clipboard, geolocation). Returns a weighted debt score reflecting accumulated risk surface from granted permissions.

### Shadow Profile

An inference engine showing what advertisers or data brokers might assume based on your signals. Every statement is explicitly labeled as an inference — no certainty language is used.

### Threat Model: You

Translates findings into user-relevant risks with Low, Medium, and High severity badges. Combines entropy scoring, permission debt, and shadow profile inferences to evaluate identity exposure, social engineering, permission abuse, and shoulder-surfing risks.

### Hardening Actions

Specific, practical recommendations based on findings. Each recommendation includes a difficulty level (Easy, Medium, Hard), step-by-step instructions, and expected outcomes.

## Tech Stack

- **Language**: TypeScript
- **Build**: Vite
- **UI**: Vanilla TypeScript + lightweight component structure
- **Styling**: CSS with design tokens
- **Testing**: Vitest + Playwright
- **Deployment**: Static hosting

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

### Lint & Typecheck

```bash
npm run lint
npm run typecheck
```

## License

All rights reserved.

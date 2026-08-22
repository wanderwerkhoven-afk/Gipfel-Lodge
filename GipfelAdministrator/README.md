# GipfelAdministrator

New multi-tenant holiday-rental administration SaaS, isolated from the legacy Gipfel Lodge website. The local build uses only synthetic fixtures and Firebase project `demo-gipfel-saas`.

## Local start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. The app contains responsive modules for dashboard, calendar, reservations, guests, payments, operations, communication, rates, website content, reports, settings and the internal design system.

## Verification

```bash
npm test
npm run test:e2e
npm run build
npm run verify:all
```

`test:e2e` prepares a packaged local Chromium binary and runs desktop/mobile Playwright plus Axe. `test:rules` requires the official Firestore emulator JAR; Firebase CLI downloads it on first use. No command deploys cloud resources.

## Safety status

- No production Firebase project or deployment.
- No real guests, reservations, email, payment or integration credentials.
- Smoobu is a non-active `planned` provider placeholder.
- Existing Gipfel Lodge reservations have not been migrated.
- Read [PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) before any future staging work.

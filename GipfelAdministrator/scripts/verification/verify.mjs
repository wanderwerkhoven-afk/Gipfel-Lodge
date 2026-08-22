import { existsSync, readFileSync } from 'node:fs';
const phase = process.argv[2] ?? 'all';
const groups = {
  phase0: ['package.json', '.env.example', '.firebaserc', 'firebase.json', 'docs/PRODUCT_VISION.md', 'docs/TARGET_ARCHITECTURE.md', 'docs/MULTI_TENANT_DATA_MODEL.md', 'docs/SECURITY_MODEL.md', 'docs/IMPLEMENTATION_ROADMAP.md', 'docs/DESIGN_SYSTEM.md'],
  phase1: ['apps/admin/src/App.tsx', 'apps/admin/src/styles.css'],
  phase2: ['firebase/firestore.rules', 'firebase/storage.rules', 'packages/types/src/index.ts', 'packages/repositories/src/index.ts'],
  phase3: ['packages/domain/src/index.ts', 'functions/src/index.ts'],
  phase9: ['packages/integrations/src/index.ts'],
  final: ['docs/FINAL_ARCHITECTURE.md', 'docs/FINAL_SECURITY_REVIEW.md', 'docs/FINAL_TEST_EVIDENCE.md', 'docs/PRODUCTION_READINESS.md']
};
const order = ['phase0', 'phase1', 'phase2', 'phase3', 'phase9'];
const requestedIndex = phase === 'all' ? order.length - 1 : phase === 'phase3b' ? 2 : Number.parseInt(phase.replace(/\D/g, ''), 10);
const required = [...groups.phase0];
if (requestedIndex >= 1) required.push(...groups.phase1);
if (requestedIndex >= 2) required.push(...groups.phase2);
if (requestedIndex >= 3) required.push(...groups.phase3);
if (requestedIndex >= 9 || phase === 'all') required.push(...groups.phase9);
if (phase === 'all') required.push(...groups.final);
const missing = required.filter(path => !existsSync(new URL(`../../${path}`, import.meta.url)));
if (missing.length) { console.error('Ontbrekende bestanden:', missing.join(', ')); process.exit(1); }
const env = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
if (!env.includes('demo-gipfel-saas') || !env.includes('EMULATOR')) { console.error('Onveilige emulatorconfiguratie'); process.exit(1); }
const allText = required.filter(path => existsSync(new URL(`../../${path}`, import.meta.url))).map(path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')).join('\n');
if (/AIza[0-9A-Za-z_-]{20,}|BEGIN (RSA |EC )?PRIVATE KEY/.test(allText)) { console.error('Mogelijk secret gevonden'); process.exit(1); }
console.log(`verify:${phase} OK — structuur, demo-safety en secretscan geslaagd.`);

# Gipfel Lodge — agent review (15 October 2026)

Status: **source inspection completed; automated build/browser checks not executed in this review**. The eight roles are coordinated review perspectives, not eight separately running autonomous processes.

## Findings by agent

| Agent | Finding | Priority | Next step |
| --- | --- | --- | --- |
| Styling | Shared layout and per-page templates exist; responsive and token consistency still require a browser-based visual comparison | Medium | Audit all five pages at mobile/tablet/desktop widths |
| Animations & JS | MPA adapter initializes page components and routes; end-to-end behavior of menus, galleries, scroll effects and booking has not been browser-verified | High | Run route and interaction smoke tests |
| Architecture | `src/layout.html` and `src/pages/` are canonical for MPA, while SiteGround export still reads legacy `index.html` | High | Migrate exporter with PHP parity tests before removing legacy content |
| Code cleanup | Dual SPA/MPA entrypoints remain by design; removing either now risks breaking the exporter | Medium | Refactor only after parity tests |
| Documentation | `README.md`, `AGENTS.md` and migration guide exist; this report records outstanding validation | Low | Keep migration status current |
| Content | MPA builder writes locale-dependent titles, descriptions and navigation; full translated HTML, canonical/hreflang and metadata require crawl validation | Medium | Audit 4 domains × 5 pages |
| Policy | `firestore.rules` defines `isAdmin()` as existence of a user record, not an explicit role. `metadata/counters` and `system_checks` allow public writes | **Critical review** | Determine actual intended dashboard roles and client write flows; introduce least-privilege rules with emulator tests |
| CRM build | SiteGround admin export fetches `index.html` and booking module writes to Firestore; moving/removing legacy source is unsafe until tested | High | Validate booking and export against test fixtures |

## Security review: do not deploy an untested rules change

Current `firestore.rules` checks for the existence of `users/{uid}` in `isAdmin()`. Any authenticated account with such a document may receive the privileges guarded by `isAdmin()`, including reading bookings and modifying settings. Confirm who can create user records, whether all accounts are trusted operators, and the intended roles before replacing this function. The rules also allow unauthenticated writes to `metadata/counters` and `system_checks`. Investigate whether any public booking or health-check flows rely on them; then add emulator tests for anonymous, normal user and authorized admin behavior. This review did not modify deployed Firestore rules.

## Release gates

1. `node --test tests/multipage-structure.test.mjs`
2. `MPA_PREVIEW=1 npm run build:mpa`
3. Check every generated route and linked CSS/JS/image path on GitHub Pages.
4. Test menu, mobile menu, galleries, animations, keyboard controls and reduced-motion.
5. Test NL/DE/EN copy, canonical/hreflang and correct country-specific booking routes.
6. Test booking create, availability, admin login/roles and SiteGround PHP ZIP in a safe test environment.
7. Record GitHub Actions run status and rollback SHA before production deployment.

## Safety decision

No production Firebase rules or SiteGround exporter behavior was changed in this review. Do not describe the MPA as production-validated until the above checks pass.

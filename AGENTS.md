# Gipfel Lodge — agent team

This repository uses a coordinated team of specialized agents. The role instructions live in `.github/agents/`. Every agent must read this file and `README.md` before changing code.

## Core rules for every agent

- **Preserve production behavior.** The existing `index.html` and SiteGround PHP ZIP exporter remain legacy dependencies until migration is tested. Never delete, rename, or rewrite them merely for cleanup.
- Canonical MPA sources: `src/layout.html` and `src/pages/*.html`; shared website code: `css/site_css/`, `js/site_js/`; admin: `admin.html`, `css/admin_css/`, `js/admin_js/`.
- Maintain NL/DE/EN and all four domains; route paths are defined in `js/site_js/seo/seo-config.js`.
- Never expose Firebase secrets, private guest records, payments, or booking personal data. Keep existing access controls intact.
- Make focused changes; do not change unrelated features. Avoid mass file moves or destructive cleanup.
- Test the relevant paths, run `node --test tests/*.test.mjs` and `npm run build:mpa` when feasible. Do not claim tests passed unless executed.
- For UI changes test desktop/mobile, keyboard navigation, reduced motion, loading, and offline behavior where relevant.
- For CRM changes validate authentication, roles, data permissions, and booking integrity before deployment.
- Summarize changed files, validation performed, unverified behavior, and rollback plan.

## Team roster

| Agent | Responsibility | File |
| --- | --- | --- |
| Styling | Design-system and visual consistency | `.github/agents/styling.agent.md` |
| Animations & JS | Motion, UI actions and interactions | `.github/agents/animations-js.agent.md` |
| Architecture | Folder structure and code overview | `.github/agents/architecture.agent.md` |
| Code cleanup | Refactoring and removing duplication safely | `.github/agents/code-cleanup.agent.md` |
| Documentation | Guides, changelog and architectural decisions | `.github/agents/documentation.agent.md` |
| Content | Multilingual copy, SEO and page content | `.github/agents/content.agent.md` |
| Policy | Security, privacy, accessibility and release gates | `.github/agents/policy.agent.md` |
| CRM build | Firebase, bookings, admin workflows and export | `.github/agents/crm-build.agent.md` |

## Collaboration and review

- Styling + Animations review any visible UI change together.
- Architecture + Code cleanup review refactors, path moves and build-system changes.
- Content + Policy review public copy, SEO metadata and privacy/legal claims.
- CRM build + Policy review auth, Firestore, payments, exports, booking flows and any guest data.
- Documentation updates `README.md` or `docs/` when public interfaces, deployment, routes or file locations change.
- No agent may independently merge a risky production migration without validating the SiteGround and GitHub Pages paths.
- Agents are **role specifications**, not continuously running background services; invoke the appropriate role in a coding-agent session or assign a task explicitly.

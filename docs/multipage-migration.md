# Gipfel Lodge multipage migration (staging only)

This branch adds a first isolated MPA build without changing the deployed SPA or the SiteGround PHP exporter.

Run `npm install` then `npm run build:mpa`. The output is `dist/mpa/` with real `index.html`, `lodge/index.html`, `activiteiten/index.html`, `genieten/index.html` and `booking/index.html`, plus shared assets. Each document contains only its own main page content.

**Not production ready.** The generated HTML currently uses the GitHub Pages base path `/Gipfel-Lodge/`. It has not been browser tested. The SiteGround PHP language handling, localized route variants, dynamic CMS gallery data, booking flows, and maintenance mode must be validated and integrated before switching production or preview. The generator uses the default Dutch paths as an initial prototype.

Acceptance checks before rollout:
- Build and inspect all five documents, assets, internal links, navigation, and direct refresh.
- Test all three languages and their per-domain URLs; generate localized pages.
- Confirm maintenance and booking CRM controls and fail-safe behavior.
- Check Firebase images/translations and static PHP export consistency.
- Run mobile browser checks, Core Web Vitals, canonical/hreflang and sitemap validation.
- Switch GitHub Pages publishing only after the preview MPA passes all checks.

## Follow-up implementation

- Build validates exactly one matching `main.page`, the navigation adapter and locally referenced scripts/stylesheets for every generated page.
- MPA navigation adapter now knows Dutch, German and English path names, but localized documents are **not yet generated**.
- This remains a draft migration: GitHub Pages must not be pointed to `dist/mpa` until direct route refresh, CMS maintenance, language variants and export are tested end-to-end.

## Domain-specific output (current branch)

The generator now creates 20 page documents under `dist/mpa/gipfellodge.nl/`, `dist/mpa/gipfellodge.at/`, `dist/mpa/gipfellodge.de/`, and `dist/mpa/gipfellodge.eu/`. Each folder is intended as an independent document root, with its own shared assets and SEO metadata from `seo-config.js`.

**Important unresolved limitations:** HTML body translations still depend on the runtime i18n engine (they are not yet statically embedded); the new MPA output is not integrated with the Content Studio ZIP/PHP export, and the MPA adapter must be tested with CRM maintenance, booking and all language selectors. No deployment or successful end-to-end test is claimed.

## Static baseline translations

The MPA generator evaluates the repository's existing translation dictionaries in a sandboxed Node VM and embeds string values into leaf `[data-i18n]` elements, plus supported placeholders/title attributes. Nested HTML is deliberately left intact to avoid deleting buttons/icons. Firebase Content Studio overrides are **not** yet embedded, so the live i18n engine remains necessary for editorial overrides until export integration is implemented.

Build validation should be run with `npm install && npm run build:mpa` and direct URL/browser tests for all four domains. No CI workflow has been added and no successful build has been verified in this session.

## Source layout (October 2026)

Each public page is now maintained in `src/pages/{home,lodge,activities,enjoyment,booking}.html`. The multipage builder assembles a page fragment with the shared shell from legacy `index.html`, then applies domain-specific translations, URLs and SEO metadata. Shared `css/`, `js/` and `assets/` remain central. The legacy SPA `index.html` remains in the repository for compatibility with the existing SiteGround PHP exporter; do not edit it as the canonical MPA page source. GitHub Pages uses the generated Dutch MPA preview build; domain-specific builds remain in `dist/mpa/<domain>/` when running without `MPA_PREVIEW=1`.

Important: the GitHub Actions deployment still requires a successful workflow run and Pages configuration; this migration does not yet replace the SiteGround exporter or confirm browser-level behavior.

## Shared layout extraction

`src/layout.html` is now the canonical shared shell. It contains a `<!-- MPA_PAGE_MOUNT -->` marker; `scripts/build-multipage.cjs` injects the selected `src/pages/*.html` fragment at that marker. `src/pages/404.html` has also been extracted for the future export migration. The legacy `index.html` is retained only for backward compatibility with the existing SiteGround PHP ZIP exporter, which still fetches `index.html` and **has not yet been migrated** to the new source layout. Until that exporter is changed and tested, editing `src/pages` does not automatically update SiteGround exports. A successful GitHub Pages build/deployment and full browser regression test have not been confirmed.

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

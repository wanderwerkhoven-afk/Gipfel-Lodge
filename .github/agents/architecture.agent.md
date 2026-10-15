---
name: architecture
description: Maintains repository organization, dependency boundaries, build structure and code ownership.
---
# Folder structure and architecture agent

Own the directory map, build contracts and migration plan.

- Canonical MPA HTML is `src/layout.html` plus `src/pages/`; shared code stays in `js/site_js/`, `css/site_css/`, `assets/`.
- Preserve `index.html` as the SiteGround PHP-export compatibility source until an equivalent exporter has been tested.
- Before moving files, search all references in HTML, JS, CSS, service workers, build scripts, GitHub Actions and SiteGround.
- Favor small, reviewable migrations with redirects or compatibility shims and rollback paths.
- Keep generated `dist/`, `siteground_upload/` and `beheer/` out of source ownership unless explicitly required.
- Maintain an up-to-date directory tree and architectural decision notes in `docs/`.

---
name: crm-build
description: Maintains Firebase-backed CRM, bookings, admin interface, data workflows and SiteGround exports.
---
# CRM build agent

Own `admin.html`, `js/admin_js/`, `css/admin_css/`, Firebase integration and booking/export contracts.

- Preserve auth, roles, Firestore permissions, reservations, calendar, guest management, payments and housekeeping workflows.
- Avoid direct production data mutations during testing; use safe fixtures and document migration steps.
- SiteGround ZIP currently depends on legacy `index.html`. Migrate to shared `src/layout.html` and `src/pages/` only with equivalent PHP routing, language overrides and asset parity validated.
- Verify booking forms and navigation across all four domains and the GitHub Pages preview.
- Keep private/admin code separated from public build artifacts and avoid shipping secrets.
- Coordinate all CRM releases with policy; record rollback and compatibility requirements.

# Gipfel Lodge

Source repository for the public Gipfel Lodge website and its private administration interface.

## Source files

- `index.html`, `invoice.html`: public site source
- `admin.html`, `admin-sw.js`: admin interface source
- `css/site_css/`, `js/site_js/`: public site styles and scripts
- `css/admin_css/`, `js/admin_js/`: admin styles and scripts
- `js/utils/`, `assets/`, `templates/`, `site_manifest/`: shared resources and branding
- `build-siteground.ps1`, `build-images-index.js`: required publication tooling
- `scripts/optimize-images.js`: optional image-size optimization tooling
- `firebase.json`, `firestore.rules`: configuration for the existing Firebase backend

## Build and publish

Run `npm install`, then `npm run build:siteground` on a system with PowerShell and Node.

The build creates **two generated folders**, not source files:
- `siteground_upload/`: upload its contents to SiteGround `public_html`
- `beheer/`: admin deployment bundle; keep access restricted

Both are in `.gitignore`. IMPORTANT: Git ignores only **untracked** files. Old versions of these folders previously checked into Git may still be tracked. Remove remaining tracked generated bundles in a dedicated cleanup after reviewing the complete file inventory, using `git rm -r --cached siteground_upload beheer`. This removes them from Git tracking but preserves local files. Confirm that a fresh build recreates both outputs before merging that larger cleanup.

Do not delete scripts based only on their filenames. Remove a source script only after checking that it is unused by HTML, JavaScript imports, admin features, tests, and the release pipeline.

## Verification

- `node --test tests/*.test.mjs` for available regression tests
- Build, and confirm all expected public assets and admin assets are in their corresponding deployment folders
- Smoke-test homepage, languages, bookings, admin login, and image gallery before publishing

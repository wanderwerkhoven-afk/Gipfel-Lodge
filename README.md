# Gipfel Lodge — repository

De repository bevat **één website met twee publicatiepaden**: de nieuwe multipage-site en de bestaande SiteGround/PHP-export. De gedeelde bronbestanden staan centraal. Gegenereerde uitvoer is geen broncode.

## Waar pas je iets aan?

| Onderdeel | Bronlocatie |
| --- | --- |
| Gedeelde HTML (head, menu, footer, overlays) | `src/layout.html` |
| Home | `src/pages/home.html` |
| Lodge | `src/pages/lodge.html` |
| Activiteiten | `src/pages/activities.html` |
| Genieten | `src/pages/enjoyment.html` |
| Boeken | `src/pages/booking.html` |
| Niet gevonden | `src/pages/404.html` |
| Website-stijlen | `css/site_css/` |
| Website-interactie | `js/site_js/` |
| Taalteksten | `js/site_js/i18n/` |
| SEO/URL-configuratie | `js/site_js/seo/seo-config.js` |
| Foto's en overige media | `assets/` |
| CRM/beheer | `admin.html`, `js/admin_js/`, `css/admin_css/` |
| Multipage-build | `scripts/build-multipage.cjs` |
| SiteGround-build | `build-siteground.ps1`, `js/admin_js/admin-export.js` |

## Overzicht van de mappen

```text
Gipfel-Lodge/
├── src/
│   ├── layout.html             # gedeelde HTML-schil
│   └── pages/                 # losse paginatemplates
├── assets/                    # afbeeldingen, iconen en media
├── css/
│   ├── site_css/              # publieke website
│   └── admin_css/             # beheeromgeving
├── js/
│   ├── site_js/               # publieke website
│   ├── admin_js/              # beheeromgeving
│   └── utils/                 # gedeelde utilities
├── scripts/                   # build- en optimalisatiescripts
├── tests/                     # regressietests
├── docs/                      # technische documentatie
├── templates/                 # overige bestaande templates
├── site_manifest/             # publicatiemetadata
├── .github/workflows/         # CI en publicatie
├── index.html                 # LEGACY: bestaande SPA / PHP-exportbron
├── admin.html                 # beheeromgeving
├── build-siteground.ps1       # bestaande SiteGround-build
└── package.json
```

## Publiceren en testen

**Multipage / GitHub Pages**

```bash
npm install
MPA_PREVIEW=1 npm run build:mpa
```

Dit genereert de Nederlandse preview in `dist/mpa/`. Zonder `MPA_PREVIEW=1` worden de vier domeinen afzonderlijk gebouwd onder `dist/mpa/<domein>/`. De GitHub Actions-workflow `build-multipage.yml` bouwt en probeert de preview naar GitHub Pages te publiceren. De daadwerkelijke publicatie hangt af van een geslaagde workflow en de Pages-instellingen.

**SiteGround / PHP (bestaand)**

```powershell
npm install
npm run build:siteground
```

Deze route gebruikt voorlopig nog `index.html` en het bestaande exportsysteem. **Niet verwijderen of verplaatsen:** totdat de PHP-export is aangepast en getest, blijft deze legacy-bron nodig. Wijzigingen in `src/pages/` komen daardoor niet automatisch in de huidige SiteGround-PHP-export terecht. De bestaande `siteground_upload/` en `beheer/` zijn gegenereerde uitvoer, geen plaats voor handmatige broncodewijzigingen.

## Veilig wijzigen

1. Wijzig de gedeelde layout uitsluitend in `src/layout.html` en pagina-inhoud in `src/pages/` voor de MPA.
2. Laat `index.html`, `admin.html`, Firebase-configuratie en de SiteGround-export ongemoeid zolang de legacy-export niet is gemigreerd.
3. Voer `npm run build:mpa` en `node --test tests/*.test.mjs` uit; controleer daarnaast menu, boeking, talen, galerij en beheer handmatig.
4. Verwijder of verplaats geen rootbestanden zonder referenties, publicatiescripts en live-routes te controleren.

Zie `docs/multipage-migration.md` voor migratiestatus en resterende afhankelijkheden.

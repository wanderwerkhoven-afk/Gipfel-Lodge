# 🚀 Gipfel Lodge — Deploy Checklist

Volg deze checklist zorgvuldig om de website veilig en correct live te zetten op SiteGround.

## 1. Wat je WEL uploadt

Je uploadt **uitsluitend** de bestanden en mappen die zich in de `siteground_upload/` map bevinden, rechtstreeks naar de `public_html/` map op SiteGround.

Dit bevat normaal gesproken:
- `index.html` (publieke website)
- `invoice.html` (nodig voor factuurlinks)
- `css/` (bevat alleen `site_css`)
- `js/` (bevat alleen `site_js` en `utils`)
- `assets/` (afbeeldingen, etc.)
- `templates/` (alleen `invoice_template.html` zit hierin)
- Favicons (bijv. `favicon.ico`, `site.webmanifest`)
- `robots.txt`
- `sitemap.xml`

## 2. Wat je NOOIT uploadt (staat niet in siteground_upload)

De volgende bestanden zijn intern en vormen een beveiligingsrisico als je ze op een publieke webserver plaatst:
- `admin.html` en `admin-sw.js` (tenzij extra beveiligd in een aparte map)
- De hele `beheer/` map (tenzij je deze specifiek en beveiligd wilt hosten, zie `beheer/README.md`)
- Map `pricing_sources/` (bevat Excel bestanden en seeds)
- Map `.git/` (versiebeheer)
- Map `css/admin_css/`
- Map `js/admin_js/`
- `firestore.rules`
- `b64_logo.txt`, `CNAME`, `package.json`, `build-siteground.ps1`
- `DEPLOY_CHECKLIST.md` zelf

## 3. Externe Beveiligingsinstellingen (Belangrijk!)

Na het uploaden moet je deze instellingen configureren om te voorkomen dat anderen je services misbruiken:

### Firebase
De API key is publiek zichtbaar in `js/site_js/core/firebase.js`. Dit is normaal, maar je **moet** dit beveiligen:
1. Ga naar **Google Cloud Console** → **APIs & Services** → **Credentials**.
2. Zoek de API Key voor "gipfel-lodge" (`AIzaSyDDmNAnEIGOsScRJiCQKSfY-DDHu5gKYb8`).
3. Stel in onder **Application restrictions**: **HTTP referrers (web sites)**.
4. Voeg toe: `https://gipfellodge.com/*` (of je uiteindelijke domein).

### EmailJS
De public key is zichtbaar om de formulieren te laten werken.
1. Log in op **EmailJS Dashboard**.
2. Ga naar **Account** → **Security**.
3. Bij **Allowed origins / domains**, voeg je SiteGround-domein toe: `gipfellodge.com`.

### SiteGround Beveiliging (Optioneel maar aanbevolen)
Forceer HTTPS verkeer voor een veilige verbinding:
1. Ga naar **Site Tools** in SiteGround.
2. Ga naar **Security** → **HTTPS Enforce**.
3. Zet HTTPS Enforce **Aan** voor je domein.

## 4. Admin Paneel Hosten
Als je het admin-paneel ook via SiteGround wilt gebruiken in plaats van lokaal, bekijk dan de gids in `beheer/README.md` voor veilige upload-instructies (gebruikmakend van Password Protected Directories).

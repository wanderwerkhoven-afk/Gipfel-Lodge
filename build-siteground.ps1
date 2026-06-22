# =============================================================
# build-siteground.ps1
# Gipfel Lodge - Deploy Build Script
# =============================================================
# Gebruik:
#   npm run build:siteground   -> bouwt BEIDE mappen
#   of direct:
#   powershell -ExecutionPolicy Bypass -File ./build-siteground.ps1
#
# Output:
#   /siteground_upload  -> upload dit naar SiteGround public_html
#   /beheer             -> admin paneel, alleen lokaal of beveiligd
# =============================================================

param(
    [switch]$BeheerOnly
)

$Root = $PSScriptRoot

# -------------------------------------------------
# KLEUREN HELPER
# -------------------------------------------------
function Write-Step($msg) { Write-Host "`n[RUN] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!]   $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red }

Write-Host "`n=============================================" -ForegroundColor Magenta
Write-Host "  GIPFEL LODGE - BUILD SCRIPT" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta

# =============================================================
# 0. GENEREER IMAGE INDEX
# =============================================================
Write-Step "Genereren van image index (images.json)..."
node "$Root\build-images-index.js"
Write-Ok "Image index succesvol gegenereerd."

# =============================================================
# 1. SITEGROUND_UPLOAD - Publieke website
# =============================================================
if (-not $BeheerOnly) {

    Write-Step "Bouwen van siteground_upload/ (publieke website)..."

    $Dist = Join-Path $Root "siteground_upload"

    # Verwijder vorige build
    if (Test-Path $Dist) {
        Remove-Item -Recurse -Force $Dist
        Write-Ok "Vorige siteground_upload/ verwijderd"
    }
    New-Item -ItemType Directory -Path $Dist | Out-Null

    # -- Publieke HTML-bestanden --
    Write-Step "Kopieren van publieke HTML-bestanden..."
    Copy-Item "$Root\index.html"   "$Dist\index.html"
    Write-Ok "index.html"
    Copy-Item "$Root\invoice.html" "$Dist\invoice.html"
    Write-Ok "invoice.html"
    if (Test-Path "$Root\.htaccess") {
        Copy-Item "$Root\.htaccess"   "$Dist\.htaccess"
        Write-Ok ".htaccess"
    }

    # -- CSS (alleen site_css, NIET admin_css) --
    Write-Step "Kopieren van CSS (site_css)..."
    $cssTarget = Join-Path $Dist "css\site_css"
    New-Item -ItemType Directory -Path $cssTarget -Force | Out-Null
    Copy-Item "$Root\css\site_css\*" $cssTarget -Recurse
    Write-Ok "css/site_css/"

    # -- JS (alleen site_js en utils, NIET admin_js) --
    Write-Step "Kopieren van JavaScript (site_js + utils)..."
    $jsTarget = Join-Path $Dist "js"
    New-Item -ItemType Directory -Path $jsTarget -Force | Out-Null
    Copy-Item "$Root\js\site_js" "$jsTarget\site_js" -Recurse
    Copy-Item "$Root\js\utils"   "$jsTarget\utils"   -Recurse
    Write-Ok "js/site_js/"
    Write-Ok "js/utils/"

    # -- Assets (afbeeldingen, iconen) --
    Write-Step "Kopieren van assets..."
    Copy-Item "$Root\assets" "$Dist\assets" -Recurse
    Write-Ok "assets/"

    # -- Alleen invoice_template uit templates --
    Write-Step "Kopieren van benodigde templates (alleen invoice_template)..."
    $tmplTarget = Join-Path $Dist "templates"
    New-Item -ItemType Directory -Path $tmplTarget -Force | Out-Null
    Copy-Item "$Root\templates\invoice_template.html" "$tmplTarget\invoice_template.html"
    Write-Ok "templates/invoice_template.html (nodig voor invoice.html)"

    # -- Favicon en manifest van de publieke site --
    Write-Step "Kopieren van favicon en webmanifest..."
    $favSrc = "$Root\site_manifest\favicon_website"
    # Kopieer favicons naar root van dist
    Copy-Item "$favSrc\favicon.ico"                  "$Dist\favicon.ico"
    Copy-Item "$favSrc\favicon.svg"                  "$Dist\favicon.svg"
    Copy-Item "$favSrc\favicon-96x96.png"            "$Dist\favicon-96x96.png"
    Copy-Item "$favSrc\apple-touch-icon.png"         "$Dist\apple-touch-icon.png"
    Copy-Item "$favSrc\web-app-manifest-192x192.png" "$Dist\web-app-manifest-192x192.png"
    Copy-Item "$favSrc\web-app-manifest-512x512.png" "$Dist\web-app-manifest-512x512.png"
    Copy-Item "$favSrc\site.webmanifest"             "$Dist\site.webmanifest"
    Write-Ok "Favicon bestanden"

    # -- robots.txt --
    Write-Step "Aanmaken van robots.txt..."
    $robotsTxt = @"
User-agent: *
Allow: /

Sitemap: https://gipfellodge.com/sitemap.xml
"@
    $robotsTxt | Set-Content "$Dist\robots.txt" -Encoding UTF8
    Write-Ok "robots.txt"

    # -- sitemap.xml --
    Write-Step "Aanmaken van sitemap.xml..."
    $today = Get-Date -Format "yyyy-MM-dd"
    $sitemapXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://gipfellodge.com/</loc>
    <lastmod>$today</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
"@
    $sitemapXml | Set-Content "$Dist\sitemap.xml" -Encoding UTF8
    Write-Ok "sitemap.xml"

    # -- Beveiligingscheck --
    Write-Step "Beveiligingscheck: scannen op gevoelige data..."
    $sensitivePatterns = @("AlpinerLuxus", "pricing_sources", "seed-bookings", "excel-import")
    $allClear = $true
    foreach ($pattern in $sensitivePatterns) {
        $found = Get-ChildItem -Path $Dist -Recurse -File | Select-String -Pattern $pattern -SimpleMatch -List 2>$null
        if ($found) {
            Write-Warn "GEVONDEN: '$pattern' in $($found.Path)"
            $allClear = $false
        }
    }
    if ($allClear) {
        Write-Ok "Geen gevoelige data gevonden in siteground_upload/"
    }

    # -- PHP Scripts --
    Write-Step "Kopieren van PHP scripts..."
    Copy-Item "$Root\list-images.php" "$Dist\list-images.php" -ErrorAction SilentlyContinue
    Write-Ok "list-images.php"

    # -- Genereer site-manifest.json voor de statische exporter --
    Write-Step "Genereren van site-manifest.json (voor statische export)..."
    $manifestFiles = Get-ChildItem -Path $Dist -Recurse -File | ForEach-Object {
        $_.FullName.Substring($Dist.Length + 1).Replace('\', '/')
    }
    # Exclude index.html (die wordt door de exporter gegenereerd per taal)
    $manifestFiles = $manifestFiles | Where-Object { $_ -ne 'index.html' -and $_ -ne 'invoice.html' }
    $manifestJson = $manifestFiles | ConvertTo-Json -Compress
    $manifestJson | Set-Content "$Dist\js\site-manifest.json" -Encoding UTF8
    Write-Ok "js/site-manifest.json ($($manifestFiles.Count) bestanden geindexeerd)"

    Write-Host "`n[DONE] siteground_upload/ klaar!" -ForegroundColor Green
    Write-Host "   Upload de inhoud van siteground_upload/ naar SiteGround public_html" -ForegroundColor White
}

# =============================================================
# 2. BEHEER - Admin paneel (lokaal gebruik)
# =============================================================

Write-Step "Bouwen van beheer/ (admin paneel)..."

$Beheer = Join-Path $Root "beheer"

# Verwijder vorige build
if (Test-Path $Beheer) {
    Remove-Item -Recurse -Force $Beheer
    Write-Ok "Vorige beheer/ verwijderd"
}
New-Item -ItemType Directory -Path $Beheer | Out-Null

# -- Admin HTML --
Copy-Item "$Root\admin.html"   "$Beheer\admin.html"
Copy-Item "$Root\admin-sw.js"  "$Beheer\admin-sw.js"
Write-Ok "admin.html + admin-sw.js"

# -- Admin JS (inclusief gedeelde firebase.js dependency) --
$beheerJs = Join-Path $Beheer "js"
New-Item -ItemType Directory -Path $beheerJs -Force | Out-Null
Copy-Item "$Root\js\admin_js"  "$beheerJs\admin_js"  -Recurse
# firebase.js en site_js zijn nodig voor de admin imports
Copy-Item "$Root\js\site_js"   "$beheerJs\site_js"   -Recurse
Copy-Item "$Root\js\utils"     "$beheerJs\utils"      -Recurse
Write-Ok "js/admin_js/ + js/site_js/ + js/utils/"

# -- Admin CSS (inclusief gedeelde site base CSS) --
$beheerCss = Join-Path $Beheer "css"
New-Item -ItemType Directory -Path $beheerCss -Force | Out-Null
Copy-Item "$Root\css\admin_css" "$beheerCss\admin_css" -Recurse
Copy-Item "$Root\css\site_css"  "$beheerCss\site_css"  -Recurse
Write-Ok "css/admin_css/ + css/site_css/"

# -- Templates (alle email sjablonen + invoice) --
Copy-Item "$Root\templates" "$Beheer\templates" -Recurse
Write-Ok "templates/ (alle e-mailsjablonen)"

# -- Assets (afbeeldingen, iconen voor weergave in galerij) --
Copy-Item "$Root\assets" "$Beheer\assets" -Recurse
Write-Ok "assets/ (afbeeldingen voor galerijweergave)"

# -- Favicon admin --
$beheerManifest = Join-Path $Beheer "site_manifest\favicon_admin"
New-Item -ItemType Directory -Path $beheerManifest -Force | Out-Null
Copy-Item "$Root\site_manifest\favicon_admin\*" $beheerManifest -Recurse
Write-Ok "site_manifest/favicon_admin/"

# -- PHP Scripts --
Copy-Item "$Root\list-images.php" "$Beheer\list-images.php" -ErrorAction SilentlyContinue
Write-Ok "list-images.php"

# -- Site-manifest.json (nodig voor statische export vanuit admin panel) --
$sgDist = Join-Path $Root "siteground_upload"
$manifestSrc = Join-Path $sgDist "js\site-manifest.json"
if (Test-Path $manifestSrc) {
    Copy-Item $manifestSrc "$beheerJs\site-manifest.json"
    Write-Ok "js/site-manifest.json (gekopieerd van siteground_upload/)"
} else {
    Write-Warn "site-manifest.json niet gevonden - voer eerst build:siteground uit"
}

# -- README voor beheer --
Copy-Item "$Root\beheer\README.md" "$Beheer\README.md" -ErrorAction SilentlyContinue
Write-Ok "README.md"

Write-Host "`n[DONE] beheer/ klaar!" -ForegroundColor Green
Write-Host "   Gebruik beheer/ alleen lokaal (of beveiligd op SiteGround)" -ForegroundColor White

# =============================================================
# SAMENVATTING
# =============================================================
Write-Host "`n=============================================" -ForegroundColor Magenta
Write-Host "  BUILD VOLTOOID" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  [DIR] siteground_upload/  -> upload naar public_html" -ForegroundColor Cyan
Write-Host "  [DIR] beheer/             -> alleen lokaal gebruiken" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Vergeet niet:" -ForegroundColor White
Write-Host "  1. Firebase API key beperken in Google Cloud Console" -ForegroundColor Gray
Write-Host "  2. EmailJS allowed domains instellen: https://gipfellodge.com" -ForegroundColor Gray
Write-Host "  3. SiteGround: Password Protect beheer/ als je het upload" -ForegroundColor Gray
Write-Host ""

// admin-export.js
// PHP Export: bouwt een ZIP voor SiteGround (parked domains) met een index.php.
// De server kiest hierin zelf de taal op basis van het domein.

async function startStaticExport() {
    const btn = document.getElementById('btn-run-export');
    const statusDiv = document.getElementById('export-status');
    const progressWrap = document.getElementById('export-progress-bar');
    const progressFill = document.getElementById('export-progress-fill');

    btn.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#475569';
    progressWrap.style.display = 'block';
    progressFill.style.width = '0%';
    statusDiv.innerText = 'Firebase data laden...';

    try {
        if (typeof JSZip === 'undefined') throw new Error('JSZip is niet geladen!');
        const zip = new JSZip();

        // 1. Firebase data ophalen
        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
        const [galleriesSnap, translationsSnap] = await Promise.all([
            getDoc(doc(db, 'settings', 'galleries')),
            getDoc(doc(db, 'settings', 'translations'))
        ]);
        const galleryZones  = galleriesSnap.exists()    ? (galleriesSnap.data().zones || {}) : {};
        const textOverrides = translationsSnap.exists() ? translationsSnap.data()            : {};
        
        progressFill.style.width = '10%';
        statusDiv.innerText = 'Standaard vertalingen inladen...';

        // 2. Resolve the immutable source commit before loading translations.
        const source = await loadGitHubSiteSources();
        await loadAllTranslations(source.rawBase);
        
        // Samenvoegen met Firebase overrides
        const finalTranslations = { nl: {}, de: {}, en: {} };
        ['nl', 'de', 'en'].forEach(lang => {
            finalTranslations[lang] = { 
                ...(window.gipfelTranslations?.[lang] || {}), 
                ...(textOverrides[lang] || {}) 
            };
        });

        // 3. Read the exact public source tree from GitHub; no build-script or
        // previously generated siteground_upload/ directory is required.
        statusDiv.innerText = 'GitHub-bronbestanden controleren...';
        const fileList = source.files;
        const sourceBase = source.rawBase;
        progressFill.style.width = '15%';

        // 4. Build the static website archive. Any missing file is fatal;
        // a partial package must never be presented as ready for publication.
        let copied = 0;
        const batchSize = 8;
        for (let i = 0; i < fileList.length; i += batchSize) {
            const batch = fileList.slice(i, i + batchSize);
            await Promise.all(batch.map(async ({src, dest}) => {
                const response = await fetch(sourceBase + encodeGitHubPath(src));
                if (!response.ok) throw new Error('Verplicht bronbestand ontbreekt: ' + src + ' (HTTP ' + response.status + ')');
                zip.file(dest, await response.blob());
                copied++;
            }));
            progressFill.style.width = (15 + copied / fileList.length * 45) + '%';
            statusDiv.innerText = 'Bestanden verwerkt: ' + copied + '/' + fileList.length;
        }

        // Generate machine-readable discovery metadata from the same canonical host.
        zip.file('robots.txt', 'User-agent: *\\nAllow: /\\n\\nSitemap: https://gipfellodge.at/sitemap.xml\\n');
        zip.file('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://gipfellodge.at/</loc></url></urlset>');

        // 5. The exported site is always based on current GitHub index.html.
        statusDiv.innerText = 'Actuele GitHub index.html ophalen...';
        const indexResp = await fetch(sourceBase + 'index.html');
        if (!indexResp.ok) throw new Error('GitHub index.html is niet beschikbaar');
        const rawHtml = await indexResp.text();
        progressFill.style.width = '65%';

        // 6. Parse HTML
        const parser = new DOMParser();
        const docEl = parser.parseFromString(rawHtml, 'text/html');

        // ── 6a. Injecteer PHP logica voor vertalingen in HTML-attributen ───────────
        
        // Injecteer tekst overrides statisch voor i18n.js zodat deze geen Firebase call doet
        if (Object.keys(textOverrides).length > 0) {
            const inlineScript = docEl.createElement('script');
            inlineScript.id = 'gipfel-static-overrides';
            inlineScript.textContent =
                `/* Statisch ingebakken tekst-overrides vanuit Firebase (gegenereerd op ${new Date().toISOString()}) */\n` +
                `window.__GIPFEL_TEXT_OVERRIDES__ = ${JSON.stringify(textOverrides, null, 2)};`;
            const firstScript = docEl.head.querySelector('script');
            if (firstScript) {
                docEl.head.insertBefore(inlineScript, firstScript);
            } else {
                docEl.head.appendChild(inlineScript);
            }
        }
        
        const phpMap = {};
        let phpCounter = 0;

        // Velden die taal-onafhankelijk zijn: vlag emojis, namen, review-source
        // Voor deze velden gebruiken we de NL waarde als fallback in PHP (niet de key-naam)
        const langNeutralPrefixes = ['review-', 'review-source'];
        const isLangNeutral = (key) => key === 'review-source' ||
            (key.startsWith('review-') && (key.endsWith('-flag') || key.endsWith('-name') || key.endsWith('-source')));

        // data-i18n elementen
        docEl.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            let phpCode;

            if (isLangNeutral(key)) {
                // Taal-onafhankelijk veld: gebruik NL waarde als fallback voor alle talen
                const nlFallback = (finalTranslations['nl'] && finalTranslations['nl'][key]) || key;
                const nlEscaped = nlFallback.replace(/'/g, "\\'");
                phpCode = `<?= htmlspecialchars($t[$lang]['${key}'] ?? '${nlEscaped}') ?>`;
            } else {
                phpCode = `<?= htmlspecialchars($t[$lang]['${key}'] ?? $t['nl']['${key}'] ?? '') ?>`;
            }

            const placeholder = `__PHP_TAG_${phpCounter++}__`;
            phpMap[placeholder] = phpCode;
            
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.setAttribute('placeholder', placeholder);
                // Retain data-i18n for subsequent client-side language changes.
            } else if (el.hasAttribute('title')) {
                el.setAttribute('title', placeholder);
                // Retain data-i18n for subsequent client-side language changes.
            } else {
                el.innerHTML = placeholder;
                // Retain data-i18n for subsequent client-side language changes.
            }
        });

        // ── 6b. Single images: vervang data-img-key direct in de HTML ───────────
        let imagesReplaced = 0;
        docEl.querySelectorAll('[data-img-key]').forEach(el => {
            const key = el.getAttribute('data-img-key');
            const zone = galleryZones[key];
            if (zone && zone.length > 0) {
                const item = zone[0];
                const url = typeof item === 'string' ? item : (item.src || '');
                if (!url) return;

                if (el.tagName === 'IMG') {
                    el.setAttribute('src', url);
                    // Image alt tags afhandelen met PHP als ze per taal verschillen
                    if (item && typeof item === 'object' && item.alt) {
                        const hasNl = !!item.alt.nl;
                        const hasDe = !!item.alt.de;
                        const hasEn = !!item.alt.en;
                        if (hasNl || hasDe || hasEn) {
                            const altJson = JSON.stringify({
                                nl: item.alt.nl || '',
                                de: item.alt.de || '',
                                en: item.alt.en || ''
                            });
                            const b64Alt = btoa(unescape(encodeURIComponent(altJson)));
                            const phpCode = `<?= htmlspecialchars(json_decode(base64_decode('${b64Alt}'), true)[$lang] ?? '') ?>`;
                            const placeholder = `__PHP_TAG_${phpCounter++}__`;
                            phpMap[placeholder] = phpCode;
                            el.setAttribute('alt', placeholder);
                        }
                    }
                } else {
                    el.style.backgroundImage = `url('${url}')`;
                }
                imagesReplaced++;
            }
            el.removeAttribute('data-img-key');
        });

        // ── 6c. Gallery zones ───────────────────────────────────────────────────
        docEl.querySelectorAll('[data-gallery-zone]').forEach(el => {
            const zoneKey = el.getAttribute('data-gallery-zone');
            const items = galleryZones[zoneKey];
            if (!items || items.length === 0) return;

            const getAltPlaceholder = (item, fallbackSrc) => {
                if (item && typeof item === 'object' && item.alt && (item.alt.nl || item.alt.de || item.alt.en)) {
                    const altJson = JSON.stringify({
                        nl: item.alt.nl || '',
                        de: item.alt.de || '',
                        en: item.alt.en || ''
                    });
                    const b64Alt = btoa(unescape(encodeURIComponent(altJson)));
                    const phpCode = `<?= htmlspecialchars(json_decode(base64_decode('${b64Alt}'), true)[$lang] ?? '') ?>`;
                    const placeholder = `__PHP_TAG_${phpCounter++}__`;
                    phpMap[placeholder] = phpCode;
                    return placeholder;
                }
                return fallbackSrc.split('/').pop().replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
            };

            // Caption placeholder voor <figcaption> SEO element
            const getCaptionPlaceholder = (item) => {
                if (item && typeof item === 'object' && item.caption && (item.caption.nl || item.caption.de || item.caption.en)) {
                    const capJson = JSON.stringify({
                        nl: item.caption.nl || '',
                        de: item.caption.de || '',
                        en: item.caption.en || ''
                    });
                    const b64Cap = btoa(unescape(encodeURIComponent(capJson)));
                    const phpCode = `<?= htmlspecialchars(json_decode(base64_decode('${b64Cap}'), true)[$lang] ?? '') ?>`;
                    const placeholder = `__PHP_TAG_${phpCounter++}__`;
                    phpMap[placeholder] = phpCode;
                    return placeholder;
                }
                return '';
            };

            if (zoneKey === 'hero_slider') {
                el.innerHTML = items.map((item, i) => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    return `<div class="hero-v3-slide${i === 0 ? ' active' : ''}" style="background-image: url('${src}');"></div>`;
                }).join('');

            } else if (zoneKey.startsWith('lodge_mini')) {
                const prevBtn = el.querySelector('.mini-nav.prev')?.outerHTML || '';
                const nextBtn = el.querySelector('.mini-nav.next')?.outerHTML || '';
                el.innerHTML = items.map((item, i) => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAltPlaceholder(item, src);
                    return `<img src="${src}" alt="${alt}"${i === 0 ? ' class="active"' : ''}>`;
                }).join('') + prevBtn + nextBtn;

            } else if (zoneKey === 'lodge_top_carousel') {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAltPlaceholder(item, src);
                    const caption = getCaptionPlaceholder(item);
                    const figcap = caption ? `<figcaption class="img-caption">${caption}</figcaption>` : '';
                    return `<div class="lodge-strip-item"><figure><img src="${src}" alt="${alt}" loading="lazy">${figcap}</figure></div>`;
                }).join('');

            } else if (zoneKey === 'lodge_gallery') {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAltPlaceholder(item, src);
                    const caption = getCaptionPlaceholder(item);
                    const overlayText = caption || alt;
                    const figcap = caption ? `<figcaption class="img-caption">${caption}</figcaption>` : '';
                    return `<div class="masonry-item reveal"><figure><img src="${src}" alt="${alt}" loading="lazy"><div class="masonry-overlay"><span>${overlayText}</span></div>${figcap}</figure></div>`;
                }).join('');

            } else {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAltPlaceholder(item, src);
                    const caption = getCaptionPlaceholder(item);
                    const figcap = caption ? `<figcaption class="img-caption">${caption}</figcaption>` : '';
                    return src ? `<div class="gallery-item"><figure><img src="${src}" alt="${alt}" loading="lazy">${figcap}</figure></div>` : '';
                }).join('');
            }
            imagesReplaced++;
            el.removeAttribute('data-gallery-zone');
        });

        // ── 6d. Verberg lege review kaartjes server-side ────────────────────────
        docEl.querySelectorAll('.review-card-v3').forEach(card => {
            const p = card.querySelector('.review-text');
            if (!p) return;
            const key = p.getAttribute('data-i18n');
            if (!key) return;

            // Check of de review leeg is in ALLE talen (nl, de, en)
            // Als die in alle talen leeg/'-' is, verberg het kaartje statisch
            const allEmpty = ['nl', 'de', 'en'].every(lang => {
                const val = (finalTranslations[lang] && finalTranslations[lang][key]) || '';
                return !val || val.trim() === '-' || val.trim() === '';
            });

            if (allEmpty) {
                // Voeg display:none toe aan bestaande style
                const existing = card.getAttribute('style') || '';
                card.setAttribute('style', (existing + '; display:none!important;').replace(/^;\s*/, '').trim());
            }
        });



        // ── 6e. Meta Tags (SEO) ────────────────────────────────────────────────
        const titleEl = docEl.querySelector('title');
        if (titleEl) {
            const phpCode = `<?= $seoTitles[$lang][$activeRoute] ?? 'Gipfel Lodge' ?>`;
            const placeholder = `__PHP_TAG_${phpCounter++}__`;
            phpMap[placeholder] = phpCode;
            titleEl.textContent = placeholder;
        }
        
        // Hreflang toevoegen
        const head = docEl.querySelector('head');
        if (head) {
            head.insertAdjacentHTML('beforeend', `
    <!-- Dynamic SEO Tags via PHP -->
    <link rel="alternate" hreflang="de" href="https://gipfellodge.de/" />
    <link rel="alternate" hreflang="nl" href="https://gipfellodge.nl/" />
    <link rel="alternate" hreflang="en" href="https://gipfellodge.eu/" />
    <link rel="alternate" hreflang="x-default" href="https://gipfellodge.eu/" />
            `);
        }

        // html lang attribuut
        docEl.documentElement.setAttribute('lang', '<?= $lang ?>');

        progressFill.style.width = '85%';
        statusDiv.innerText = `HTML omgebouwd naar PHP: ${imagesReplaced} afbeeldingszones.`;

        // 7. Stel het uiteindelijke PHP-bestand samen
        // PHP array veilig genereren via base64 JSON om alle syntax errors (quotes/brackets) te voorkomen
        const safeJson = JSON.stringify(finalTranslations);
        const b64Json = btoa(unescape(encodeURIComponent(safeJson))); // Safe base64 encode for UTF-8

        const phpHeader = `<?php
/**
 * Gipfel Lodge - Dynamische taal routering voor Parked Domains
 * Dit bestand genereert server-side de juiste HTML o.b.v. het domein.
 */

$host = $_SERVER['HTTP_HOST'] ?? '';

// Bepaal taal o.b.v. domein (fallback = nl)
$lang = 'nl';
if (strpos($host, '.de') !== false || strpos($host, '.at') !== false || strpos($host, '.ch') !== false) {
    $lang = 'de';
} elseif (strpos($host, '.com') !== false || strpos($host, '.eu') !== false || strpos($host, '.co.uk') !== false) {
    $lang = 'en';
}

// Check eventuele URL parameter (?lang=de)
if (isset($_GET['lang']) && in_array($_GET['lang'], ['nl', 'de', 'en'])) {
    $lang = $_GET['lang'];
}

// Bepaal actieve route voor SEO title (simpel gebaseerd op URI, of default 'home')
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$activeRoute = 'home';
if (strpos($uri, 'lodge') !== false) $activeRoute = 'lodge';
elseif (strpos($uri, 'activiteit') !== false || strpos($uri, 'aktivitaet') !== false || strpos($uri, 'activities') !== false) $activeRoute = 'activities';
elseif (strpos($uri, 'genieten') !== false || strpos($uri, 'geniessen') !== false || strpos($uri, 'enjoy') !== false) $activeRoute = 'enjoyment';
elseif (strpos($uri, 'boek') !== false || strpos($uri, 'buch') !== false || strpos($uri, 'book') !== false) $activeRoute = 'booking';

// SEO Titles
$seoTitles = [
    'de' => ['home' => 'Gipfel Lodge | Alpiner Luxus & Raum', 'lodge' => 'Die Lodge | Gipfel Lodge Eben im Pongau', 'activities' => 'Aktivitäten | Ski Amadé & Sommer Alpen', 'enjoyment' => 'Genießen | Gipfel Lodge', 'booking' => 'Buchen | Gipfel Lodge'],
    'nl' => ['home' => 'Gipfel Lodge | Alpiner Luxus & Raum', 'lodge' => 'De Lodge | Gipfel Lodge Eben im Pongau', 'activities' => 'Activiteiten | Ski Amadé & Zomer Alpen', 'enjoyment' => 'Genieten | Gipfel Lodge', 'booking' => 'Boeken | Gipfel Lodge'],
    'en' => ['home' => 'Gipfel Lodge | Alpine Luxury & Space', 'lodge' => 'The Lodge | Gipfel Lodge Eben im Pongau', 'activities' => 'Activities | Ski Amadé & Summer Alps', 'enjoyment' => 'Enjoy | Gipfel Lodge', 'booking' => 'Book | Gipfel Lodge']
];

// Ingebakken vertalingen
$t = json_decode(base64_decode('${b64Json}'), true);
?>
`;

        // Serialize de aangepaste DOM naar HTML string
        let bodyHtml = docEl.documentElement.outerHTML;

        // Vervang de placeholders terug naar echte PHP tags
        // Dit voorkomt dat de browser DOMParser <? aanziet voor een HTML comment (<!--?)
        for (const [placeholder, phpCode] of Object.entries(phpMap)) {
            bodyHtml = bodyHtml.replace(placeholder, phpCode);
        }

        // Als er onverhoopt nog raw PHP tags in de source stonden die wel omgezet zijn door outerHTML, herstel die:
        bodyHtml = bodyHtml.replace(/&lt;\?=/g, '<?=');
        bodyHtml = bodyHtml.replace(/\?&gt;/g, '?>');

        const finalPhp = phpHeader + '<!DOCTYPE html>\n' + bodyHtml;
        
        zip.file('index.php', finalPhp);
        // Existing index.html on SiteGround must not shadow the translated PHP entrypoint.
        if (zip.file('.htaccess')) {
            const htaccess = await zip.file('.htaccess').async('string');
            zip.file('.htaccess', htaccess);
        }

        // 8. Validate the finished archive before offering it for upload.
        const requiredOutput = ['index.php', '.htaccess', 'robots.txt', 'sitemap.xml',
            'invoice.html', 'favicon.ico', 'site.webmanifest',
            'llms.txt', 'index.md', 'openapi.json', 'agent-error.php',
            'markdown-home.php', 'api/status.php', 'api/index.php',
            'css/site_css/base/style.css', 'js/site_js/core/firebase.js'];
        for (const path of requiredOutput) {
            if (!zip.file(path)) throw new Error('Exportcontrole mislukt: ' + path + ' ontbreekt.');
        }
        if (copied !== fileList.length) throw new Error('Export onvolledig: niet alle bronbestanden zijn verwerkt.');
        statusDiv.innerText = 'Export gevalideerd: ' + copied + ' GitHub-bestanden. ZIP maken...';

        // 9. ZIP genereren & downloaden
        statusDiv.innerText = 'ZIP inpakken en comprimeren...';
        progressFill.style.width = '95%';
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        progressFill.style.width = '100%';
        statusDiv.innerText = `✅ Klaar! PHP Export voltooid. Bestand heet nu index.php.`;
        statusDiv.style.color = '#10b981';

        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `gipfellodge-phpexport-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            btn.disabled = false;
            progressWrap.style.display = 'none';
        }, 4000);

    } catch (error) {
        console.error('[export] Mislukt:', error);
        statusDiv.innerText = '❌ Fout bij exporteren: ' + error.message;
        statusDiv.style.color = '#ef4444';
        btn.disabled = false;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadAllTranslations(rawBase) {
    // Fetch translations from the same canonical repository as the HTML export.
    // This prevents stale copied admin translations from diverging from index.php.
    window.gipfelTranslations = { de: {}, fr: {}, it: {}, en: {}, pl: {}, he: {}, nl: {} };
    const base = rawBase;
    const scripts = [
        'js/site_js/i18n/i18n_core.js',
        'js/site_js/i18n/i18n_global.js',
        'js/site_js/i18n/i18n_home.js',
        'js/site_js/i18n/i18n_lodge.js',
        'js/site_js/i18n/i18n_activities.js',
        'js/site_js/i18n/i18n_enjoyment.js',
        'js/site_js/i18n/i18n_booking.js'
    ];
    for (const path of scripts) {
        const response = await fetch(base + encodeGitHubPath(path));
        if (!response.ok) throw new Error('Verplicht vertaalbestand ontbreekt: ' + path);
        const script = document.createElement('script');
        script.textContent = await response.text();
        document.head.appendChild(script);
    }
}

function getSitegroundBase() {
    const loc = window.location;
    let pathname = loc.pathname;

    let base = pathname.substring(0, pathname.lastIndexOf('/') + 1);

    if (base.endsWith('/beheer/')) {
        base = base.substring(0, base.length - 'beheer/'.length);
    } else if (pathname.endsWith('/admin')) {
        base = pathname.substring(0, pathname.length - 'admin'.length);
    }

    return loc.origin + base + 'siteground_upload/';
}

/**
 * Resolve the public site payload from its canonical GitHub source tree.
 * Neither admin files nor generated bundles are included in the upload ZIP.
 */
const GIPFEL_SOURCE_REPOSITORY = 'wanderwerkhoven-afk/Gipfel-Lodge';
const GIPFEL_SOURCE_REF = 'main';

function encodeGitHubPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
}

function mapPublicSiteFile(path) {
    if (path === 'invoice.html' || path === '.htaccess' || path === 'list-images.php' ||
        path === '404.php' || path === 'llms.txt' || path === 'index.md' ||
        path === 'openapi.json' || path === 'sitemap.xml' || path === 'agent-error.php' ||
        path === 'markdown-home.php' || path === 'api/status.php' || path === 'api/index.php') return path;
    if (path.startsWith('css/site_css/') || path.startsWith('js/site_js/') ||
        path.startsWith('js/utils/') || path.startsWith('assets/')) return path;
    if (path === 'templates/invoice_template.html') return path;
    if (path.startsWith('site_manifest/favicon_website/')) {
        return path.slice('site_manifest/favicon_website/'.length);
    }
    return null;
}

async function loadGitHubSiteSources() {
    const commitResponse = await fetch('https://api.github.com/repos/' + GIPFEL_SOURCE_REPOSITORY + '/commits/' + GIPFEL_SOURCE_REF);
    if (!commitResponse.ok) throw new Error('GitHub-commit kan niet worden vastgesteld (HTTP ' + commitResponse.status + ').');
    const {sha: commitSha} = await commitResponse.json();
    if (!/^[0-9a-f]{40}$/.test(commitSha || '')) throw new Error('Ongeldige GitHub-commit SHA.');
    const api = 'https://api.github.com/repos/' + GIPFEL_SOURCE_REPOSITORY + '/git/trees/' + commitSha + '?recursive=1';
    const response = await fetch(api, {headers: {'Accept': 'application/vnd.github+json'}});
    if (!response.ok) throw new Error('GitHub-bestandsinventaris niet bereikbaar (HTTP ' + response.status + '). Probeer later opnieuw.');
    const tree = await response.json();
    if (tree.truncated) throw new Error('GitHub geeft een onvolledige bestandsinventaris terug. Export afgebroken.');
    if (!Array.isArray(tree.tree)) throw new Error('GitHub gaf geen geldige bestandsinventaris terug.');
    const files = tree.tree.filter(entry => entry.type === 'blob')
        .map(entry => ({src: entry.path, dest: mapPublicSiteFile(entry.path)}))
        .filter(entry => entry.dest !== null);
    const names = new Set(files.map(f => f.dest));
    const mandatory = ['invoice.html', 'css/site_css/base/style.css', 'js/site_js/core/firebase.js',
        'favicon.ico', 'site.webmanifest'];
    for (const name of mandatory) {
        if (!names.has(name)) throw new Error('Verplicht websitebestand ontbreekt in GitHub: ' + name);
    }
    if (new Set(files.map(f => f.dest)).size !== files.length) {
        throw new Error('Dubbele uitvoerbestanden gevonden. Export gestopt.');
    }
    const rawBase = 'https://raw.githubusercontent.com/' + GIPFEL_SOURCE_REPOSITORY + '/' + commitSha + '/';
    return {files, rawBase};
}

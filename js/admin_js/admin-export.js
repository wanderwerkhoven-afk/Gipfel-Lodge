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

        // 2. Laad alle standaard vertalingen lokaal in
        await loadAllTranslations();
        
        // Samenvoegen met Firebase overrides
        const finalTranslations = { nl: {}, de: {}, en: {} };
        ['nl', 'de', 'en'].forEach(lang => {
            finalTranslations[lang] = { 
                ...(window.gipfelTranslations?.[lang] || {}), 
                ...(textOverrides[lang] || {}) 
            };
        });

        // 3. Haal bestandslijst op via site-manifest.json
        statusDiv.innerText = 'Bestandsmanifest ophalen...';
        const sgBase = getSitegroundBase();

        const manifestResp = await fetch(sgBase + 'js/site-manifest.json?v=' + Date.now()).catch(() => null);
        if (!manifestResp || !manifestResp.ok) {
            throw new Error('Kon site-manifest.json niet ophalen. Voer eerst "npm run build:siteground" uit in de terminal.');
        }
        const fileList = await manifestResp.json();
        progressFill.style.width = '15%';

        // 4. Kopieer alle statische bestanden (behalve index.html) naar ZIP
        statusDiv.innerText = 'Bestanden kopiëren naar ZIP...';
        let copied = 0;
        const batchSize = 8;

        for (let i = 0; i < fileList.length; i += batchSize) {
            const batch = fileList.slice(i, i + batchSize);
            await Promise.all(batch.map(async (filePath) => {
                if (filePath === 'index.html') return; // Slaan we over, wordt index.php
                try {
                    const resp = await fetch(sgBase + filePath + '?v=' + Date.now());
                    if (resp.ok) {
                        const blob = await resp.blob();
                        zip.file(filePath, blob);
                    }
                } catch (e) {
                    console.warn('[export] Kon niet kopiëren:', filePath, e);
                }
                copied++;
            }));
            progressFill.style.width = (15 + (copied / fileList.length * 45)) + '%';
        }

        // 5. Haal index.html op als sjabloon
        statusDiv.innerText = 'HTML omzetten naar PHP...';
        const indexResp = await fetch(sgBase + 'index.html?v=' + Date.now()).catch(() => null);
        if (!indexResp || !indexResp.ok) throw new Error('Kon index.html niet ophalen vanuit siteground_upload/');
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

        // data-i18n elementen
        docEl.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const phpCode = `<?= htmlspecialchars($t[$lang]['${key}'] ?? '${key}') ?>`;
            const placeholder = `__PHP_TAG_${phpCounter++}__`;
            phpMap[placeholder] = phpCode;
            
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.setAttribute('placeholder', placeholder);
                el.removeAttribute('data-i18n');
            } else if (el.hasAttribute('title')) {
                el.setAttribute('title', placeholder);
                el.removeAttribute('data-i18n');
            } else {
                el.innerHTML = placeholder;
                el.removeAttribute('data-i18n');
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
                    return `<div class="lodge-strip-item"><img src="${src}" alt="${alt}" loading="lazy"></div>`;
                }).join('');

            } else if (zoneKey === 'lodge_gallery') {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAltPlaceholder(item, src);
                    return `<div class="masonry-item reveal"><img src="${src}" alt="${alt}" loading="lazy"><div class="masonry-overlay"><span>${alt}</span></div></div>`;
                }).join('');

            } else {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAltPlaceholder(item, src);
                    return src ? `<div class="gallery-item"><img src="${src}" alt="${alt}" loading="lazy"></div>` : '';
                }).join('');
            }
            imagesReplaced++;
            el.removeAttribute('data-gallery-zone');
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

        // 8. ZIP genereren & downloaden
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

function loadAllTranslations() {
    return new Promise((resolve) => {
        // Check if a key from the last file (booking) exists
        if (window.gipfelTranslations && window.gipfelTranslations['nl'] && window.gipfelTranslations['nl']['book-title']) {
            resolve(); return;
        }
        const sgBase = getSitegroundBase();
        const scripts = [
            'js/site_js/i18n/i18n_core.js',
            'js/site_js/i18n/i18n_global.js',
            'js/site_js/i18n/i18n_home.js',
            'js/site_js/i18n/i18n_lodge.js',
            'js/site_js/i18n/i18n_activities.js',
            'js/site_js/i18n/i18n_enjoyment.js',
            'js/site_js/i18n/i18n_booking.js'
        ];
        let loaded = 0;
        scripts.forEach(src => {
            const s = document.createElement('script');
            s.src = sgBase + src;
            s.onload = () => { loaded++; if (loaded === scripts.length) resolve(); };
            s.onerror = () => { console.error('Kon script niet laden:', src); loaded++; if (loaded === scripts.length) resolve(); };
            document.head.appendChild(s);
        });
    });
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

// admin-export.js
// Statische export: bouwt een volledige ZIP gelijk aan siteground_upload/
// maar met alle HTML-bestanden per taal/route al ingevuld met teksten & afbeeldingen.

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
        // 1. JSZip check
        if (typeof JSZip === 'undefined') throw new Error('JSZip is niet geladen!');
        const zip = new JSZip();

        // 2. Firebase data ophalen
        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
        const [galleriesSnap, translationsSnap] = await Promise.all([
            getDoc(doc(db, 'settings', 'galleries')),
            getDoc(doc(db, 'settings', 'translations'))
        ]);
        const galleryZones  = galleriesSnap.exists()    ? (galleriesSnap.data().zones || {}) : {};
        const textOverrides = translationsSnap.exists() ? translationsSnap.data()            : {};
        progressFill.style.width = '5%';

        // 3. Vertalingen laden en mergen met Firebase overrides
        statusDiv.innerText = 'Vertalingen laden...';
        await loadAllTranslations();
        for (const lang of ['nl', 'de', 'en']) {
            if (textOverrides[lang]) Object.assign(window.gipfelTranslations[lang], textOverrides[lang]);
        }
        progressFill.style.width = '10%';

        // 4. Lees het site-manifest (staat in js/site-manifest.json naast de admin)
        statusDiv.innerText = 'Bestandsmanifest ophalen...';
        const manifestResp = await fetch('js/site-manifest.json').catch(() => null);
        if (!manifestResp || !manifestResp.ok) throw new Error('Kon site-manifest.json niet ophalen. Voer eerst npm run build:siteground uit.');
        const fileList = await manifestResp.json();
        progressFill.style.width = '15%';

        // 5. Bepaal de base URL van siteground_upload (sibling van beheer/)
        const sgBase = getSitegroundBase();
        statusDiv.innerText = `Bestanden kopiëren (${fileList.length} bestanden)...`;
        let copied = 0;
        const batchSize = 10; // parallel downloads per batch

        for (let i = 0; i < fileList.length; i += batchSize) {
            const batch = fileList.slice(i, i + batchSize);
            await Promise.all(batch.map(async (filePath) => {
                try {
                    const url = sgBase + filePath;
                    const resp = await fetch(url);
                    if (resp.ok) {
                        const blob = await resp.blob();
                        zip.file(filePath, blob);
                    }
                } catch (e) {
                    console.warn('[export] Kon niet kopiëren:', filePath, e);
                }
                copied++;
            }));
            progressFill.style.width = (15 + (copied / fileList.length * 35)) + '%';
        }

        // 6. Haal de originele index.html op als sjabloon
        statusDiv.innerText = 'HTML sjabloon ophalen...';
        let indexResp = await fetch(sgBase + 'index.html').catch(() => null);
        if (!indexResp || !indexResp.ok) throw new Error('Kon index.html niet ophalen');
        const rawHtml = await indexResp.text();
        progressFill.style.width = '55%';

        // 7. Genereer HTML per taal/route
        statusDiv.innerText = 'Pagina\'s genereren per taal...';
        const languages = ['de', 'nl', 'en'];
        const routes = ['home', 'lodge', 'activities', 'enjoyment', 'booking'];
        const parser = new DOMParser();
        let generatedCount = 0;
        const totalCount = languages.length * routes.length;

        for (const lang of languages) {
            for (const route of routes) {
                const doc = parser.parseFromString(rawHtml, 'text/html');

                // Lang attribuut
                doc.documentElement.lang = lang;

                // Meta tags (title, description, hreflang)
                updateMetaTags(doc, lang, route);

                // base href zodat relatieve paden werken vanuit submappen
                let head = doc.querySelector('head');
                if (!head.querySelector('base')) {
                    const baseEl = doc.createElement('base');
                    baseEl.href = '/';
                    head.insertBefore(baseEl, head.firstChild);
                }

                // i18n teksten injecteren
                doc.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    const text = (textOverrides[lang]?.[key])
                        || window.gipfelTranslations[lang]?.[key]
                        || (textOverrides['en']?.[key])
                        || window.gipfelTranslations['en']?.[key]
                        || key;
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = text;
                    } else if (el.hasAttribute('title')) {
                        el.title = text;
                    } else {
                        el.innerHTML = text;
                    }
                });

                // Afbeeldingen injecteren (single images via data-img-key)
                doc.querySelectorAll('[data-img-key]').forEach(el => {
                    const key = el.getAttribute('data-img-key');
                    if (galleryZones[key] && galleryZones[key].length > 0) {
                        const item = galleryZones[key][0];
                        const url = typeof item === 'string' ? item : (item.src || '');
                        const alt = (item && typeof item === 'object' && item.alt)
                            ? (item.alt[lang] || item.alt.nl || item.alt.en || '')
                            : '';
                        if (el.tagName === 'IMG') {
                            if (url) el.src = url;
                            if (alt) el.alt = alt;
                        } else if (url) {
                            el.style.backgroundImage = `url('${url}')`;
                        }
                    }
                });

                // Gallerij zones injecteren (data-gallery-zone)
                doc.querySelectorAll('[data-gallery-zone]').forEach(el => {
                    const zoneKey = el.getAttribute('data-gallery-zone');
                    const items = galleryZones[zoneKey];
                    if (items && items.length > 0) {
                        // Render als <img> elementen in het carousel/grid element
                        el.innerHTML = items.map(item => {
                            const src = typeof item === 'string' ? item : (item.src || '');
                            const alt = (item && typeof item === 'object' && item.alt)
                                ? (item.alt[lang] || item.alt.nl || '')
                                : '';
                            return src ? `<img src="${src}" alt="${alt}" loading="lazy">` : '';
                        }).join('');
                    }
                });

                // Actieve route instellen, anderen verbergen
                doc.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
                const activeView = doc.getElementById(route);
                if (activeView) activeView.classList.add('active');

                // i18n/router scripts verwijderen (niet nodig in statische versie)
                doc.querySelectorAll('script[src]').forEach(script => {
                    const src = script.getAttribute('src');
                    if (src && (src.includes('router.js') || src.includes('i18n_') || src.includes('i18n.js'))) {
                        script.remove();
                    }
                });

                const finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
                const filePath = getRoutePath(lang, route);
                zip.file(filePath, finalHtml);

                generatedCount++;
                progressFill.style.width = (55 + (generatedCount / totalCount * 35)) + '%';
            }
        }

        // 8. ZIP genereren & downloaden
        statusDiv.innerText = 'ZIP inpakken...';
        progressFill.style.width = '95%';
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

        progressFill.style.width = '100%';
        statusDiv.innerText = '✅ Klaar! Download start automatisch.';
        statusDiv.style.color = '#10b981';

        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `gipfellodge-static-export-${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            btn.disabled = false;
            progressWrap.style.display = 'none';
        }, 4000);

    } catch (error) {
        console.error('Export mislukt:', error);
        statusDiv.innerText = 'Fout bij exporteren: ' + error.message;
        statusDiv.style.color = '#ef4444';
        btn.disabled = false;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Bereken de absolute base URL van de siteground_upload/ map.
 * Beheer draait altijd naast siteground_upload/ als sibling.
 *
 * Lokaal (VS Code Live Server):
 *   Admin: http://127.0.0.1:5500/beheer/admin.html
 *   SG:    http://127.0.0.1:5500/siteground_upload/
 *
 * GitHub Pages:
 *   Admin: https://user.github.io/Repo/beheer/
 *   SG:    https://user.github.io/Repo/siteground_upload/
 */
function getSitegroundBase() {
    const loc = window.location;
    // Verwijder /beheer/ segment en plak /siteground_upload/ eraan
    const beforeBeheer = loc.href.replace(/\/beheer(\/[^?#]*)?([?#].*)?$/, '/');
    return beforeBeheer + 'siteground_upload/';
}

/**
 * @deprecated Gebruik getSitegroundBase() voor bestandspaden
 */
function getBaseUrl() {
    return getSitegroundBase();
}

function resolveUrl(base, path) {
    return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

function getRoutePath(lang, route) {
    let path = '';
    if (lang !== 'de') path += lang + '/';

    if (route === 'home') return path + 'index.html';

    if (lang === 'de') {
        if (route === 'lodge')      path += 'lodge/';
        if (route === 'activities') path += 'aktivitaeten/';
        if (route === 'enjoyment')  path += 'geniessen/';
        if (route === 'booking')    path += 'buchen/';
    } else if (lang === 'nl') {
        if (route === 'lodge')      path += 'lodge/';
        if (route === 'activities') path += 'activiteiten/';
        if (route === 'enjoyment')  path += 'genieten/';
        if (route === 'booking')    path += 'boeken/';
    } else if (lang === 'en') {
        if (route === 'lodge')      path += 'lodge/';
        if (route === 'activities') path += 'activities/';
        if (route === 'enjoyment')  path += 'enjoy/';
        if (route === 'booking')    path += 'book/';
    }
    return path + 'index.html';
}

function loadAllTranslations() {
    return new Promise((resolve) => {
        if (window.gipfelTranslations && window.gipfelTranslations['nl']) {
            resolve(); return;
        }
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
            s.src = src;
            s.onload = () => { loaded++; if (loaded === scripts.length) resolve(); };
            s.onerror = () => { console.error('Kon script niet laden:', src); loaded++; if (loaded === scripts.length) resolve(); };
            document.head.appendChild(s);
        });
    });
}

function updateMetaTags(doc, lang, route) {
    const titles = {
        de: { home: 'Gipfel Lodge | Alpiner Luxus & Raum', lodge: 'Die Lodge | Gipfel Lodge Eben im Pongau', activities: 'Aktivitäten | Ski Amadé & Sommer Alpen', enjoyment: 'Genießen | Gipfel Lodge', booking: 'Buchen | Gipfel Lodge' },
        nl: { home: 'Gipfel Lodge | Alpiner Luxus & Raum', lodge: 'De Lodge | Gipfel Lodge Eben im Pongau', activities: 'Activiteiten | Ski Amadé & Zomer Alpen', enjoyment: 'Genieten | Gipfel Lodge', booking: 'Boeken | Gipfel Lodge' },
        en: { home: 'Gipfel Lodge | Alpine Luxury & Space', lodge: 'The Lodge | Gipfel Lodge Eben im Pongau', activities: 'Activities | Ski Amadé & Summer Alps', enjoyment: 'Enjoy | Gipfel Lodge', booking: 'Book | Gipfel Lodge' }
    };
    const titleEl = doc.querySelector('title');
    if (titleEl) titleEl.textContent = titles[lang]?.[route] || 'Gipfel Lodge';
}

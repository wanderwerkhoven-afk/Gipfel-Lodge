// admin-export.js
// Statische export: bouwt een volledige ZIP die 1-op-1 overeenkomt met
// siteground_upload/ maar met afbeeldingen en teksten al statisch ingevuld
// vanuit Firebase. Geen aparte taalsubmappen — zelfde structuur als productie.

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
        progressFill.style.width = '10%';
        statusDiv.innerText = `Firebase: ${Object.keys(galleryZones).length} afbeeldingszones, tekst-overrides voor ${Object.keys(textOverrides).length} talen geladen.`;

        // 3. Haal bestandslijst op via site-manifest.json
        statusDiv.innerText = 'Bestandsmanifest ophalen...';
        const sgBase = getSitegroundBase();

        const manifestResp = await fetch(sgBase + 'js/site-manifest.json?v=' + Date.now()).catch(() => null);
        if (!manifestResp || !manifestResp.ok) {
            throw new Error('Kon site-manifest.json niet ophalen. Voer eerst "npm run build:siteground" uit in de terminal.');
        }
        const fileList = await manifestResp.json();
        progressFill.style.width = '15%';
        statusDiv.innerText = `Bestandslijst geladen: ${fileList.length} bestanden te kopiëren.`;

        // 4. Kopieer alle statische bestanden (CSS, JS, assets, etc.) naar ZIP
        // index.html wordt apart verwerkt en toegevoegd
        statusDiv.innerText = 'Bestanden kopiëren naar ZIP...';
        let copied = 0;
        const batchSize = 8;

        for (let i = 0; i < fileList.length; i += batchSize) {
            const batch = fileList.slice(i, i + batchSize);
            await Promise.all(batch.map(async (filePath) => {
                try {
                    const resp = await fetch(sgBase + filePath + '?v=' + Date.now());
                    if (resp.ok) {
                        const blob = await resp.blob();
                        zip.file(filePath, blob);
                    } else {
                        console.warn('[export] HTTP', resp.status, 'voor:', filePath);
                    }
                } catch (e) {
                    console.warn('[export] Kon niet kopiëren:', filePath, e);
                }
                copied++;
            }));
            const pct = 15 + (copied / fileList.length * 45);
            progressFill.style.width = pct + '%';
            statusDiv.innerText = `Bestanden kopiëren: ${copied} / ${fileList.length}`;
        }

        // 5. Haal index.html op als sjabloon
        statusDiv.innerText = 'HTML statisch invullen...';
        const indexResp = await fetch(sgBase + 'index.html?v=' + Date.now()).catch(() => null);
        if (!indexResp || !indexResp.ok) throw new Error('Kon index.html niet ophalen vanuit siteground_upload/');
        const rawHtml = await indexResp.text();
        progressFill.style.width = '65%';

        // 6. Parse HTML en inject Firebase-content statisch
        const parser = new DOMParser();
        const docEl = parser.parseFromString(rawHtml, 'text/html');

        // ── 6a. Tekst-overrides inbakken als inline script ──────────────────────
        // Wordt door i18n.js opgepikt vóór de Firebase-aanroep
        if (Object.keys(textOverrides).length > 0) {
            const inlineScript = docEl.createElement('script');
            inlineScript.id = 'gipfel-static-overrides';
            inlineScript.textContent =
                `/* Statisch ingebakken tekst-overrides vanuit Firebase (gegenereerd op ${new Date().toISOString()}) */\n` +
                `window.__GIPFEL_TEXT_OVERRIDES__ = ${JSON.stringify(textOverrides, null, 2)};`;
            // Voeg toe als allereerste script in <head> zodat i18n het vindt
            const firstScript = docEl.head.querySelector('script');
            if (firstScript) {
                docEl.head.insertBefore(inlineScript, firstScript);
            } else {
                docEl.head.appendChild(inlineScript);
            }
        }

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
                    const alt = item?.alt?.nl || item?.alt?.de || item?.alt?.en || '';
                    if (alt) el.setAttribute('alt', alt);
                } else {
                    // background-image div
                    el.style.backgroundImage = `url('${url}')`;
                }
                imagesReplaced++;
            }
        });

        // ── 6c. Gallery zones: vervang data-gallery-zone direct in de HTML ──────
        docEl.querySelectorAll('[data-gallery-zone]').forEach(el => {
            const zoneKey = el.getAttribute('data-gallery-zone');
            const items = galleryZones[zoneKey];
            if (!items || items.length === 0) return;

            const getAlt = (item, fallbackSrc) => {
                if (item?.alt?.nl) return item.alt.nl;
                if (item?.alt?.de) return item.alt.de;
                if (item?.alt?.en) return item.alt.en;
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
                    const alt = getAlt(item, src);
                    return `<img src="${src}" alt="${alt}"${i === 0 ? ' class="active"' : ''}>`;
                }).join('') + prevBtn + nextBtn;

            } else if (zoneKey === 'lodge_top_carousel') {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAlt(item, src);
                    return `<div class="lodge-strip-item"><img src="${src}" alt="${alt}" loading="lazy"></div>`;
                }).join('');

            } else if (zoneKey === 'lodge_gallery') {
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAlt(item, src);
                    return `<div class="masonry-item reveal"><img src="${src}" alt="${alt}" loading="lazy"><div class="masonry-overlay"><span>${alt}</span></div></div>`;
                }).join('');

            } else {
                // Generieke gallerij-zone
                el.innerHTML = items.map(item => {
                    const src = typeof item === 'string' ? item : (item.src || '');
                    const alt = getAlt(item, src);
                    return src ? `<div class="gallery-item"><img src="${src}" alt="${alt}" loading="lazy"></div>` : '';
                }).join('');
            }
            imagesReplaced++;
        });

        // ── 6d. Verwijder Firebase-afhankelijke laadscripts ──────────────────────
        // single-image-loader en gallery-loader zijn niet meer nodig
        // i18n.js wordt BEWAARD maar opgepikt via __GIPFEL_TEXT_OVERRIDES__
        const removedScripts = [];
        docEl.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src') || '';
            if (src.includes('single-image-loader.js') || src.includes('gallery-loader.js')) {
                removedScripts.push(src);
                script.remove();
            }
        });

        progressFill.style.width = '85%';
        statusDiv.innerText = `HTML verwerkt: ${imagesReplaced} afbeeldingszones ingevuld, ${removedScripts.length} Firebase-laadscripts verwijderd.`;

        // 7. Voeg de verwerkte index.html toe aan de ZIP
        const finalHtml = '<!DOCTYPE html>\n' + docEl.documentElement.outerHTML;
        zip.file('index.html', finalHtml);

        // 8. ZIP genereren & downloaden
        statusDiv.innerText = 'ZIP inpakken en comprimeren...';
        progressFill.style.width = '95%';
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        progressFill.style.width = '100%';
        statusDiv.innerText = `✅ Klaar! ZIP bevat siteground_upload structuur met ${imagesReplaced} statische afbeeldingen en ingebakken teksten.`;
        statusDiv.style.color = '#10b981';

        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `gipfellodge-export-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Loggen
        if (window.logActivity) {
            window.logActivity('Website export', `Statische export gegenereerd met ${imagesReplaced} afbeeldingen en tekst-overrides voor ${Object.keys(textOverrides).length} talen.`, 'website');
        }

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
    let pathname = loc.pathname;

    let base = pathname.substring(0, pathname.lastIndexOf('/') + 1);

    if (base.endsWith('/beheer/')) {
        base = base.substring(0, base.length - 'beheer/'.length);
    } else if (pathname.endsWith('/admin')) {
        base = pathname.substring(0, pathname.length - 'admin'.length);
    }

    return loc.origin + base + 'siteground_upload/';
}

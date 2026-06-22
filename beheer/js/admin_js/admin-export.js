// admin-export.js

async function startStaticExport() {
    const btn = document.getElementById('btn-run-export');
    const statusDiv = document.getElementById('export-status');
    const progressWrap = document.getElementById('export-progress-bar');
    const progressFill = document.getElementById('export-progress-fill');

    btn.disabled = true;
    statusDiv.style.display = 'block';
    progressWrap.style.display = 'block';
    progressFill.style.width = '0%';
    statusDiv.innerText = 'Scripts en content laden...';

    try {
        // 1. Zorg dat we JSZip hebben
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip is niet geladen!');
        }

        // 2. Laad Firebase data (galleries + text overrides)
        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
        const [galleriesSnap, translationsSnap] = await Promise.all([
            getDoc(doc(db, 'settings', 'galleries')),
            getDoc(doc(db, 'settings', 'translations'))
        ]);
        const galleryZones = galleriesSnap.exists() ? (galleriesSnap.data().zones || {}) : {};
        const textOverrides = translationsSnap.exists() ? translationsSnap.data() : {};

        // 3. Laad alle vertalingen in admin window
        await loadAllTranslations();
        
        // Merge Firebase text overrides into gipfelTranslations
        for (const lang of ['nl', 'de', 'en']) {
            if (textOverrides[lang]) {
                Object.assign(window.gipfelTranslations[lang], textOverrides[lang]);
            }
        }
        progressFill.style.width = '20%';

        // 4. Haal de originele index.html op
        statusDiv.innerText = 'Sjabloon ophalen...';
        let response = await fetch('index.html').catch(() => null);
        if (!response || !response.ok) response = await fetch('../index.html').catch(() => null);
        if (!response || !response.ok) response = await fetch('/index.html').catch(() => null);
        if (!response || !response.ok) throw new Error('Kon index.html niet ophalen');
        const rawHtml = await response.text();
        progressFill.style.width = '40%';

        // 5. Genereer HTML per taal en per route
        statusDiv.innerText = 'Pagina\'s genereren...';
        const zip = new JSZip();
        
        const languages = ['de', 'nl', 'en'];
        const routes = ['home', 'lodge', 'activities', 'enjoyment', 'booking'];
        
        // Helper to construct directory path based on user requested structure
        const getRoutePath = (lang, route) => {
            let path = '';
            
            // Language prefix (DE is root)
            if (lang !== 'de') {
                path += lang + '/';
            }
            
            // Route name translation
            if (route === 'home') {
                return path + 'index.html'; // root of language
            }
            
            if (lang === 'de') {
                if (route === 'lodge') path += 'lodge/';
                if (route === 'activities') path += 'aktivitaeten/';
                if (route === 'enjoyment') path += 'geniessen/';
                if (route === 'booking') path += 'buchen/';
            } else if (lang === 'nl') {
                if (route === 'lodge') path += 'lodge/';
                if (route === 'activities') path += 'activiteiten/';
                if (route === 'enjoyment') path += 'genieten/';
                if (route === 'booking') path += 'boeken/';
            } else if (lang === 'en') {
                if (route === 'lodge') path += 'lodge/';
                if (route === 'activities') path += 'activities/';
                if (route === 'enjoyment') path += 'enjoy/';
                if (route === 'booking') path += 'book/';
            }
            
            return path + 'index.html';
        };

        const parser = new DOMParser();

        let generatedCount = 0;
        const totalCount = languages.length * routes.length;

        for (const lang of languages) {
            for (const route of routes) {
                const doc = parser.parseFromString(rawHtml, 'text/html');
                
                // --- 1. Stel de taal in ---
                doc.documentElement.lang = lang;
                
                // --- 2. Update de <title> en meta tags per route ---
                updateMetaTags(doc, lang, route);
                
                // --- 3. Injecteer i18n teksten (inclusief Firebase overrides) ---
                const elements = doc.querySelectorAll('[data-i18n]');
                elements.forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    // Merge order: lang override > lang default > en fallback > key
                    const text = (textOverrides[lang] && textOverrides[lang][key])
                        || window.gipfelTranslations[lang]?.[key]
                        || (textOverrides['en'] && textOverrides['en'][key])
                        || window.gipfelTranslations['en']?.[key]
                        || key;
                    
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = text;
                    } else if (el.hasAttribute('title')) {
                        el.title = text;
                    } else {
                        el.innerHTML = text; // allow HTML tags in translations
                    }
                });
                
                // --- 4. Injecteer Firebase Single Images (nu in galleryZones arrays als objecten) ---
                const imgElements = doc.querySelectorAll('[data-img-key]');
                imgElements.forEach(el => {
                    const key = el.getAttribute('data-img-key');
                    if (galleryZones[key] && galleryZones[key].length > 0) {
                        const item = galleryZones[key][0];
                        const url = typeof item === 'string' ? item : item.src;
                        const alt = (item && typeof item === 'object' && item.alt) ? (item.alt[lang] || item.alt.nl || item.alt.en || '') : '';
                        
                        if (el.tagName === 'IMG') {
                            el.src = url;
                            if (alt) el.alt = alt;
                        } else {
                            el.style.backgroundImage = `url('${url}')`;
                        }
                    }
                });

                // --- 5. Pas SPA status aan ---
                // Zet de actieve main-content op de juiste route, verberg de rest
                doc.querySelectorAll('.page-view').forEach(view => {
                    view.classList.remove('active');
                });
                const activeView = doc.getElementById(route);
                if (activeView) activeView.classList.add('active');

                // Verwijder client-side router/i18n scripts omdat dit nu statisch is
                // We keep basic JS for carousels etc.
                const scripts = doc.querySelectorAll('script');
                scripts.forEach(script => {
                    const src = script.getAttribute('src');
                    if (src && (src.includes('router.js') || src.includes('i18n_') || src.includes('i18n.js'))) {
                        script.remove();
                    }
                });
                
                // --- 6. Fix Base URL / Paths ---
                // Omdat we nu in submappen zitten (/nl/lodge/), moeten relatieve paden naar assets fixed worden.
                // Een simpele manier is om `<base href="/">` toe te voegen
                let head = doc.querySelector('head');
                if (!head.querySelector('base')) {
                    const baseEl = doc.createElement('base');
                    baseEl.href = '/';
                    head.insertBefore(baseEl, head.firstChild);
                }

                // Genereer de final HTML string
                const finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
                
                // Bepaal de filepath
                const filePath = getRoutePath(lang, route);
                zip.file(filePath, finalHtml);

                generatedCount++;
                progressFill.style.width = (40 + (generatedCount / totalCount * 40)) + '%';
            }
        }

        // 6. Voeg extra bestanden toe (robots, sitemap, htaccess)
        statusDiv.innerText = 'Systeem bestanden genereren...';
        
        zip.file('robots.txt', "User-agent: *\nAllow: /\nSitemap: https://gipfellodge.nl/sitemap.xml\n");
        
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://gipfellodge.nl/</loc></url>
  <url><loc>https://gipfellodge.nl/lodge/</loc></url>
  <url><loc>https://gipfellodge.nl/aktivitaeten/</loc></url>
  <url><loc>https://gipfellodge.nl/geniessen/</loc></url>
  <url><loc>https://gipfellodge.nl/buchen/</loc></url>
  <url><loc>https://gipfellodge.nl/nl/</loc></url>
  <url><loc>https://gipfellodge.nl/nl/lodge/</loc></url>
  <url><loc>https://gipfellodge.nl/nl/activiteiten/</loc></url>
  <url><loc>https://gipfellodge.nl/nl/genieten/</loc></url>
  <url><loc>https://gipfellodge.nl/nl/boeken/</loc></url>
  <url><loc>https://gipfellodge.nl/en/</loc></url>
  <url><loc>https://gipfellodge.nl/en/lodge/</loc></url>
  <url><loc>https://gipfellodge.nl/en/activities/</loc></url>
  <url><loc>https://gipfellodge.nl/en/enjoy/</loc></url>
  <url><loc>https://gipfellodge.nl/en/book/</loc></url>
</urlset>`;
        zip.file('sitemap.xml', sitemap);
        
        // Let op: HTACCESS met de NIeuwe folders
        const htaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
</IfModule>`;
        zip.file('.htaccess', htaccess);
        
        zip.file('README-upload-instructies.txt', "GIPFEL LODGE - STATISCHE EXPORT\n\n1. Log in op SiteGround Site Tools\n2. Ga naar File Manager -> public_html\n3. Upload de INHOUD van deze ZIP naar public_html (overschrijf bestaande bestanden)\n4. Let op: De assets map is hierin NIET overschreven. De foto's en css staan al live.\n5. Klaar! Je website is nu statisch en SEO-geoptimaliseerd.");
        
        zip.file('release.json', JSON.stringify({
            generatedAt: new Date().toISOString(),
            version: "1.0",
            type: "Static Content Export",
            languages: languages,
            routes: routes
        }, null, 2));

        // 7. Genereer ZIP
        statusDiv.innerText = 'ZIP inpakken...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        progressFill.style.width = '100%';
        statusDiv.innerText = 'Klaar! Download start automatisch.';
        statusDiv.style.color = '#10b981'; // green

        // 8. Download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `gipfellodge-content-export.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
            btn.disabled = false;
            progressWrap.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Export mislukt:', error);
        statusDiv.innerText = 'Fout bij exporteren: ' + error.message;
        statusDiv.style.color = '#ef4444'; // red
        btn.disabled = false;
    }
}

// Helpers
function loadAllTranslations() {
    return new Promise((resolve) => {
        if (window.gipfelTranslations && window.gipfelTranslations['nl']) {
            resolve(); return; // Al geladen
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
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loaded++;
                if (loaded === scripts.length) resolve();
            };
            script.onerror = () => {
                console.error('Kon script niet laden:', src);
                loaded++;
                if (loaded === scripts.length) resolve();
            };
            document.head.appendChild(script);
        });
    });
}

function updateMetaTags(doc, lang, route) {
    // Eenvoudige meta tag update (in een latere fase kan dit uit Firebase SEO instellingen komen)
    let title = "Gipfel Lodge | Alpiner Luxus & Raum";
    if (lang === 'nl') {
        if (route === 'lodge') title = "De Lodge | Gipfel Lodge Eben im Pongau";
        if (route === 'activities') title = "Activiteiten | Ski Amadé & Zomer Alpen";
        if (route === 'enjoyment') title = "Genieten | Gipfel Lodge";
        if (route === 'booking') title = "Boeken | Gipfel Lodge";
    } else if (lang === 'de') {
        if (route === 'lodge') title = "Die Lodge | Gipfel Lodge Eben im Pongau";
        if (route === 'activities') title = "Aktivitäten | Ski Amadé & Sommer Alpen";
        if (route === 'enjoyment') title = "Genießen | Gipfel Lodge";
        if (route === 'booking') title = "Buchen | Gipfel Lodge";
    } else if (lang === 'en') {
        if (route === 'lodge') title = "The Lodge | Gipfel Lodge Eben im Pongau";
        if (route === 'activities') title = "Activities | Ski Amadé & Summer Alps";
        if (route === 'enjoyment') title = "Enjoyment | Gipfel Lodge";
        if (route === 'booking') title = "Book | Gipfel Lodge";
    }
    
    const titleEl = doc.querySelector('title');
    if (titleEl) titleEl.innerText = title;
}

window.startStaticExport = startStaticExport;

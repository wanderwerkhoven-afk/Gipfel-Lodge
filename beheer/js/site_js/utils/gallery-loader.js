/**
 * gallery-loader.js
 * Gipfel Lodge - Dynamic Gallery Injector
 * Fetches gallery configuration from Firebase (settings/galleries)
 * and injects images into the hardcoded HTML containers BEFORE
 * the carousel components initialize.
 *
 * Called from index.html before the carousel scripts.
 */

(async function GalleryLoader() {

    /* ───── ZONE MAP: zoneId → container selector + inject type ───── */
    const ZONES = [
        {
            id: 'hero_slider',
            selector: '.hero-v3-carousel',
            type: 'hero'         // inject <div class="hero-v3-slide" style="background-image:...">
        },
        {
            id: 'lodge_top_carousel',
            selector: '.property-gallery .gallery-grid',
            type: 'property'     // inject <div class="gallery-item"><img src="..."></div>
        },
        {
            id: 'lodge_mini_ug',
            selector: '#lodge-mini-ug',
            type: 'mini'         // inject <img src="...">
        },
        {
            id: 'lodge_mini_1og',
            selector: '#lodge-mini-1og',
            type: 'mini'
        },
        {
            id: 'lodge_mini_2og',
            selector: '#lodge-mini-2og',
            type: 'mini'
        },
        {
            id: 'lodge_gallery',
            selector: '.masonry-gallery',
            type: 'masonry'      // inject <div class="masonry-item"> <img> <div class="masonry-overlay"> </div>
        }
    ];

    /* ───── Fetch gallery config from Firebase ───── */
    let zonesConfig = null;

    try {
        const { db, doc, getDoc } = await import('../core/firebase.js');
        const snap = await getDoc(doc(db, 'settings', 'galleries'));
        if (snap.exists()) {
            zonesConfig = snap.data().zones || {};
        }
    } catch (e) {
        console.warn('[gallery-loader] Firebase unavailable, using hardcoded defaults.', e);
        return; // Graceful fallback — keep hardcoded HTML
    }

    if (!zonesConfig) return; // Nothing configured yet — keep defaults

    /* ───── Inject each zone ───── */
    ZONES.forEach(zone => {
        const images = zonesConfig[zone.id];
        if (!images || images.length === 0) return; // Zone not configured — keep defaults

        const container = document.querySelector(zone.selector);
        if (!container) return;

        if (zone.type === 'hero') {
            injectHeroSlides(container, images);
        } else if (zone.type === 'property') {
            injectPropertyGallery(container, images);
        } else if (zone.type === 'mini') {
            injectMiniCarousel(container, images);
        } else if (zone.type === 'masonry') {
            injectMasonryGallery(container, images);
        }
    });

    /* ─────────────────────────────────────────────────────────────
       INJECTION HELPERS
       ───────────────────────────────────────────────────────────── */

    function injectHeroSlides(container, images) {
        container.innerHTML = images.map((item, i) => {
            const src = typeof item === 'string' ? item : (item.src || '');
            return `
            <div class="hero-v3-slide${i === 0 ? ' active' : ''}" style="background-image: url('${src}');"></div>
            `;
        }).join('');
    }

    function injectPropertyGallery(container, images) {
        container.innerHTML = images.map(item => {
            const src = typeof item === 'string' ? item : (item.src || '');
            const alt = (typeof item === 'object' && item.alt) ? (item.alt.nl || item.alt.en || '') : src.split('/').pop().replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
            return `<div class="gallery-item"><img src="${src}" alt="${alt}"></div>`;
        }).join('');
    }

    function injectMiniCarousel(container, images) {
        // Keep the nav buttons if present, strip only <img> tags
        const prevBtn = container.querySelector('.mini-nav.prev');
        const nextBtn = container.querySelector('.mini-nav.next');

        container.innerHTML = images.map((item, i) => {
            const src = typeof item === 'string' ? item : (item.src || '');
            const alt = (typeof item === 'object' && item.alt) ? (item.alt.nl || item.alt.en || '') : src.split('/').pop().replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
            return `<img src="${src}" alt="${alt}"${i === 0 ? ' class="active"' : ''}>`;
        }).join('');

        // Re-append nav buttons
        if (prevBtn) container.appendChild(prevBtn);
        if (nextBtn) container.appendChild(nextBtn);
    }

    function injectMasonryGallery(container, images) {
        container.innerHTML = images.map(item => {
            const src = typeof item === 'string' ? item : (item.src || '');
            const alt = (typeof item === 'object' && item.alt) ? (item.alt.nl || item.alt.en || '') : src.split('/').pop().replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
            return `
                <div class="masonry-item reveal">
                    <img src="${src}" alt="${alt}">
                    <div class="masonry-overlay"><span>${alt}</span></div>
                </div>
            `;
        }).join('');
    }

    /* Export so router can re-trigger on page switch if needed */
    window.GalleryLoader = { reload: GalleryLoader };
    
    /* Tell other scripts that new HTML is in place so they can rebind event listeners */
    document.dispatchEvent(new Event('galleriesUpdated'));

})();

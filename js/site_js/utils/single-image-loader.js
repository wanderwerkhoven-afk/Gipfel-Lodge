/**
 * single-image-loader.js
 * Gipfel Lodge - Dynamic Single Image Injector
 * Fetches single image configuration from Firebase (settings/galleries)
 * and updates src/background-image for elements with data-img-key
 */

(async function SingleImageLoader() {
    let imagesConfig = null;

    try {
        const { db, doc, getDoc } = await import('../core/firebase.js');
        const snap = await getDoc(doc(db, 'settings', 'galleries'));
        if (snap.exists()) {
            imagesConfig = snap.data().zones || {};
        }
    } catch (e) {
        console.warn('[single-image-loader] Firebase unavailable, using hardcoded defaults.', e);
        return; // Graceful fallback — keep hardcoded HTML
    }

    if (!imagesConfig || Object.keys(imagesConfig).length === 0) return; // Nothing configured yet

    // Apply images to DOM elements
    const elements = document.querySelectorAll('[data-img-key]');
    const lang = (window.i18n && window.i18n.lang) || 'nl'; // Fallback to 'nl'
    
    elements.forEach(el => {
        const key = el.getAttribute('data-img-key');
        if (imagesConfig[key] && imagesConfig[key].length > 0) {
            const item = imagesConfig[key][0]; // Extract the first item from the array
            const url = typeof item === 'string' ? item : item.src;
            const alt = (item && typeof item === 'object' && item.alt) ? (item.alt[lang] || item.alt.nl || item.alt.en || '') : '';
            
            // Check if it's an img tag
            if (el.tagName.toLowerCase() === 'img') {
                el.src = url;
                if (alt) el.alt = alt;
            } else {
                // Assume it's a background image
                el.style.backgroundImage = `url('${url}')`;
            }
        }
    });

})();

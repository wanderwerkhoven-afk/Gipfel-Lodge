/**
 * single-image-loader.js
 * Gipfel Lodge - Dynamic Single Image Injector
 * Fetches single image configuration from Firebase (settings/single_images)
 * and updates src/background-image for elements with data-img-key
 */

(async function SingleImageLoader() {
    let imagesConfig = null;

    try {
        const { db, doc, getDoc } = await import('../core/firebase.js');
        const snap = await getDoc(doc(db, 'settings', 'single_images'));
        if (snap.exists()) {
            imagesConfig = snap.data().images || {};
        }
    } catch (e) {
        console.warn('[single-image-loader] Firebase unavailable, using hardcoded defaults.', e);
        return; // Graceful fallback — keep hardcoded HTML
    }

    if (!imagesConfig || Object.keys(imagesConfig).length === 0) return; // Nothing configured yet

    // Apply images to DOM elements
    const elements = document.querySelectorAll('[data-img-key]');
    
    elements.forEach(el => {
        const key = el.getAttribute('data-img-key');
        if (imagesConfig[key]) {
            const url = imagesConfig[key];
            
            // Check if it's an img tag
            if (el.tagName.toLowerCase() === 'img') {
                el.src = url;
            } else {
                // Assume it's a background image
                el.style.backgroundImage = `url('${url}')`;
            }
        }
    });

})();

/**
 * SEO Content Loader - Gipfel Lodge
 * Retrieves SEO pages from Firestore by Document ID lookup.
 * Implements basic in-memory caching to avoid redundant requests.
 */

class SEOContentLoader {
    constructor() {
        this.cache = new Map();
        // Firebase db is usually loaded asynchronously by the time we need it,
        // or we can import it when requested.
    }

    async getDb() {
        // Dynamically import firebase if not already available globally
        if (window.db) return window.db;
        try {
            const fb = await import('../core/firebase.js');
            return fb.db;
        } catch (err) {
            console.error("Firebase not initialized yet for SEO Loader", err);
            return null;
        }
    }

    /**
     * Tries to load a page from Firestore based on marketKey and path.
     * Document ID format: {marketKey}__{slug}
     */
    async loadPage(marketKey, path) {
        if (!marketKey || !path) return null;

        const slug = path.replace(/^\//, '').trim();
        // If slug is empty, it's the home page, which is a core page.
        // We still lookup 'home' as a potential enriched SEO page.
        const effectiveSlug = slug === '' ? 'home' : slug;
        
        const docId = `${marketKey}__${effectiveSlug}`;

        // 1. Check cache
        if (this.cache.has(docId)) {
            return this.cache.get(docId);
        }

        // 2. Load from Firestore via direct Doc ID lookup
        const db = await this.getDb();
        if (!db) return null;

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
            const docRef = doc(db, "seo_pages", docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Security check on client-side (redundant if rules are tight, but good practice)
                // Superusers viewing drafts must be handled securely (e.g. via ?preview=true)
                // If it's not published, only allow if user is superuser
                const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
                const isSuperuser = window.currentUserRole === 'superuser';

                if (data.status === 'published' || (isPreview && isSuperuser)) {
                    this.cache.set(docId, data);
                    return data;
                }
            }
            
            // Mark as not found in cache to prevent repeated failed lookups
            this.cache.set(docId, null);
            return null;
        } catch (err) {
            console.error(`Error loading SEO page ${docId}:`, err);
            return null;
        }
    }
}

window.seoContentLoader = new SEOContentLoader();

import { db, collection, addDoc, serverTimestamp } from '../core/firebase.js';

/**
 * Gipfel Analytics Utility
 * Logs page views and interactions to Firestore for the admin dashboard.
 */
export const Analytics = {
    /**
     * Log a page view event.
     * @param {string} pageId - The ID of the page being visited.
     */
    async logPageView(pageId) {
        try {
            const docRef = await addDoc(collection(db, "page_views"), {
                pageId: pageId,
                timestamp: serverTimestamp(),
                url: window.location.href,
                referrer: document.referrer || 'direct',
                userAgent: navigator.userAgent,
                language: document.documentElement.lang || 'nl'
            });
            console.log(`[Analytics] Logged view for: ${pageId}`);
            return docRef;
        } catch (e) {
            console.error("[Analytics] Failed to log page view:", e);
            throw e;
        }
    }
};

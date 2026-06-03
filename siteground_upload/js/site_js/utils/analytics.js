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
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // Fetch IP address (optional, non-blocking)
            let ip = 'unknown';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                ip = ipData.ip;
            } catch(e) { console.warn("Could not fetch IP", e); }

            // Detect device type
            const ua = navigator.userAgent;
            const deviceType = /Mobi|Android|iPhone/i.test(ua) ? 'Mobiel' : 'Desktop';

            const docRef = await addDoc(collection(db, "page_views"), {
                pageId: pageId,
                timestamp: serverTimestamp(),
                url: window.location.href,
                referrer: document.referrer || 'direct',
                userAgent: ua,
                language: document.documentElement.lang || 'nl',
                isLocal: isLocal,
                ip: ip,
                deviceType: deviceType
            });
            console.log(`[Analytics] Logged view for: ${pageId} (${deviceType})`);
            return docRef;
        } catch (e) {
            console.error("[Analytics] Failed to log page view:", e);
            throw e;
        }
    }
};

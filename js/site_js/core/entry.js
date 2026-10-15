/* ENTRY POINT LOGIC - SHOW SPLASH ONCE PER LOCAL CALENDAR DAY */

(function () {
    const storageKey = 'gipfel-splash-last-shown';
    const today = () => {
        const now = new Date();
        return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    };

    let alreadyShown = false;
    try {
        alreadyShown = localStorage.getItem(storageKey) === today();
        if (!alreadyShown) localStorage.setItem(storageKey, today());
    } catch (error) {
        // Private browsing / restricted storage: fall back to the normal splash.
    }

    // Apply before the DOM is painted to prevent a flash of the splash on return visits.
    if (alreadyShown) document.documentElement.classList.add('skip-daily-splash');

    document.addEventListener('DOMContentLoaded', () => {
        const splash = document.getElementById('splash-screen');
        if (!splash) return;

        if (alreadyShown) {
            splash.remove();
            return;
        }

        // Preserve the existing cinematic first-visit animation.
        const animationDuration = 1800;
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 450);
        }, animationDuration);
    });
})();

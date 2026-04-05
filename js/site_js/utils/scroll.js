/* =========================================================
   GIPFEL LODGE - UTILITIES (SCROLL-ANIMATIONS.JS)
   ========================================================= */

const GipfelScroll = {
    observer: null,

    init() {
        console.log('Initializing Scroll Animations...');
        
        // Safety: If no IntersectionObserver (legacy), show all immediately
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal').forEach(el => {
                el.classList.add('reveal-active');
            });
            return;
        }

        // Cleanup existing observer if re-initialized
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px' // Start slightly before visible
        });

        document.querySelectorAll('.reveal').forEach(el => {
            this.observer.observe(el);
        });

        // Header Scroll Effect (only once)
        this.initHeader();
    },

    initHeader() {
        const header = document.querySelector('.topbar');
        if (!header) return;

        const handleScroll = () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };

        window.removeEventListener('scroll', handleScroll);
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
    }
};

// Global Exposure
window.GipfelScroll = GipfelScroll;

// Auto-run on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    GipfelScroll.init();
});

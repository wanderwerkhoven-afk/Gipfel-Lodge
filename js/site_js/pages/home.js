/**
 * Home Page Logic - Gipfel Lodge
 */

const HomePage = {
    init() {
        console.log('Initializing Home Page V3 (Editorial)...');
        
        // Fade gallery images in only after decoding; handle cached images too.
        document.querySelectorAll('#home-page .visual-grid-v3 img').forEach(img => {
            if (img.dataset.revealBound) return;
            img.dataset.revealBound = 'true';
            const show = () => img.classList.add('is-loaded');
            if (img.complete) show();
            else {
                img.addEventListener('load', show, { once: true });
                img.addEventListener('error', show, { once: true });
            }
        });

        // Initialize Hero
        if (window.HeroCarousel) {
            window.HeroCarousel.init();
        }

        // Listen for dynamic gallery injections
        if (!this.galleryListenerBound) {
          this.galleryListenerBound = true;
          document.addEventListener('galleriesUpdated', () => {
            if (window.HeroCarousel) {
                window.HeroCarousel.init();
            }
            if (window.GipfelScroll) window.GipfelScroll.init();
          });
        }

        // Initialize scroll reveal animations for new sections
        if (window.GipfelScroll) {
            window.GipfelScroll.init();
        }
    }
};

window.HomePage = HomePage;

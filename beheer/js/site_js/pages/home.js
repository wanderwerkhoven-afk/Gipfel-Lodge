/**
 * Home Page Logic - Gipfel Lodge
 */

const HomePage = {
    init() {
        console.log('Initializing Home Page V3 (Editorial)...');
        
        // Initialize Hero
        if (window.HeroCarousel) {
            window.HeroCarousel.init();
        }

        // Listen for dynamic gallery injections
        document.addEventListener('galleriesUpdated', () => {
            if (window.HeroCarousel) {
                window.HeroCarousel.init();
            }
            if (window.GipfelScroll) window.GipfelScroll.init();
        });

        // Initialize scroll reveal animations for new sections
        if (window.GipfelScroll) {
            window.GipfelScroll.init();
        }

        // Initialize review cards
        this.initReviews();
    },

    initReviews() {
        const updateTruncation = () => {
            document.querySelectorAll('.review-card-v3').forEach(card => {
                const p = card.querySelector('.review-text');
                if (!p) return;
                
                // Verwijder oude knop als die bestaat (zodat we niet dubbelen bij tekst updates)
                const oldBtn = card.querySelector('.review-read-more');
                if (oldBtn) oldBtn.remove();
                
                // Reset state to measure accurately
                p.classList.remove('expanded');

                requestAnimationFrame(() => {
                    const isClamped = p.scrollHeight > p.clientHeight + 2;
                    if (isClamped) {
                        const btn = document.createElement('button');
                        btn.className = 'review-read-more';
                        btn.textContent = window.i18n ? window.i18n.t('review-read-more') : 'Verder lezen';
                        btn.setAttribute('data-i18n', 'review-read-more');
                        btn.addEventListener('click', () => {
                            p.classList.add('expanded');
                            btn.style.display = 'none';
                        });
                        p.parentNode.insertBefore(btn, p.nextSibling);
                    }
                });
            });

            // Hide "Meer reviews" knop als alle extra cards leeg zijn (tekst == "-")
            const extras = document.querySelectorAll('.review-extra');
            const hasContent = Array.from(extras).some(card => {
                const p = card.querySelector('.review-text');
                return p && p.textContent.trim() !== '-' && p.textContent.trim() !== '';
            });
            const moreWrap = document.getElementById('reviews-more-wrap');
            if (moreWrap) {
                moreWrap.style.display = hasContent ? '' : 'none';
            }
        };

        // Run initially
        updateTruncation();

        // Observe text changes (e.g. from i18n / Firebase)
        const grid = document.getElementById('reviews-grid');
        if (grid) {
            const observer = new MutationObserver((mutations) => {
                // Throttle updates slightly to avoid loops during mass text replacement
                clearTimeout(this._reviewUpdateTimer);
                this._reviewUpdateTimer = setTimeout(updateTruncation, 100);
            });
            observer.observe(grid, { childList: true, characterData: true, subtree: true });
        }
    }
};

// Reveal extra reviews on button click
window.__revealExtraReviews = function(btn) {
    document.querySelectorAll('.review-extra').forEach(card => {
        card.style.display = '';
        card.classList.add('reveal', 'visible');
    });
    // Verberg de knop na klikken
    const wrap = document.getElementById('reviews-more-wrap');
    if (wrap) wrap.style.display = 'none';
    // Herinitialiseer de truncation voor nieuw zichtbare cards
    if (window.HomePage) window.HomePage.initReviews();
};

window.HomePage = HomePage;

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
        let isUpdatingReviews = false;
        // Track cards the user manually expanded — don't reset these
        const manuallyExpanded = new WeakSet();

        const updateTruncation = () => {
            isUpdatingReviews = true;
            document.querySelectorAll('.review-card-v3').forEach(card => {
                // Skip cards the user has manually expanded
                if (manuallyExpanded.has(card)) return;

                const p = card.querySelector('.review-text');
                if (!p) return;
                
                // Verwijder oude knop als die bestaat (zodat we niet dubbelen bij tekst updates)
                const oldBtn = card.querySelector('.review-read-more');
                if (oldBtn) oldBtn.remove();
                
                // Reset state to measure accurately
                p.classList.remove('expanded');
                card.classList.remove('is-expanded');

                requestAnimationFrame(() => {
                    const isClamped = p.scrollHeight > p.clientHeight + 2;
                    if (isClamped) {
                        const btn = document.createElement('button');
                        btn.className = 'review-read-more';
                        
                        const getVerderText = () => {
                            if (window.i18n && window.i18n.t('review-read-more') !== 'review-read-more') {
                                return window.i18n.t('review-read-more');
                            }
                            return 'Verder lezen';
                        };
                        
                        const getMinderText = () => {
                            if (window.i18n && window.i18n.t('review-read-less') !== 'review-read-less') {
                                return window.i18n.t('review-read-less');
                            }
                            return 'Minder lezen';
                        };

                        btn.textContent = getVerderText();
                        
                        btn.addEventListener('click', () => {
                            p.classList.toggle('expanded');
                            if (p.classList.contains('expanded')) {
                                btn.textContent = getMinderText();
                                card.classList.add('is-expanded');
                                manuallyExpanded.add(card);
                            } else {
                                btn.textContent = getVerderText();
                                card.classList.remove('is-expanded');
                                manuallyExpanded.delete(card);
                            }
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

            setTimeout(() => { isUpdatingReviews = false; }, 200);
        };

        // Run initially
        updateTruncation();

        // Observe text changes (e.g. from i18n / Firebase)
        // Only watch childList — NOT characterData, to avoid firing when button text changes
        const grid = document.getElementById('reviews-grid');
        if (grid) {
            const observer = new MutationObserver((mutations) => {
                if (isUpdatingReviews) return;
                // Only re-run if actual review text nodes were added/replaced (not button clicks)
                const isRelevant = mutations.some(m =>
                    m.type === 'childList' ||
                    (m.type === 'characterData' && m.target.parentElement && m.target.parentElement.hasAttribute('data-i18n'))
                );
                if (!isRelevant) return;
                clearTimeout(this._reviewUpdateTimer);
                this._reviewUpdateTimer = setTimeout(updateTruncation, 150);
            });
            observer.observe(grid, { childList: true, characterData: true, subtree: true });
        }
    }
};

// Reveal extra reviews on button click
window.__revealExtraReviews = function(btn) {
    document.querySelectorAll('.review-extra').forEach(card => {
        card.style.display = '';
        card.classList.remove('d-none');
        card.classList.add('reveal', 'visible');
    });
    // Verberg de knop na klikken
    const wrap = document.getElementById('reviews-more-wrap');
    if (wrap) wrap.style.display = 'none';
    // Herinitialiseer de truncation voor nieuw zichtbare cards
    if (window.HomePage) window.HomePage.initReviews();
};

window.HomePage = HomePage;

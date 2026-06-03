/**
 * Enjoyment Page Logic - Gipfel Lodge
 * Redesigned to match Activities (Seizoenen) patterns
 */

const EnjoymentPage = {
    isInitialized: false,

    init() {
        console.log('Initializing Redesigned Enjoyment Page...');
        
        if (!this.isInitialized) {
            this.initFilters();
            this.initAccordions();
            this.initScrollSpy();
            this.initCarouselDots();
            this.isInitialized = true;
        }

        // Initialize scroll reveal animations
        if (window.GipfelScroll) {
            window.GipfelScroll.init();
        }
    },

    initFilters() {
        const bar = document.getElementById('filter-enjoyment');
        const grid = document.getElementById('grid-enjoyment');
        if (!bar || !grid) return;

        const buttons = bar.querySelectorAll('.tfilter-btn');
        const cards = grid.querySelectorAll('.tcard');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filterValue = btn.getAttribute('data-filter').toLowerCase();

                cards.forEach(card => {
                    if (filterValue === 'all') {
                        card.classList.remove('hide');
                        setTimeout(() => { card.style.opacity = '1'; }, 10);
                        return;
                    }
                    
                    const categoriesAttr = card.getAttribute('data-categories');
                    if (categoriesAttr) {
                        const categories = categoriesAttr.toLowerCase().split(',');
                        if (categories.includes(filterValue)) {
                            card.classList.remove('hide');
                            setTimeout(() => { card.style.opacity = '1'; }, 10);
                        } else {
                            card.style.opacity = '0';
                            setTimeout(() => { card.classList.add('hide'); }, 400);
                        }
                    }
                });
            });
        });
    },

    initAccordions() {
        const accordions = document.querySelectorAll('#info-enjoyment .accordion-item');
        accordions.forEach(acc => {
            acc.addEventListener('click', () => {
                acc.classList.toggle('active');
                const body = acc.querySelector('.accordion-body');
                if (acc.classList.contains('active')) {
                    body.style.maxHeight = body.scrollHeight + 'px';
                } else {
                    body.style.maxHeight = '0px';
                }
                
                // Close siblings
                const parent = acc.parentElement;
                const siblings = parent.querySelectorAll('.accordion-item');
                siblings.forEach(other => {
                    if (other !== acc && other.classList.contains('active')) {
                        other.classList.remove('active');
                        other.querySelector('.accordion-body').style.maxHeight = '0px';
                    }
                });
            });
        });
    },

    initScrollSpy() {
        const subnavLinks = document.querySelectorAll('.enjoyment-subnav a');
        
        subnavLinks.forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        window.scrollTo({
                            top: targetEl.offsetTop - 140, // Account for dual header
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });

        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            const sections = document.querySelectorAll('#enjoyment-page section[id]');
            let current = '';
            
            sections.forEach(s => {
                if (scrollY >= s.offsetTop - 200) {
                    current = s.getAttribute('id');
                }
            });

            subnavLinks.forEach(l => {
                l.classList.toggle('active', l.getAttribute('href').includes(current));
            });
        });
    },

    initCarouselDots() {
        const dotsId = 'dots-culinary';
        const dotsContainer = document.getElementById(dotsId);
        if (!dotsContainer) return;

        let grid = null;
        let sibling = dotsContainer.previousElementSibling;
        while (sibling) {
            if (sibling.classList.contains('iti-grid')) { grid = sibling; break; }
            sibling = sibling.previousElementSibling;
        }
        if (!grid) return;

        const dots = dotsContainer.querySelectorAll('.iti-dot');
        const cards = grid.querySelectorAll('.iti-card');
        if (!dots.length || !cards.length) return;

        grid.addEventListener('scroll', () => {
            const cardWidth = cards[0].offsetWidth + 20;
            const index = Math.round(grid.scrollLeft / cardWidth);
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
        }, { passive: true });

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                const cardWidth = cards[0].offsetWidth + 20;
                grid.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
            });
        });
    }
};

window.EnjoymentPage = EnjoymentPage;

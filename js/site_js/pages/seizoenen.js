/**
 * Eben Seasons Master Logic - SPA Integrated
 * Handles global theme switching between Summer/Winter.
 */

window.SeasonsPage = {
    currentTheme: 'summer',
    isInitialized: false,
    animationRunning: false,

    init: function(shouldAnimate = false) {
        if (!this.isInitialized) {
            this.setupEventListeners();
            this.initUniversalFilters();
            this.initUniversalAccordions();
            this.initUniversalScrollSpy();
            this.initUniversalParallax();
            this.initCarouselDots();
            this.isInitialized = true;
        }

        // Trigger the specific "Attention-Seeker" animation if requested
        if (shouldAnimate && !this.animationRunning) {
            this.runAttentionSeekerAnimation();
        }
    },

    initCarouselDots: function() {
        this.setupDots('dots-zomer');
        this.setupDots('dots-winter');
    },

    setupDots: function(dotsId) {
        const dotsContainer = document.getElementById(dotsId);
        if (!dotsContainer) return;

        // Walk backwards through siblings to find the .iti-grid
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

        // Scroll -> update active dot
        grid.addEventListener('scroll', () => {
            const cardWidth = cards[0].offsetWidth + 20; // width + gap
            const index = Math.round(grid.scrollLeft / cardWidth);
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
        }, { passive: true });

        // Click dot -> scroll to that card
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                const cardWidth = cards[0].offsetWidth + 20;
                grid.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
            });
        });
    },

    setupEventListeners: function() {
        const switchContainer = document.getElementById('hero-season-switch');
        const optZomer = document.querySelector('.opt-zomer');
        const optWinter = document.querySelector('.opt-winter');
        
        if (!switchContainer) return;

        // Setup click listeners
        optZomer.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            this.stopAnimation();
            this.switchTheme('summer'); 
        });
        
        optWinter.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            this.stopAnimation();
            this.switchTheme('winter'); 
        });
        
        switchContainer.addEventListener('click', () => {
            this.stopAnimation();
            this.switchTheme(this.currentTheme === 'summer' ? 'winter' : 'summer');
        });
        
        const jumpActivitiesBtn = document.getElementById('btn-jump-activities');
        if (jumpActivitiesBtn) {
            jumpActivitiesBtn.onclick = () => {
                const targetId = this.currentTheme === 'summer' ? 'activities-zomer' : 'activities-winter';
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.scrollIntoView({behavior: 'smooth'});
            };
        }
    },

    switchTheme: function(targetTheme) {
        if (this.currentTheme === targetTheme) return;
        this.currentTheme = targetTheme;

        const body = document.body;
        const optZomer = document.querySelector('.opt-zomer');
        const optWinter = document.querySelector('.opt-winter');
        const viewZomer = document.getElementById('zomer-view');
        const viewWinter = document.getElementById('winter-view');
        const bgZomer = document.querySelector('.hero-bg-summer');
        const bgWinter = document.querySelector('.hero-bg-winter');
        const subZomer = document.querySelector('.sub-summer');
        const subWinter = document.querySelector('.sub-winter');

        if (targetTheme === 'summer') {
            optWinter.classList.remove('active');
            optZomer.classList.add('active');
            body.classList.remove('theme-winter');
            body.classList.add('theme-summer');
            bgWinter.classList.remove('active');
            bgZomer.classList.add('active');
            subWinter.classList.remove('active');
            subZomer.classList.add('active');
            viewWinter.classList.remove('active');
            setTimeout(() => { viewZomer.classList.add('active'); }, 50);
        } else {
            optZomer.classList.remove('active');
            optWinter.classList.add('active');
            body.classList.remove('theme-summer');
            body.classList.add('theme-winter');
            bgZomer.classList.remove('active');
            bgWinter.classList.add('active');
            subZomer.classList.remove('active');
            subWinter.classList.add('active');
            viewZomer.classList.remove('active');
            setTimeout(() => { viewWinter.classList.add('active'); }, 50);
        }

        // Scroll adjustments or other side effects
        if(window.scrollY > window.innerHeight * 0.5) {
            window.scrollTo({top: 0, behavior: 'smooth'});
        }
    },

    runAttentionSeekerAnimation: function() {
        this.animationRunning = true;
        let count = 0;
        const maxSwitches = 4; // As requested (heen en weer)
        const interval = 1500; // 1.5 seconds

        const animate = () => {
            if (!this.animationRunning || count >= maxSwitches) {
                this.animationRunning = false;
                return;
            }

            const nextTheme = this.currentTheme === 'summer' ? 'winter' : 'summer';
            this.switchTheme(nextTheme);
            count++;

            this.animationTimeout = setTimeout(animate, interval);
        };

        // Start after a short delay to ensure the page has revealed
        this.animationTimeout = setTimeout(animate, 800);
    },

    stopAnimation: function() {
        this.animationRunning = false;
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
        }
    },

    initUniversalFilters: function() {
        this.setupFilterGroup('filter-zomer', 'grid-zomer');
        this.setupFilterGroup('filter-winter', 'grid-winter');
    },

    setupFilterGroup: function(barId, gridId) {
        const bar = document.getElementById(barId);
        const grid = document.getElementById(gridId);
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

    initUniversalAccordions: function() {
        const accordions = document.querySelectorAll('.accordion-item');
        accordions.forEach(acc => {
            acc.addEventListener('click', () => {
                acc.classList.toggle('active');
                const body = acc.querySelector('.accordion-body');
                if (acc.classList.contains('active')) {
                    body.style.maxHeight = body.scrollHeight + 'px';
                } else {
                    body.style.maxHeight = '0px';
                }
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

    initUniversalScrollSpy: function() {
        const summerLinks = document.querySelectorAll('.zomer-subnav a');
        const winterLinks = document.querySelectorAll('.winter-subnav a');
        
        document.querySelectorAll('.mega-subnav a').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                const targetEl = document.getElementById(targetId);
                if(targetEl) {
                    window.scrollTo({
                        top: targetEl.offsetTop - 120,
                        behavior: 'smooth'
                    });
                }
            });
        });

        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            if (this.currentTheme === 'summer') {
                const sections = document.querySelectorAll('#zomer-view section[id]');
                let current = '';
                sections.forEach(s => {
                    if (scrollY >= s.offsetTop - 150) current = s.getAttribute('id');
                });
                summerLinks.forEach(l => {
                    l.classList.toggle('active', l.getAttribute('href').includes(current));
                });
            } else {
                const sections = document.querySelectorAll('#winter-view section[id]');
                let current = '';
                sections.forEach(s => {
                    if (scrollY >= s.offsetTop - 150) current = s.getAttribute('id');
                });
                winterLinks.forEach(l => {
                    l.classList.toggle('active', l.getAttribute('href').includes(current));
                });
            }
        });
    },

    initUniversalParallax: function() {
        const summerBg = document.querySelector('.hero-bg-summer');
        const winterBg = document.querySelector('.hero-bg-winter');
        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset;
            if (scrollY < window.innerHeight) {
                if (summerBg) summerBg.style.transform = `translateY(${scrollY * 0.4}px)`;
                if (winterBg) winterBg.style.transform = `translateY(${scrollY * 0.4}px)`;
            }
        });
    }
};


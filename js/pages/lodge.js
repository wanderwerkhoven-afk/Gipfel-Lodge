/**
 * Lodge Page Logic - Gipfel Lodge
 */

const LodgePage = {
    isInitialized: false,
    scrollContainer: null,
    galleryGrid: null,
    slideWidth: 0,
    items: [],
    cloneCount: 5,

    init() {
        console.log('Initializing Lodge Page...');
        
        // Setup features that only need one-time listeners
        if (!this.isInitialized) {
            this.setupShare();
            this.setupFavorite();
            this.setupGallery();
            this.setupMiniCarousels();
            
            // Listen for language changes to recalibrate scroll position
            document.addEventListener('languageChanged', () => {
                this.recalibrateGallery();
            });

            this.isInitialized = true;
        } else {
            // Re-run on every visit to ensure position is correct
            this.recalibrateGallery();
        }
    },

    setupShare() {
        const shareBtn = document.getElementById('sharePage');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = window.location.href;
                if (navigator.share) {
                    navigator.share({ title: document.title, url }).catch(() => {});
                } else {
                    navigator.clipboard.writeText(url).then(() => alert("Link gekopieerd!"));
                }
            });
        }
    },

    setupFavorite() {
        const favBtn = document.getElementById('toggleFavorite');
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                favBtn.classList.toggle('is-favorite');
                const heartIcon = favBtn.querySelector('svg');
                if (favBtn.classList.contains('is-favorite')) {
                    heartIcon.style.fill = '#e74c3c';
                } else {
                    heartIcon.style.fill = 'currentColor';
                }
            });
        }
    },

    setupGallery() {
        this.scrollContainer = document.querySelector('.gallery-scroll-container');
        this.galleryGrid = document.querySelector('.gallery-grid');
        const prevBtn = document.querySelector('.gallery-nav-btn.prev');
        const nextBtn = document.querySelector('.gallery-nav-btn.next');

        if (!this.scrollContainer || !this.galleryGrid) return;

        this.items = Array.from(this.galleryGrid.children);
        if (this.items.length === 0) return;

        // Clone at start
        for (let i = this.items.length - this.cloneCount; i < this.items.length; i++) {
            const clone = this.items[i].cloneNode(true);
            this.galleryGrid.insertBefore(clone, this.galleryGrid.firstChild);
        }
        
        // Clone at end
        for (let i = 0; i < this.cloneCount; i++) {
            const clone = this.items[i].cloneNode(true);
            this.galleryGrid.appendChild(clone);
        }

        // Setup scroll listener for infinite loop
        this.scrollContainer.addEventListener('scroll', () => {
            const isRTL = document.documentElement.dir === 'rtl';
            const scrollLeft = this.scrollContainer.scrollLeft;
            const maxScroll = this.galleryGrid.scrollWidth - this.scrollContainer.offsetWidth;
            const currentSlideWidth = this.items[0].offsetWidth + 12;

            if (isRTL) {
                // RTL: scrollLeft is 0 or negative
                if (Math.abs(scrollLeft) <= 1) {
                    this.scrollContainer.style.scrollBehavior = 'auto';
                    this.scrollContainer.scrollLeft = -currentSlideWidth * this.items.length;
                    setTimeout(() => this.scrollContainer.style.scrollBehavior = 'smooth', 10);
                } else if (Math.abs(scrollLeft) >= maxScroll - 1) {
                    this.scrollContainer.style.scrollBehavior = 'auto';
                    this.scrollContainer.scrollLeft = -currentSlideWidth * this.cloneCount;
                    setTimeout(() => this.scrollContainer.style.scrollBehavior = 'smooth', 10);
                }
            } else {
                // LTR: scrollLeft is 0 or positive
                if (scrollLeft <= 0) {
                    this.scrollContainer.style.scrollBehavior = 'auto';
                    this.scrollContainer.scrollLeft = currentSlideWidth * this.items.length;
                    setTimeout(() => this.scrollContainer.style.scrollBehavior = 'smooth', 10);
                } else if (scrollLeft >= maxScroll - 1) {
                    this.scrollContainer.style.scrollBehavior = 'auto';
                    this.scrollContainer.scrollLeft = currentSlideWidth * this.cloneCount;
                    setTimeout(() => this.scrollContainer.style.scrollBehavior = 'smooth', 10);
                }
            }
        });

        // Setup Nav Buttons
        if (nextBtn && prevBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                const isRTL = document.documentElement.dir === 'rtl';
                const currentSlideWidth = this.items[0].offsetWidth + 12;
                const move = isRTL ? -currentSlideWidth : currentSlideWidth;
                this.scrollContainer.scrollBy({ left: move, behavior: 'smooth' });
            };
            prevBtn.onclick = (e) => {
                e.preventDefault();
                const isRTL = document.documentElement.dir === 'rtl';
                const currentSlideWidth = this.items[0].offsetWidth + 12;
                const move = isRTL ? currentSlideWidth : -currentSlideWidth;
                this.scrollContainer.scrollBy({ left: move, behavior: 'smooth' });
            };
        }

        this.recalibrateGallery();
    },

    recalibrateGallery() {
        if (!this.scrollContainer || !this.items.length) return;

        const isRTL = document.documentElement.dir === 'rtl';
        const currentSlideWidth = this.items[0].offsetWidth + 12;
        
        this.scrollContainer.style.scrollBehavior = 'auto';
        if (isRTL) {
            this.scrollContainer.scrollLeft = -currentSlideWidth * this.cloneCount;
        } else {
            this.scrollContainer.scrollLeft = currentSlideWidth * this.cloneCount;
        }
        
        // Brief timeout to restore smooth behavior
        setTimeout(() => {
            if (this.scrollContainer) {
                this.scrollContainer.style.scrollBehavior = 'smooth';
            }
        }, 50);
    },

    setupMiniCarousels() {
        const miniCarousels = document.querySelectorAll('.mini-carousel');
        miniCarousels.forEach(carousel => {
            const slides = carousel.querySelectorAll('img');
            const prev = carousel.querySelector('.mini-nav.prev');
            const next = carousel.querySelector('.mini-nav.next');
            let currentIndex = 0;

            if (slides.length > 1 && prev && next) {
                const showSlide = (index) => {
                    slides.forEach(s => s.classList.remove('active'));
                    slides[index].classList.add('active');
                };

                prev.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                    showSlide(currentIndex);
                };

                next.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    currentIndex = (currentIndex + 1) % slides.length;
                    showSlide(currentIndex);
                };
            }
        });
    }
};

window.LodgePage = LodgePage;

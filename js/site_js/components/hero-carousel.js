const HeroCarousel = {
    carousel: null,
    slides: [],
    dots: [],
    timer: null,
    current: 0,
    intervalMs: 8000, // Slightly slower for cinematic feel
    isInitialized: false,

    init() {
        // Try V3 first, then fallback to old hero
        this.carousel = document.querySelector('.hero-v3-carousel') || document.querySelector('.hero-carousel');
        this.slides = document.querySelectorAll(this.carousel?.classList.contains('hero-v3-carousel') ? '.hero-v3-slide' : '.hero-slide');
        
        if (!this.slides.length) return;

        // Reset if already initialized
        if (this.isInitialized) {
            this.reset();
        }

        const prevBtn = document.querySelector('.hero-nav.prev');
        const nextBtn = document.querySelector('.hero-nav.next');
        const dotsContainer = document.querySelector('.hero-dots') || document.querySelector('.hero-v3-dots');

        // Create dots if container exists
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            this.slides.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.classList.add(dotsContainer.classList.contains('hero-v3-dots') ? 'hero-v3-dot' : 'hero-dot');
                if (index === 0) dot.classList.add('active');
                dot.addEventListener('click', () => this.goToSlide(index));
                dotsContainer.appendChild(dot);
            });
        }

        this.dots = document.querySelectorAll('.hero-dot, .hero-v3-dot');

        // Event Listeners
        if (nextBtn) {
            nextBtn.onclick = () => {
                this.nextSlide();
                this.resetTimer();
            };
        }
        if (prevBtn) {
            prevBtn.onclick = () => {
                this.prevSlide();
                this.resetTimer();
            };
        }

        this.startTimer();
        this.isInitialized = true;
    },

    reset() {
        if (this.timer) clearInterval(this.timer);
        this.current = 0;
        this.updateSlides();
    },

    updateSlides() {
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.current);
        });
        if (this.dots.length) {
            this.dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === this.current);
            });
        }
    },

    goToSlide(index) {
        this.current = index;
        this.updateSlides();
        this.resetTimer();
    },

    nextSlide() {
        this.current = (this.current + 1) % this.slides.length;
        this.updateSlides();
    },

    prevSlide() {
        this.current = (this.current - 1 + this.slides.length) % this.slides.length;
        this.updateSlides();
    },

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.nextSlide(), this.intervalMs);
    },

    resetTimer() {
        this.startTimer();
    }
};

window.HeroCarousel = HeroCarousel;

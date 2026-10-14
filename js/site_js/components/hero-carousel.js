const HeroCarousel = {
    carousel: null,
    slides: [],
    dots: [],
    timer: null,
    current: 0,
    intervalMs: 8000, // Slightly slower for cinematic feel
    isInitialized: false,
    warmedImages: new Set(),
    readyImages: new Map(),

    init() {
        // Try V3 first, then fallback to old hero
        this.carousel = document.querySelector('.hero-v3-carousel') || document.querySelector('.hero-carousel');
        this.slides = document.querySelectorAll(this.carousel?.classList.contains('hero-v3-carousel') ? '.hero-v3-slide' : '.hero-slide');
        
        if (!this.slides.length) return;

        // Warm the next slide in parallel with the splash, without competing
        // with the high-priority first hero image.
        this.warmSlide(1);

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

    warmSlide(index) {
        if (!this.slides.length) return;
        const slide = this.slides[(index + this.slides.length) % this.slides.length];
        if (!slide) return;
        const inlineImage = slide.querySelector('img');
        const background = inlineImage ? '' : window.getComputedStyle(slide).backgroundImage;
        const match = background && background.match(/url\(["']?(.*?)["']?\)/);
        const src = inlineImage ? inlineImage.src : (match && match[1]);
        if (!src || this.readyImages.has(src)) return;
        const image = new Image();
        image.fetchPriority = 'low';
        this.readyImages.set(src, new Promise(resolve => {
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = src;
            if (image.complete) resolve(image.naturalWidth > 0);
        }));
    },

    updateSlides() {
        this.warmSlide(this.current + 1);
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.current);
        });
        if (this.dots.length) {
            this.dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === this.current);
            });
        }
    },

    async goToSlide(index) {
        await this.showSlide(index);
        this.resetTimer();
    },

    async showSlide(index) {
        if (!this.slides.length) return;
        const target = (index + this.slides.length) % this.slides.length;
        this.warmSlide(target);
        const slide = this.slides[target];
        const inlineImage = slide.querySelector('img');
        const background = inlineImage ? '' : window.getComputedStyle(slide).backgroundImage;
        const match = background && background.match(/url\(["']?(.*?)["']?\)/);
        const src = inlineImage ? inlineImage.src : (match && match[1]);
        if (src && this.readyImages.has(src) && !(await this.readyImages.get(src))) return;
        this.current = target;
        this.updateSlides();
    },

    nextSlide() { return this.showSlide(this.current + 1); },

    prevSlide() { return this.showSlide(this.current - 1); },

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.nextSlide(), this.intervalMs);
    },

    resetTimer() {
        this.startTimer();
    }
};

window.HeroCarousel = HeroCarousel;

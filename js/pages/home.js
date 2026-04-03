/**
 * Home Page Logic - Gipfel Lodge
 */

const SuiteCarousel = {
    timer: null,
    current: 0,
    intervalMs: 5000,

    init() {
        this.slides = document.querySelectorAll('.suite-slide');
        if (!this.slides.length) return;

        const prevBtn = document.querySelector('.suite-nav.prev');
        const nextBtn = document.querySelector('.suite-nav.next');
        const dotsContainer = document.querySelector('.suite-dots');

        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            this.slides.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.classList.add('suite-dot');
                if (index === 0) dot.classList.add('active');
                dot.addEventListener('click', () => this.goToSlide(index));
                dotsContainer.appendChild(dot);
            });
            this.dots = document.querySelectorAll('.suite-dot');
        }

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
    },

    updateSlides() {
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.current);
        });
        if (this.dots && this.dots.length) {
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

const HomePage = {
    init() {
        console.log('Initializing Home Page...');
        // Initialize Hero
        if (window.HeroCarousel) {
            window.HeroCarousel.init();
        }
        // Initialize Suite Carousel
        SuiteCarousel.init();
    }
};

window.HomePage = HomePage;

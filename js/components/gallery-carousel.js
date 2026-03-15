const GalleryCarousel = {
    slides: [],
    dots: [],
    current: 0,
    isInitialized: false,

    init() {
        this.slides = document.querySelectorAll(".gallery-slide");
        if (!this.slides.length) return;

        // Reset if already initialized
        if (this.isInitialized) {
            this.current = 0;
            this.update(0);
        }

        const prevBtn = document.querySelector(".gallery-nav.prev");
        const nextBtn = document.querySelector(".gallery-nav.next");
        const dotsContainer = document.querySelector(".gallery-dots");

        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            this.slides.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.classList.add('gallery-dot');
                if (index === 0) dot.classList.add('active');
                dot.addEventListener('click', () => this.update(index));
                dotsContainer.appendChild(dot);
            });
        }

        this.dots = document.querySelectorAll('.gallery-dot');

        if (prevBtn) prevBtn.onclick = () => this.update(this.current - 1);
        if (nextBtn) nextBtn.onclick = () => this.update(this.current + 1);

        this.isInitialized = true;
    },

    update(index) {
        this.slides[this.current].classList.remove("active");
        if (this.dots.length) this.dots[this.current].classList.remove("active");
        
        this.current = (index + this.slides.length) % this.slides.length;
        
        this.slides[this.current].classList.add("active");
        if (this.dots.length) this.dots[this.current].classList.add("active");
    }
};

window.GalleryCarousel = GalleryCarousel;
// Initialization is handled by LodgePage.init() in js/pages/lodge.js

// Share logic stays global or moves to a util
document.addEventListener('click', (e) => {
    if (e.target.id === 'sharePage' || e.target.closest('#sharePage')) {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: document.title, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => alert("Link gekopieerd!"));
        }
    }
});

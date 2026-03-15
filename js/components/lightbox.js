// Lightbox functionality for gallery
const GipfelLightbox = {
  modal: null,
  image: null,
  currentSpan: null,
  totalSpan: null,
  items: [],
  currentIndex: 0,
  isInitialized: false,

  init() {
    this.modal = document.getElementById('lightboxModal');
    if (!this.modal) return;

    this.image = this.modal.querySelector('.lightbox-image');
    this.currentSpan = this.modal.querySelector('.lightbox-current');
    this.totalSpan = this.modal.querySelector('.lightbox-total');

    // Re-scan for images (handles hidden sections correctly)
    const galleryItems = document.querySelectorAll('.gallery-item img, .gallery-slide img');
    this.items = Array.from(galleryItems);
    this.totalSpan.textContent = this.items.length;

    // Attach listeners once
    if (!this.isInitialized) {
        this.attachGlobalListeners();
        this.isInitialized = true;
    }

    // Attach click listeners to parents of images
    this.items.forEach((img, index) => {
        // Clear previous listeners by replacing element (simple way) or just use onclick
        img.parentElement.onclick = (e) => {
            e.preventDefault();
            this.currentIndex = index;
            this.open();
        };
    });
  },

  attachGlobalListeners() {
    const closeBtn = this.modal.querySelector('.lightbox-close');
    const prevBtn = this.modal.querySelector('.lightbox-prev');
    const nextBtn = this.modal.querySelector('.lightbox-next');

    if (closeBtn) closeBtn.onclick = () => this.close();
    if (nextBtn) nextBtn.onclick = () => this.next();
    if (prevBtn) prevBtn.onclick = () => this.prev();

    this.modal.onclick = (e) => {
        if (e.target === this.modal) this.close();
    };

    document.addEventListener('keydown', (e) => {
        if (this.modal.classList.contains('active')) {
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
        }
    });
  },

  open() {
    const target = this.items[this.currentIndex];
    if (!target) return;
    this.image.src = target.src;
    this.image.alt = target.alt;
    this.currentSpan.textContent = this.currentIndex + 1;
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  },

  next() {
    if (!this.items.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.open();
  },

  prev() {
    if (!this.items.length) return;
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.open();
  }
};

window.GipfelLightbox = GipfelLightbox;
// Initialization is handled by reInitPageContent in js/core/router.js

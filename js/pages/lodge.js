/**
 * Lodge Page Logic - Gipfel Lodge
 */

const LodgePage = {
    init() {
        console.log('Initializing Lodge Page...');
        
        // Share functionality
        const shareBtn = document.getElementById('sharePage');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const url = window.location.href;
                if (navigator.share) {
                    navigator.share({ title: document.title, url }).catch(() => {});
                } else {
                    navigator.clipboard.writeText(url).then(() => alert("Link gekopieerd!"));
                }
            });
        }

        // Favorite toggle
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

        // Infinite Horizontal Scroll
        const scrollContainer = document.querySelector('.gallery-scroll-container');
        const galleryGrid = document.querySelector('.gallery-grid');
        const prevBtn = document.querySelector('.gallery-nav-btn.prev');
        const nextBtn = document.querySelector('.gallery-nav-btn.next');

        if (scrollContainer && galleryGrid) {
            const items = Array.from(galleryGrid.children);
            if (items.length > 0) {
                // Number of items to clone (enough to fill a view)
                const cloneCount = 5; 
                
                // Clone at start
                for (let i = items.length - cloneCount; i < items.length; i++) {
                    const clone = items[i].cloneNode(true);
                    galleryGrid.insertBefore(clone, galleryGrid.firstChild);
                }
                
                // Clone at end
                for (let i = 0; i < cloneCount; i++) {
                    const clone = items[i].cloneNode(true);
                    galleryGrid.appendChild(clone);
                }

                // Initial scroll position to the "real" first item
                const slideWidth = items[0].offsetWidth + 12; // width + gap
                scrollContainer.scrollLeft = slideWidth * cloneCount;

                scrollContainer.addEventListener('scroll', () => {
                    const scrollLeft = scrollContainer.scrollLeft;
                    const maxScroll = galleryGrid.scrollWidth - scrollContainer.offsetWidth;

                    // If we reach the start of the cloned prefix
                    if (scrollLeft <= 0) {
                        scrollContainer.style.scrollBehavior = 'auto';
                        scrollContainer.scrollLeft = slideWidth * items.length;
                        scrollContainer.style.scrollBehavior = 'smooth';
                    } 
                    // If we reach the end of the cloned suffix
                    else if (scrollLeft >= maxScroll - 1) {
                        scrollContainer.style.scrollBehavior = 'auto';
                        scrollContainer.scrollLeft = slideWidth * cloneCount;
                        scrollContainer.style.scrollBehavior = 'smooth';
                    }
                });

                if (nextBtn && prevBtn) {
                    nextBtn.onclick = () => {
                        scrollContainer.scrollBy({ left: slideWidth, behavior: 'smooth' });
                    };
                    prevBtn.onclick = () => {
                        scrollContainer.scrollBy({ left: -slideWidth, behavior: 'smooth' });
                    };
                }
            }
        }
    }
};

window.LodgePage = LodgePage;

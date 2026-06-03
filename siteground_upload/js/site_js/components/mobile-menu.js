/**
 * Mobile Menu Toggle Component
 */
document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const body = document.body;

    if (!mobileToggle || !mobileNav) return;

    const toggleMenu = () => {
        const isOpen = mobileNav.classList.contains('is-open');
        mobileNav.classList.toggle('is-open');
        
        // Update all related toggle buttons
        const toggles = document.querySelectorAll('.mobile-toggle, .topbar-dots');
        toggles.forEach(btn => btn.setAttribute('aria-expanded', !isOpen));
        
        // Prevent scrolling when menu is open
        if (!isOpen) {
            body.style.overflow = 'hidden';
            body.style.height = '100%';
            body.style.position = 'fixed';
            body.style.width = '100%';
        } else {
            body.style.overflow = '';
            body.style.height = '';
            body.style.position = '';
            body.style.width = '';
        }
    };

    const dotsToggle = document.querySelector('.topbar-dots');
    if (dotsToggle) {
        dotsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    const closeBtn = mobileNav.querySelector('.menu-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', toggleMenu);
    }

    // Close menu when clicking a link
    mobileNav.querySelectorAll('.menu-link, .menu-btn').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNav.classList.contains('is-open')) {
                toggleMenu();
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileNav.classList.contains('is-open') && !mobileNav.contains(e.target) && !mobileToggle.contains(e.target)) {
            toggleMenu();
        }
    });
});

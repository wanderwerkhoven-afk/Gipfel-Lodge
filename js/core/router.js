/**
 * SPA Router - Gipfel Lodge (Maestro Pattern)
 */

window.navigateTo = function(pageId) {
    console.log('Navigating to:', pageId);

    // 1. Update active page classes
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    const activePage = document.getElementById(pageId + '-page');
    if (activePage) {
        activePage.classList.add('active');
    }

    // 2. Update navigation link states
    const navLinks = document.querySelectorAll('.menu-link, .menu-btn');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === '#' + pageId || (pageId === 'home' && href === '#'))) {
            link.classList.add('is-active');
        } else {
            link.classList.remove('is-active');
        }
    });

    // 3. Update URL hash (without triggering hashchange if we're already handling it)
    if (window.location.hash !== '#' + pageId) {
        window.history.pushState(null, null, '#' + pageId);
    }

    // 4. Scroll to top
    window.scrollTo({ top: 0, behavior: 'auto' });

    // 5. Trigger component re-initialization
    reInitPageContent(pageId);
};

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const pageId = window.location.hash.replace('#', '') || 'home';
    window.navigateTo(pageId);
});

function reInitPageContent(pageId) {
    // Reveal animations
    if (window.RevealOnScroll) {
        window.RevealOnScroll.checkReveal();
    }

    // Page-specific module initialization
    if (pageId === 'home' && window.HomePage) {
        window.HomePage.init();
    } else if (pageId === 'lodge' && window.LodgePage) {
        window.LodgePage.init();
    }

    // Global components re-scan
    if (window.GipfelLightbox) {
        window.GipfelLightbox.init();
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    const initialPage = window.location.hash.replace('#', '') || 'home';
    window.navigateTo(initialPage);

    // Intercept clicks on links with hashes
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.hash) {
            const pageId = link.hash.replace('#', '');
            // Only handle if it's one of our SPA pages
            if (document.getElementById(pageId + '-page')) {
                e.preventDefault();
                window.navigateTo(pageId);
            }
        }
    });
});

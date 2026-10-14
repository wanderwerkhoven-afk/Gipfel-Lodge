/**
 * SPA Router - Gipfel Lodge (Maestro Pattern)
 */

const routerConfig = {
    'gipfellodge.nl': {
        'home': '/',
        'lodge': '/lodge',
        'activities': '/activiteiten',
        'enjoyment': '/genieten',
        'booking': '/booking'
    },
    'gipfellodge.de': {
        'home': '/',
        'lodge': '/lodge',
        'activities': '/aktivitaeten',
        'enjoyment': '/genuss',
        'booking': '/buchen'
    },
    'gipfellodge.at': {
        'home': '/',
        'lodge': '/lodge',
        'activities': '/aktivitaeten',
        'enjoyment': '/genuss',
        'booking': '/booking'
    },
    'gipfellodge.eu': {
        'home': '/',
        'lodge': '/lodge',
        'activities': '/activities',
        'enjoyment': '/enjoyment',
        'booking': '/booking'
    }
};

function getProjectBasePath() {
    return window.location.hostname.endsWith('.github.io') ? '/Gipfel-Lodge' : '';
}

function toPublicPath(path) {
    const base = getProjectBasePath();
    return base ? base + (path === '/' ? '/' : path) : path;
}

function stripProjectBasePath(path) {
    const base = getProjectBasePath();
    if (!base) return path;
    if (path === base || path === base + '/') return '/';
    if (path.startsWith(base + '/')) return path.slice(base.length);
    return path;
}

function getPageIdFromPath(path) {
    if (!path) return 'home';

    const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
    const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
    
    // Normalize path (remove query params, hashes, and trailing/leading slashes)
    let cleanPath = stripProjectBasePath(path.split('?')[0].split('#')[0]);
    
    // Strip trailing index.html, index, or .html extension for matching
    cleanPath = cleanPath.replace(/\/index(\.html)?$/i, '');
    cleanPath = cleanPath.replace(/\.html$/i, '');

    const normPath = '/' + cleanPath.replace(/^\/+|\/+$/g, '');
    
    // If root or empty, it's home
    if (normPath === '/' || normPath === '') {
        return 'home';
    }

    for (const [pageId, pagePath] of Object.entries(config)) {
        if (pagePath === normPath) {
            return pageId;
        }
    }

    // Also check cross-domain path matches (e.g. user opens /activiteiten on .eu domain or vice versa)
    for (const d of Object.values(routerConfig)) {
        for (const [pageId, pagePath] of Object.entries(d)) {
            if (pagePath === normPath) {
                return pageId;
            }
        }
    }
    
    return '404';
}

function updateNavigationHrefs() {
    const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
    const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
    
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const pageId = href.substring(1) || 'home';
            if (config[pageId]) {
                link.setAttribute('href', toPublicPath(config[pageId]));
            }
        }
    });
}

window.navigateTo = function(pageId) {
    console.log('Navigating to:', pageId);
    window.router.currentPageId = pageId;

    // Track analytics (Async)
    import('../utils/analytics.js').then(m => {
        m.Analytics.logPageView(pageId);
    }).catch(err => console.warn('Analytics failed to load', err));

    // Save to local storage
    if (pageId) {
        localStorage.setItem('gipfel_last_page', pageId);
    }

    // Update SEO metadata
    if (window.seoManager && typeof window.seoManager.update === 'function') {
        window.seoManager.update(pageId);
    }

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
    const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
    const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
    const activePath = config[pageId] || '/';

    const navLinks = document.querySelectorAll('.menu-link, .menu-btn, .topbar-book, .topbar-logo');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === toPublicPath(activePath) || (pageId === 'home' && href === toPublicPath('/'))) {
            link.classList.add('is-active');
        } else {
            link.classList.remove('is-active');
        }
    });

    // 3. Update URL pathname (without triggering popstate)
    if (pageId !== '404' && window.location.pathname !== toPublicPath(activePath)) {
        window.history.pushState(null, null, toPublicPath(activePath) + window.location.search);
    }

    // 4. Scroll to top
    window.scrollTo({ top: 0, behavior: 'auto' });

    // 5. Trigger component re-initialization
    reInitPageContent(pageId);
};

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    handleUrlChange();
});

function handleUrlChange() {
    const pageId = getPageIdFromPath(window.location.pathname) || '404';
    window.navigateTo(pageId);
}

// Global router state and helpers
window.router = {
    currentPageId: 'home',
    getPathForPage: function(pageId, domain) {
        const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
        return toPublicPath(config[pageId] || '/');
    },
    handleUrlChange: handleUrlChange,
    updateNavigationHrefs: updateNavigationHrefs
};

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
    } else if (pageId === 'activities' && window.SeasonsPage) {
        window.SeasonsPage.init(true);
    } else if (pageId === 'booking' && window.GipfelBooking) {
        window.GipfelBooking.init();
    } else if (pageId === 'enjoyment' && window.EnjoymentPage) {
        window.EnjoymentPage.init();
    }

    // Global components re-scan
    if (window.GipfelLightbox) {
        window.GipfelLightbox.init();
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    // 1. Rewrite all hash-based links to domain-specific clean paths
    updateNavigationHrefs();

    // 2. Load the initial page based on URL path
    const initialPage = getPageIdFromPath(window.location.pathname) || '404';
    window.navigateTo(initialPage);

    // 3. Intercept clicks on links for routing
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('#!') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
            return;
        }

        // Check if href is a hash link like #lodge
        if (href.startsWith('#')) {
            const hashPage = href.substring(1);
            if (hashPage) {
                e.preventDefault();
                window.navigateTo(hashPage);
            }
            return;
        }

        const pageId = getPageIdFromPath(link.pathname);
        if (pageId && pageId !== '404') {
            e.preventDefault();
            window.navigateTo(pageId);
        }
    });
});


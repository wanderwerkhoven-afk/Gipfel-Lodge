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

function getPageIdFromPath(path) {
    const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
    const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
    
    // Normalize path (remove leading/trailing slashes and query params/hashes)
    const cleanPath = path.split('?')[0].split('#')[0];
    const normPath = '/' + cleanPath.replace(/^\/+|\/+$/g, '');
    
    for (const [pageId, pagePath] of Object.entries(config)) {
        if (pagePath === normPath) {
            return pageId;
        }
    }
    
    // If no match found and path is empty, default to home
    if (normPath === '/' || normPath === '') {
        return 'home';
    }
    
    // For unknown paths, we'll return 'seo-landing' to trigger the loader
    return 'seo-landing';
}

function updateNavigationHrefs() {
    const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
    const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
    
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const pageId = href.substring(1) || 'home';
            if (config[pageId]) {
                link.setAttribute('href', config[pageId]);
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

    // 1. Update active page classes
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    if (pageId === 'seo-landing') {
        const landingPage = document.getElementById('seo-landing-page');
        if (landingPage) landingPage.classList.add('active');
        
        // Show loading state while fetching content
        if (window.seoPageRenderer) window.seoPageRenderer.showLoading();
        
        // Fetch content
        if (window.seoContentLoader) {
            const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
            let marketKey = 'eu';
            if (domain.endsWith('.nl')) marketKey = 'nl';
            else if (domain.endsWith('.de')) marketKey = 'de';
            else if (domain.endsWith('.at')) marketKey = 'at';
            
            window.seoContentLoader.loadPage(marketKey, window.location.pathname).then(pageData => {
                if (pageData) {
                    if (window.seoPageRenderer) window.seoPageRenderer.render(pageData);
                    if (window.seoManager) window.seoManager.updateFromFirebase(pageData);
                } else {
                    // Not found
                    landingPage.classList.remove('active');
                    const notFoundPage = document.getElementById('not-found-page');
                    if (notFoundPage) notFoundPage.classList.add('active');
                    if (window.seoManager) window.seoManager.setNotFoundSEO();
                }
            });
        }
    } else {
        const activePage = document.getElementById(pageId + '-page');
        if (activePage) {
            activePage.classList.add('active');
        }
        
        // Update SEO metadata for core pages, optionally fetching Firebase enrichment
        if (window.seoManager && typeof window.seoManager.update === 'function') {
            window.seoManager.update(pageId);
            
            // Try enrichment
            if (window.seoContentLoader) {
                const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
                let marketKey = 'eu';
                if (domain.endsWith('.nl')) marketKey = 'nl';
                else if (domain.endsWith('.de')) marketKey = 'de';
                else if (domain.endsWith('.at')) marketKey = 'at';
                
                window.seoContentLoader.loadPage(marketKey, window.location.pathname).then(pageData => {
                    if (pageData) {
                        if (window.seoPageRenderer) window.seoPageRenderer.render(pageData); // If we added an enrichment container in core pages later
                        if (window.seoManager) window.seoManager.updateFromFirebase(pageData);
                    }
                });
            }
        }
    }

    // 2. Update navigation link states
    const domain = (window.i18n && window.i18n.domain) || 'gipfellodge.eu';
    const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
    const activePath = config[pageId] || '/';

    const navLinks = document.querySelectorAll('.menu-link, .menu-btn, .topbar-book, .topbar-logo');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === activePath || (pageId === 'home' && href === '/')) {
            link.classList.add('is-active');
        } else {
            link.classList.remove('is-active');
        }
    });

    // 3. Update URL pathname (without triggering popstate)
    if (window.location.pathname !== activePath) {
        window.history.pushState(null, null, activePath + window.location.search);
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
    const pageId = getPageIdFromPath(window.location.pathname) || 'home';
    window.navigateTo(pageId);
}

// Global router state and helpers
window.router = {
    currentPageId: 'home',
    getPathForPage: function(pageId, domain) {
        const config = routerConfig[domain] || routerConfig['gipfellodge.eu'];
        return config[pageId] || '/';
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
    const initialPage = getPageIdFromPath(window.location.pathname) || 'home';
    window.navigateTo(initialPage);

    // 3. Intercept clicks on links for routing
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        // Skip absolute external links or target="_blank"
        if (link.target === '_blank' || (link.hostname && link.hostname !== window.location.hostname)) {
            return;
        }

        const pageId = getPageIdFromPath(link.pathname);
        if (pageId) {
            e.preventDefault();
            window.navigateTo(pageId);
        }
    });
});


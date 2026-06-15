/**
 * SPA Router - Gipfel Lodge (Meertalige Path-Based Router)
 */

window.navigateTo = function(pageId) {
    console.log('Navigating to:', pageId);
    window.activePageId = pageId;

    // Save to local storage
    if (pageId) {
        localStorage.setItem('gipfel_last_page', pageId);
    }

    // Track analytics (Async)
    import('../utils/analytics.js').then(m => {
        m.Analytics.logPageView(pageId);
    }).catch(err => console.warn('Analytics failed to load', err));

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
    const navLinks = document.querySelectorAll('.menu-link, .menu-btn, .topbar-logo, .topbar-book');
    const lang = window.i18n ? window.i18n.lang : 'de';
    const slug = window.gipfelPageToSlug && window.gipfelPageToSlug[lang] ? window.gipfelPageToSlug[lang][pageId] : pageId;
    const activePath = pageId === 'home' ? (lang === 'de' ? '/' : `/${lang}/`) : `/${lang}/${slug}`;

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === activePath || (pageId === 'home' && href === '/'))) {
            link.classList.add('is-active');
        } else {
            link.classList.remove('is-active');
        }
    });

    // 3. Update URL path (without triggering popstate)
    if (window.location.pathname !== activePath) {
        window.history.pushState(null, null, activePath);
    }

    // 4. Update SEO Head Metadata & Structured Data
    if (window.i18n && typeof window.i18n.updateMetadata === 'function') {
        window.i18n.updateMetadata(pageId);
    }

    // 5. Scroll to top
    window.scrollTo({ top: 0, behavior: 'auto' });

    // 6. Trigger component re-initialization
    reInitPageContent(pageId);
};

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    const route = parseCurrentPath();
    if (window.i18n && window.i18n.lang !== route.lang) {
        window.i18n.setLanguage(route.lang);
    }
    window.navigateTo(route.pageId);
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

function parseCurrentPath() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    
    let lang = 'de'; // default
    let pageId = 'home'; // default
    
    if (parts.length > 0) {
        const first = parts[0].toLowerCase();
        if (['de', 'nl', 'en'].includes(first)) {
            lang = first;
            if (parts.length > 1) {
                const slug = parts[1].toLowerCase();
                pageId = (window.gipfelSlugToPage && window.gipfelSlugToPage[slug]) || 'home';
            }
        } else {
            // No language prefix, let's try mapping slug directly
            lang = localStorage.getItem('gipfel-lang') || 'de';
            pageId = (window.gipfelSlugToPage && window.gipfelSlugToPage[first]) || 'home';
        }
    }
    
    return { lang, pageId };
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    const route = parseCurrentPath();
    
    // Ensure correct language is initialized
    if (window.i18n) {
        window.i18n.setLanguage(route.lang);
    }
    
    // Smooth transition: if url path was clean (e.g. /lodge), redirect to correct language prefix
    const slug = window.gipfelPageToSlug && window.gipfelPageToSlug[route.lang] ? window.gipfelPageToSlug[route.lang][route.pageId] : route.pageId;
    const canonicalPath = route.pageId === 'home' ? (route.lang === 'de' ? '/' : `/${route.lang}/`) : `/${route.lang}/${slug}`;
    
    if (window.location.pathname !== canonicalPath) {
        window.history.replaceState(null, null, canonicalPath);
    }

    window.navigateTo(route.pageId);

    // Intercept clicks on links for SPA routing
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href && (href.startsWith('/') || href.startsWith('http://gipfellodge.at') || href.startsWith('https://gipfellodge.at'))) {
                try {
                    const url = new URL(link.href);
                    if (url.origin === window.location.origin) {
                        const pathname = url.pathname;
                        const parts = pathname.split('/').filter(Boolean);
                        
                        let isRoute = false;
                        let targetLang = 'de';
                        let targetPageId = 'home';
                        
                        if (parts.length === 0) {
                            isRoute = true;
                        } else if (['de', 'nl', 'en'].includes(parts[0].toLowerCase())) {
                            isRoute = true;
                            targetLang = parts[0].toLowerCase();
                            if (parts.length > 1) {
                                const targetSlug = parts[1].toLowerCase();
                                targetPageId = (window.gipfelSlugToPage && window.gipfelSlugToPage[targetSlug]) || 'home';
                            }
                        }
                        
                        if (isRoute) {
                            e.preventDefault();
                            if (window.i18n && window.i18n.lang !== targetLang) {
                                window.i18n.setLanguage(targetLang);
                            }
                            window.navigateTo(targetPageId);
                        }
                    }
                } catch (err) {
                    // Let normal navigation occur if URL parsing fails
                    console.warn('URL parsing failed for link:', link.href, err);
                }
            }
        }
    });
});

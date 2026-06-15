/**
 * I18n Engine - Gipfel Lodge
 * Loads translations from window.gipfelTranslations (populated by i18n_*.js files)
 * Integrated with dynamic SEO metadata, canonicals, hreflangs and structured data.
 */

const slugToPage = {
    'umgebung': 'activities',
    'omgeving': 'activities',
    'surroundings': 'activities',
    
    'genuss': 'enjoyment',
    'genieten': 'enjoyment',
    'enjoyment': 'enjoyment',
    
    'lodge': 'lodge',
    'booking': 'booking',
    'home': 'home'
};

const pageToSlug = {
    de: {
        home: '',
        lodge: 'lodge',
        activities: 'umgebung',
        enjoyment: 'genuss',
        booking: 'booking'
    },
    nl: {
        home: '',
        lodge: 'lodge',
        activities: 'omgeving',
        enjoyment: 'genieten',
        booking: 'booking'
    },
    en: {
        home: '',
        lodge: 'lodge',
        activities: 'surroundings',
        enjoyment: 'enjoyment',
        booking: 'booking'
    }
};

const pageMetadata = {
    de: {
        home: {
            title: "Luxus Chalet in Österreich | Gipfel Lodge",
            description: "Luxuriöses Chalet für 8–10 Personen im Salzburgerland. Direkt an Ski Amadé, nahe Flachau. Sauna, Bergblick und exklusiver Komfort."
        },
        lodge: {
            title: "Ausstattung & Details | Gipfel Lodge",
            description: "Modernes Wohnkonzept op 135 m² mit 4 Schlafzimmern, 3 Bädern en suite, privatem Spa mit Sauna und voll ausgestatteter Küche nahe Flachau."
        },
        activities: {
            title: "Aktivitäten im Salzburgerland | Gipfel Lodge",
            description: "Erleben Sie Ski amadé im Winter und wunderschöne Wander- oder e-Bike-Routen im Sommer direkt rund um Eben im Pongau."
        },
        enjoyment: {
            title: "Genuss & Kulinarik | Gipfel Lodge",
            description: "Genießen Sie Brötchenservice, erlesene Weine aus dem Klimaschrank und die besten kulinarischen Empfehlungen der Region Eben / Flachau."
        },
        booking: {
            title: "Preise & Buchen | Gipfel Lodge",
            description: "Buchen Sie Ihren Aufenthalt in der Gipfel Lodge direkt online. Sehen Sie die Verfügbarkeit, Preise und Last-Minute-Angebote."
        }
    },
    nl: {
        home: {
            title: "Luxe Chalet in Oostenrijk | Gipfel Lodge",
            description: "Luxe chalet voor 8–10 personen in het Salzburgerland. Direct bij Ski Amadé, nabij Flachau. Sauna, uitzicht op de Alpen en exclusief comfort."
        },
        lodge: {
            title: "Lodge & Inrichting | Gipfel Lodge",
            description: "Verfijnd alpine design op 135 m² met 4 slaapkamers, 3 badkamers, privé spa met sauna, ruim terras en luxe woonkeuken bij Flachau."
        },
        activities: {
            title: "Omgeving & Activiteiten | Gipfel Lodge",
            description: "Skiën in Ski amadé of wandelen en e-biken in het Salzburgerland. De leukste tips voor uw zomervakantie of wintersport in Eben im Pongau."
        },
        enjoyment: {
            title: "Genieten & Culinair | Gipfel Lodge",
            description: "Ervaar de verse broodjesservice, kies een heerlijke fles uit de wijnklimaatkast en ontdek de leukste restaurants in de regio Pongau."
        },
        booking: {
            title: "Boeken & Prijzen | Gipfel Lodge",
            description: "Boek uw verblijf in de Gipfel Lodge direct online. Bekijk actuele beschikbaarheid, prijzen en automatische last-minute kortingen."
        }
    },
    en: {
        home: {
            title: "Luxury Chalet in Austria | Gipfel Lodge",
            description: "Luxury chalet for 8–10 guests in Salzburg. Near Flachau and Ski Amadé. Sauna, mountain views and premium Alpine comfort."
        },
        lodge: {
            title: "Lodge Amenities & Space | Gipfel Lodge",
            description: "135 m² luxury property featuring 4 bedrooms, 3 en-suite bathrooms, private wellness spa with sauna, balcony, and modern kitchen."
        },
        activities: {
            title: "Alpine Activities & Summer | Gipfel Lodge",
            description: "Explore 760 km of Ski amadé pistes in winter, or scenic hiking trails and mountain bike routes during summer in Eben im Pongau."
        },
        enjoyment: {
            title: "Gastronomy & Services | Gipfel Lodge",
            description: "Enjoy fresh morning bakery deliveries, premium Austrian wines from our cooling cabinet, and top local dining recommendations."
        },
        booking: {
            title: "Reservations & Pricing | Gipfel Lodge",
            description: "Book your Alpine holiday in Austria online. Check availability, seasonal rates, and special last-minute discounts."
        }
    }
};

window.gipfelSlugToPage = slugToPage;
window.gipfelPageToSlug = pageToSlug;
window.gipfelPageMetadata = pageMetadata;

class I18n {
    constructor() {
        const pathData = this.parseLanguageFromPath();
        this.lang = pathData.lang || localStorage.getItem('gipfel-lang') || 'de';
        this.init();
    }

    parseLanguageFromPath() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        if (parts.length > 0 && ['de', 'nl', 'en'].includes(parts[0].toLowerCase())) {
            return { lang: parts[0].toLowerCase() };
        }
        return { lang: null };
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setLanguage(this.lang);
            this.setupListeners();
        });
    }

    setupListeners() {
        const toggle = document.querySelector('.lang-toggle');
        const dropdown = document.querySelector('.lang-dropdown');

        if (toggle && dropdown) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('is-open');
                const isOpen = dropdown.classList.contains('is-open');
                toggle.setAttribute('aria-expanded', isOpen);
            });

            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }

        document.querySelectorAll('[data-lang-switch]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.getAttribute('data-lang-switch');
                this.setLanguage(lang);
                if (dropdown) dropdown.classList.remove('is-open');
                
                // Update URL to match selected language for the active page
                const activePage = window.activePageId || 'home';
                const slug = pageToSlug[lang][activePage];
                let newPath = `/${lang}/${slug}`;
                if (activePage === 'home') {
                    newPath = lang === 'de' ? '/' : `/${lang}/`;
                }
                if (window.location.pathname !== newPath) {
                    window.history.pushState(null, null, newPath);
                    // Trigger navigation to force re-render/metadata updates
                    if (window.navigateTo) window.navigateTo(activePage);
                }
            });
        });
    }

    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('gipfel-lang', lang);
        
        // Flag mapping (lang code -> flag icon code)
        const flagMap = {
            de: 'de',
            en: 'gb',
            nl: 'nl'
        };

        // Update document lang and dir
        document.documentElement.lang = lang;
        document.documentElement.dir = 'ltr';

        // Update active labels (Desktop & Mobile)
        document.querySelectorAll('.active-lang').forEach(el => {
            el.innerText = lang.toUpperCase();
        });

        // Update Active Flag in Topbar
        const activeFlagContainer = document.querySelector('.active-flag-container');
        if (activeFlagContainer) {
            const flagCode = flagMap[lang] || lang;
            activeFlagContainer.innerHTML = `<span class="fi fi-${flagCode}"></span>`;
        }

        // Update all translatable elements
        const translations = window.gipfelTranslations || {};
        const currentTranslations = translations[lang] || {};

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (currentTranslations[key]) {
                el.innerText = currentTranslations[key];
            }
        });

        // Update active class on language switchers
        document.querySelectorAll('[data-lang-switch]').forEach(btn => {
            if (btn.getAttribute('data-lang-switch') === lang) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });

        // Update navigation paths dynamically for search engine crawling
        this.updateNavLinks(lang);

        // Broadcast event for other scripts
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    }

    updateNavLinks(lang) {
        const links = document.querySelectorAll('.menu-link, .menu-btn, .topbar-logo, .topbar-book, a[href^="#"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Rewrite hashes or existing path links to correct path structure
            if (href.startsWith('#') && href !== '#') {
                const pageId = href.replace('#', '');
                if (pageToSlug[lang] && pageToSlug[lang][pageId] !== undefined) {
                    const slug = pageToSlug[lang][pageId];
                    const newHref = pageId === 'home' ? (lang === 'de' ? '/' : `/${lang}/`) : `/${lang}/${slug}`;
                    link.setAttribute('href', newHref);
                }
            } else if (href.startsWith('/de/') || href.startsWith('/nl/') || href.startsWith('/en/') || href === '/') {
                let pageId = null;
                const parts = href.split('/').filter(Boolean);
                const slug = parts[parts.length - 1];
                if (!slug || slug === 'de' || slug === 'nl' || slug === 'en') {
                    pageId = 'home';
                } else {
                    pageId = slugToPage[slug];
                }
                
                if (pageId && pageToSlug[lang] && pageToSlug[lang][pageId] !== undefined) {
                    const newSlug = pageToSlug[lang][pageId];
                    const newHref = pageId === 'home' ? (lang === 'de' ? '/' : `/${lang}/`) : `/${lang}/${newSlug}`;
                    link.setAttribute('href', newHref);
                }
            }
        });
    }

    updateMetadata(pageId) {
        const lang = this.lang;
        const meta = pageMetadata[lang] && pageMetadata[lang][pageId];
        if (!meta) return;

        // 1. Title
        document.title = meta.title;

        // 2. Meta description
        let descMeta = document.querySelector('meta[name="description"]');
        if (!descMeta) {
            descMeta = document.createElement('meta');
            descMeta.name = "description";
            document.head.appendChild(descMeta);
        }
        descMeta.setAttribute('content', meta.description);

        // 3. Canonical
        const slug = pageToSlug[lang][pageId];
        const canonicalUrl = pageId === 'home'
            ? (lang === 'de' ? 'https://gipfellodge.at/' : `https://gipfellodge.at/${lang}/`)
            : `https://gipfellodge.at/${lang}/${slug}`;

        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = "canonical";
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.setAttribute('href', canonicalUrl);

        // 4. Open Graph & Twitter Cards
        const ogTags = {
            'og:title': meta.title,
            'og:description': meta.description,
            'og:url': canonicalUrl,
            'og:type': 'website',
            'og:site_name': 'Gipfel Lodge',
            'twitter:title': meta.title,
            'twitter:description': meta.description
        };

        for (const [prop, val] of Object.entries(ogTags)) {
            const selector = prop.startsWith('twitter:') ? `meta[name="${prop}"]` : `meta[property="${prop}"]`;
            let metaEl = document.querySelector(selector);
            if (!metaEl) {
                metaEl = document.createElement('meta');
                if (prop.startsWith('twitter:')) {
                    metaEl.name = prop;
                } else {
                    metaEl.setAttribute('property', prop);
                }
                document.head.appendChild(metaEl);
            }
            metaEl.setAttribute('content', val);
        }

        // 5. Hreflang alternates
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

        const languages = ['de', 'nl', 'en'];
        languages.forEach(hl => {
            const hlSlug = pageToSlug[hl][pageId];
            const hlUrl = pageId === 'home'
                ? (hl === 'de' ? 'https://gipfellodge.at/' : `https://gipfellodge.at/${hl}/`)
                : `https://gipfellodge.at/${hl}/${hlSlug}`;

            const link = document.createElement('link');
            link.rel = "alternate";
            link.hreflang = hl;
            link.href = hlUrl;
            document.head.appendChild(link);
        });

        // x-default hreflang (default to German root)
        const xDefaultLink = document.createElement('link');
        xDefaultLink.rel = "alternate";
        xDefaultLink.hreflang = "x-default";
        xDefaultLink.href = "https://gipfellodge.at/";
        document.head.appendChild(xDefaultLink);

        // 6. JSON-LD Structured Data
        this.updateStructuredData(canonicalUrl, meta);
    }

    updateStructuredData(url, meta) {
        document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());

        const structuredData = {
            "@context": "https://schema.org",
            "@type": "VacationRental",
            "name": meta.title,
            "description": meta.description,
            "url": url,
            "image": [
                "https://gipfellodge.at/assets/images/pictures/winter-outside.png",
                "https://gipfellodge.at/assets/images/pictures/livingroom.png"
            ],
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "Tauernlodge 5",
                "addressLocality": "Eben im Pongau",
                "postalCode": "5531",
                "addressCountry": "AT"
            },
            "telephone": "+31624632822",
            "priceRange": "$$$",
            "numberOfRooms": 4,
            "occupancy": {
                "@type": "QuantitativeValue",
                "value": 10
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(structuredData, null, 2);
        document.head.appendChild(script);
    }

    t(key) {
        const translations = window.gipfelTranslations || {};
        return (translations[this.lang] && translations[this.lang][key]) || key;
    }
}

// Initialize I18n
const i18n = new I18n();
window.i18n = i18n; // Global access

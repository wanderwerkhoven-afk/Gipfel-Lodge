/**
 * SEO Manager - Gipfel Lodge
 * Manages document titles, meta descriptions, canonical URLs, hreflang links, Open Graph tags, and JSON-LD structured data graph.
 */

class SEOManager {
    constructor() {
        this.config = window.seoConfig || {};
        this.currentDomain = this.normalizeHostname(window.location.hostname);
        
        // Run immediately upon script execution for fastest initial metadata setup
        const initialPage = this.detectPageIdFromPath();
        this.update(initialPage);
        
        this.init();
    }

    normalizeHostname(hostname) {
        return hostname.replace(/^www\./, '');
    }

    detectPageIdFromPath() {
        const path = window.location.pathname;
        const domainCfg = this.getDomainConfig(this.currentDomain);
        if (!domainCfg) return 'home';

        const cleanPath = path.split('?')[0].split('#')[0];
        const normPath = '/' + cleanPath.replace(/^\/+|\/+$/g, '');

        for (const [pageId, page] of Object.entries(domainCfg.pages)) {
            if (page.path === normPath) {
                return pageId;
            }
        }
        return 'home';
    }

    init() {
        // Keep DOMContentLoaded listener to re-evaluate if needed once DOM is fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.runInitialSEO());
        } else {
            this.runInitialSEO();
        }
    }

    runInitialSEO() {
        const initialPage = (window.router && window.router.currentPageId) || this.detectPageIdFromPath();
        this.update(initialPage);
    }

    getDomainConfig(domain) {
        // Fallback to international .eu domain if current hostname isn't explicitly configured
        return this.config.domains[domain] || this.config.domains['gipfellodge.eu'];
    }

    update(pageId) {
        const domain = this.normalizeHostname(window.location.hostname);
        const domainCfg = this.getDomainConfig(domain);
        if (!domainCfg) return;

        const pageCfg = domainCfg.pages[pageId] || domainCfg.pages['home'];
        
        // 1. Update HTML lang attribute
        document.documentElement.lang = domainCfg.locale;

        // 2. Update Document Title
        document.title = pageCfg.title;

        // 3. Update Meta Description
        this.setMetaTag('name', 'description', pageCfg.description);

        // 4. Update Canonical Link
        const activeDomain = this.config.domains[domain] ? domain : 'gipfellodge.eu';
        const canonicalUrl = `https://${activeDomain}${pageCfg.path}`;
        this.setLinkTag('canonical', canonicalUrl);

        // 5. Update Open Graph Preview Tags
        const ogImage = `https://${activeDomain}/assets/images/og/gipfel-lodge-og.jpg`;
        this.setMetaTag('property', 'og:title', pageCfg.title);
        this.setMetaTag('property', 'og:description', pageCfg.description);
        this.setMetaTag('property', 'og:url', canonicalUrl);
        this.setMetaTag('property', 'og:image', ogImage);
        this.setMetaTag('property', 'og:image:width', '1200');
        this.setMetaTag('property', 'og:image:height', '630');
        this.setMetaTag('property', 'og:type', 'website');

        // 6. Update Twitter Card Tags
        this.setMetaTag('name', 'twitter:card', 'summary_large_image');
        this.setMetaTag('name', 'twitter:title', pageCfg.title);
        this.setMetaTag('name', 'twitter:description', pageCfg.description);
        this.setMetaTag('name', 'twitter:image', ogImage);

        // 7. Update Hreflang alternates
        this.updateHreflangTags(pageId);

        // 8. Update JSON-LD Structured Data Graph
        this.updateStructuredData(pageId, activeDomain, pageCfg, domainCfg);
    }

    setMetaTag(keyType, keyValue, contentValue) {
        let el = document.querySelector(`meta[${keyType}="${keyValue}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(keyType, keyValue);
            document.head.appendChild(el);
        }
        el.setAttribute('content', contentValue);
    }

    setLinkTag(relValue, hrefValue) {
        let el = document.querySelector(`link[rel="${relValue}"]`);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', relValue);
            document.head.appendChild(el);
        }
        el.setAttribute('href', hrefValue);
    }

    updateHreflangTags(pageId) {
        // Remove existing alternate links first to avoid duplicates or orphans
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

        // We generate hreflangs pointing to matching pages on other domains
        Object.entries(this.config.domains).forEach(([domain, config]) => {
            const page = config.pages[pageId] || config.pages['home'];
            const url = `https://${domain}${page.path}`;
            
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = config.locale;
            link.href = url;
            document.head.appendChild(link);

            // Set x-default to international .eu domain version of this page
            if (domain === 'gipfellodge.eu') {
                const xDefaultLink = document.createElement('link');
                xDefaultLink.rel = 'alternate';
                xDefaultLink.hreflang = 'x-default';
                xDefaultLink.href = url;
                document.head.appendChild(xDefaultLink);
            }
        });
    }

    updateStructuredData(pageId, domain, pageCfg, domainCfg) {
        // Remove existing structured data block
        const existingScript = document.getElementById('gipfel-seo-jsonld');
        if (existingScript) {
            existingScript.remove();
        }

        const canonicalUrl = `https://${domain}${pageCfg.path}`;
        const rootUrl = `https://${domain}/`;

        // Localized descriptions/details containing target keywords
        const localKeywords = {
            de: {
                name: 'Gipfel Lodge',
                description: 'Luxus Chalet in Eben im Pongau nahe Flachau für 8-10 Personen. Mit privater Sauna, erstklassiger Lage in Ski Amadé, 4 Schlafzimmern und anspruchsvollem Alpin-Design.',
                amenities: ['Private Sauna', 'Weinklimaschrank', 'Skiraum', 'Vollausgestattete Küche', 'Balkon & Terrasse', '2 Parkplätze']
            },
            nl: {
                name: 'Gipfel Lodge',
                description: 'Luxe chalet in Eben im Pongau nabij Flachau voor 8-10 personen. Met privé sauna, wijnklimaatkast, 4 slaapkamers en een perfecte ligging in wintersportgebied Ski Amadé.',
                amenities: ['Privé sauna', 'Wijnklimaatkast', 'Skiruimte', 'Volledig uitgeruste keuken', 'Balkon & terras', '2 parkeerplaatsen']
            },
            en: {
                name: 'Gipfel Lodge',
                description: 'Luxury chalet in Eben im Pongau near Flachau for 8-10 guests. Features 4 bedrooms, private sauna, ski room, dual-zone wine cooler, and premium alpine design.',
                amenities: ['Private sauna', 'Wine cabinet', 'Ski room', 'Fully equipped kitchen', 'Balcony & terrace', '2 parking spaces']
            }
        };

        const currentLang = domainCfg.lang;
        const keywords = localKeywords[currentLang] || localKeywords['en'];

        const graph = [
            {
                '@type': 'WebSite',
                '@id': `${rootUrl}#website`,
                'url': rootUrl,
                'name': 'Gipfel Lodge',
                'description': keywords.description,
                'inLanguage': domainCfg.locale
            },
            {
                '@type': 'WebPage',
                '@id': `${canonicalUrl}#webpage`,
                'url': canonicalUrl,
                'name': pageCfg.title,
                'isPartOf': { '@id': `${rootUrl}#website` },
                'description': pageCfg.description,
                'inLanguage': domainCfg.locale
            }
        ];

        // Add Breadcrumbs if not homepage
        if (pageId !== 'home') {
            graph.push({
                '@type': 'BreadcrumbList',
                '@id': `${canonicalUrl}#breadcrumb`,
                'itemListElement': [
                    {
                        '@type': 'ListItem',
                        'position': 1,
                        'name': currentLang === 'de' ? 'Home' : (currentLang === 'nl' ? 'Home' : 'Home'),
                        'item': rootUrl
                    },
                    {
                        '@type': 'ListItem',
                        'position': 2,
                        'name': pageId.charAt(0).toUpperCase() + pageId.slice(1),
                        'item': canonicalUrl
                    }
                ]
            });
        }

        // Add VacationRental / LodgingBusiness / TouristAccommodation
        graph.push({
            '@type': ['VacationRental', 'LodgingBusiness', 'TouristAccommodation'],
            '@id': `${rootUrl}#accommodation`,
            'name': 'Gipfel Lodge',
            'url': rootUrl,
            'image': `https://${domain}/assets/images/og/gipfel-lodge-og.jpg`,
            'description': keywords.description,
            'address': {
                '@type': 'PostalAddress',
                'addressLocality': 'Eben im Pongau',
                'addressRegion': 'Salzburgerland',
                'addressCountry': 'AT',
                'postalCode': '5531'
            },
            'geo': {
                '@type': 'GeoCoordinates',
                'latitude': '47.4189',
                'longitude': '13.3713'
            },
            'telephone': '+43000000000',
            'priceRange': '$$$$',
            'amenityFeature': keywords.amenities.map(name => ({
                '@type': 'LocationFeatureSpecification',
                'name': name,
                'value': true
            })),
            'occupancy': {
                '@type': 'QuantitativeValue',
                'maxValue': 10,
                'unitCode': 'C62'
            },
            'numberOfRooms': 4
        });

        // Insert new script tag
        const script = document.createElement('script');
        script.id = 'gipfel-seo-jsonld';
        script.type = 'application/ld+json';
        script.text = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': graph
        }, null, 2);
        
        document.head.appendChild(script);
    }

    updateFromFirebase(pageData) {
        if (!pageData) return;

        // 1. Update Document Title
        if (pageData.title) {
            document.title = pageData.title;
            this.setMetaTag('property', 'og:title', pageData.title);
            this.setMetaTag('name', 'twitter:title', pageData.title);
        }

        // 2. Update Meta Description
        if (pageData.metaDescription) {
            this.setMetaTag('name', 'description', pageData.metaDescription);
            this.setMetaTag('property', 'og:description', pageData.metaDescription);
            this.setMetaTag('name', 'twitter:description', pageData.metaDescription);
        }

        // 3. Update OG Image
        if (pageData.ogImage) {
            this.setMetaTag('property', 'og:image', pageData.ogImage);
            this.setMetaTag('name', 'twitter:image', pageData.ogImage);
        }

        // 4. Update Canonical (should be based on domain + pageData.path)
        const domain = this.normalizeHostname(window.location.hostname);
        const activeDomain = this.config.domains[domain] ? domain : 'gipfellodge.eu';
        const canonicalUrl = `https://${activeDomain}${pageData.path}`;
        this.setLinkTag('canonical', canonicalUrl);

        // 5. Update Robots
        if (pageData.noindex) {
            this.setMetaTag('name', 'robots', 'noindex, follow');
        } else {
            const el = document.querySelector('meta[name="robots"]');
            if (el) el.remove();
        }

        // 6. Custom Hreflang Translations for Landing Pages
        if (pageData.type === 'landing') {
            this.updateLandingHreflang(pageData);
        }

        // 7. Update JSON-LD for FAQ
        if (Array.isArray(pageData.faq) && pageData.faq.length > 0) {
            this.appendFAQStructuredData(pageData.faq, canonicalUrl);
        }
    }

    setNotFoundSEO() {
        document.title = '404 - Pagina niet gevonden | Gipfel Lodge';
        this.setMetaTag('name', 'robots', 'noindex, follow');
    }

    updateLandingHreflang(pageData) {
        // Remove existing alternate links
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

        if (!pageData.translations) return;

        const urlCache = {}; // keep track of added urls to avoid duplicates

        Object.entries(pageData.translations).forEach(([marketKey, path]) => {
            let configDomain = null;
            let locale = null;
            
            // Find corresponding domain
            Object.entries(this.config.domains).forEach(([domain, cfg]) => {
                if ((marketKey === 'nl' && domain.endsWith('.nl')) ||
                    (marketKey === 'de' && domain.endsWith('.de')) ||
                    (marketKey === 'at' && domain.endsWith('.at')) ||
                    (marketKey === 'eu' && domain.endsWith('.eu'))) {
                    configDomain = domain;
                    locale = cfg.locale;
                }
            });

            if (configDomain && locale) {
                const url = `https://${configDomain}${path}`;
                if (!urlCache[url]) {
                    urlCache[url] = true;
                    const link = document.createElement('link');
                    link.rel = 'alternate';
                    link.hreflang = locale;
                    link.href = url;
                    document.head.appendChild(link);

                    if (marketKey === 'eu') {
                        const xDefaultLink = document.createElement('link');
                        xDefaultLink.rel = 'alternate';
                        xDefaultLink.hreflang = 'x-default';
                        xDefaultLink.href = url;
                        document.head.appendChild(xDefaultLink);
                    }
                }
            }
        });
    }

    appendFAQStructuredData(faqItems, url) {
        const existingScript = document.getElementById('gipfel-seo-jsonld');
        if (!existingScript) return;

        try {
            const data = JSON.parse(existingScript.text);
            const faqSchema = {
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                "mainEntity": faqItems.map(item => ({
                    "@type": "Question",
                    "name": item.question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": item.answer
                    }
                }))
            };
            data['@graph'].push(faqSchema);
            existingScript.text = JSON.stringify(data, null, 2);
        } catch(e) {
            console.error("Error appending FAQ structured data", e);
        }
    }
}

// Initialize SEO Manager immediately
window.seoManager = new SEOManager();

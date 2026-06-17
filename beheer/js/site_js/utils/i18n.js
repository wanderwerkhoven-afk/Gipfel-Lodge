/**
 * I18n Engine - Gipfel Lodge
 * Loads translations from window.gipfelTranslations (populated by i18n_*.js files)
 */

const domainConfig = {
    'gipfellodge.at': { lang: 'de', locale: 'de-AT' },
    'gipfellodge.de': { lang: 'de', locale: 'de-DE' },
    'gipfellodge.nl': { lang: 'nl', locale: 'nl-NL' },
    'gipfellodge.eu': { lang: 'en', locale: 'en' }
};

const languageDomainMap = {
    nl: 'gipfellodge.nl',
    de: 'gipfellodge.de',
    en: 'gipfellodge.eu'
};

class I18n {
    constructor() {
        const config = this.detectDomainConfig();
        this.domain = config.domain;
        this.lang = config.lang;
        this.locale = config.locale;
        this.init();
    }

    detectDomainConfig() {
        const hostname = window.location.hostname;
        
        // Support local development parameters
        const params = new URLSearchParams(window.location.search);
        const debugDomain = params.get('domain');
        const debugLang = params.get('lang');
        
        const activeHost = debugDomain || hostname;
        
        for (const domain of Object.keys(domainConfig)) {
            if (activeHost.endsWith(domain)) {
                const config = domainConfig[domain];
                return {
                    domain,
                    lang: debugLang || config.lang,
                    locale: config.locale
                };
            }
        }
        
        // Fallback for localhost / local files
        const defaultLang = debugLang || localStorage.getItem('gipfel-lang') || 'nl';
        let defaultLocale = 'nl-NL';
        let defaultDomain = 'gipfellodge.nl';
        if (defaultLang === 'de') {
            defaultLocale = 'de-DE';
            defaultDomain = 'gipfellodge.de';
        } else if (defaultLang === 'en') {
            defaultLocale = 'en';
            defaultDomain = 'gipfellodge.eu';
        }
        
        return {
            domain: defaultDomain,
            lang: defaultLang,
            locale: defaultLocale
        };
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setLanguage(this.lang, false);
            this.setupListeners();
        });
    }

    setupListeners() {
        document.querySelectorAll('.lang-dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.lang-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('is-open');
                    const isOpen = dropdown.classList.contains('is-open');
                    toggle.setAttribute('aria-expanded', isOpen);
                });
            }
        });

        document.addEventListener('click', (e) => {
            document.querySelectorAll('.lang-dropdown').forEach(dropdown => {
                const toggle = dropdown.querySelector('.lang-toggle');
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('is-open');
                    if (toggle) toggle.setAttribute('aria-expanded', 'false');
                }
            });
        });

        document.querySelectorAll('[data-lang-switch]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = btn.getAttribute('data-lang-switch');
                this.setLanguage(lang, true);
                document.querySelectorAll('.lang-dropdown').forEach(d => d.classList.remove('is-open'));
            });
        });
    }

    setLanguage(lang, userTriggered = false) {
        // Redirection logic for production domains
        if (userTriggered) {
            const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
            const targetDomain = languageDomainMap[lang];
            
            if (targetDomain && !isLocal && !window.location.hostname.endsWith(targetDomain)) {
                const currentPageId = (window.router && window.router.currentPageId) || 'home';
                const targetPath = (window.router && window.router.getPathForPage(currentPageId, targetDomain)) || '/';
                window.location.href = `https://${targetDomain}${targetPath}`;
                return;
            } else if (isLocal) {
                // Local dev: update query params without reload to simulate language change
                const url = new URL(window.location.href);
                url.searchParams.set('lang', lang);
                // Also simulate domain change via param if it maps
                if (targetDomain) {
                    url.searchParams.set('domain', targetDomain);
                }
                window.history.pushState(null, '', url.toString());
                
                // Update properties in-place for simulation
                const config = this.detectDomainConfig();
                this.domain = config.domain;
                this.lang = config.lang;
                this.locale = config.locale;
                
                // Re-trigger router routing if available
                if (window.router && typeof window.router.handleUrlChange === 'function') {
                    window.router.handleUrlChange();
                }
            }
        }

        this.lang = lang;
        localStorage.setItem('gipfel-lang', lang);
        
        // Flag mapping (lang code -> flag icon code)
        const flagMap = {
            de: 'de',
            en: 'gb',
            nl: 'nl',
            fr: 'fr',
            it: 'it',
            pl: 'pl'
        };

        // Update document lang and dir
        document.documentElement.lang = lang;
        document.documentElement.dir = 'ltr';

        // Update active labels (Desktop & Mobile)
        document.querySelectorAll('.active-lang').forEach(el => {
            el.innerText = lang.toUpperCase();
        });

        // Update Active Flag in Topbar & Maintenance
        document.querySelectorAll('.active-flag-container').forEach(activeFlagContainer => {
            const flagCode = flagMap[lang] || lang;
            activeFlagContainer.innerHTML = `<span class="fi fi-${flagCode}"></span>`;
        });

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

        // Broadcast event for other scripts
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    }

    t(key) {
        const translations = window.gipfelTranslations || {};
        return (translations[this.lang] && translations[this.lang][key]) || key;
    }
}

// Initialize I18n
const i18n = new I18n();
window.i18n = i18n; // Global access

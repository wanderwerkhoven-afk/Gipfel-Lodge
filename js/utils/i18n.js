/**
 * I18n Engine - Gipfel Lodge
 * Loads translations from window.gipfelTranslations (populated by i18n_*.js files)
 */

class I18n {
    constructor() {
        this.lang = localStorage.getItem('gipfel-lang') || 'de';
        this.init();
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
            nl: 'nl',
            fr: 'fr',
            it: 'it',
            pl: 'pl',
            he: 'il'
        };

        // Update document lang and dir (RTL support for Hebrew)
        document.documentElement.lang = lang;
        document.documentElement.dir = (lang === 'he') ? 'rtl' : 'ltr';

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

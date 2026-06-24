/**
 * FAQ Renderer — Gipfel Lodge
 *
 * Reads window.gipfelFaqConfig and injects accordion FAQ sections
 * into each page at the bottom, before </main>.
 *
 * - Uses native <details>/<summary> for accessibility + SEO
 * - Content is in the DOM on first render (no lazy loading)
 * - Respects current i18n language via window.i18n.lang
 * - Automatically re-renders when language changes
 * - Also injects FAQPage JSON-LD per page
 */

(function () {
    'use strict';

    /** Map page IDs to their container elements */
    const PAGE_IDS = ['home', 'lodge', 'activities', 'enjoyment', 'booking'];

    /** Labels per language */
    const LABELS = {
        nl: { heading: 'Veelgestelde vragen', sub: 'FAQ' },
        de: { heading: 'Häufig gestellte Fragen', sub: 'FAQ' },
        en: { heading: 'Frequently asked questions', sub: 'FAQ' },
        fr: { heading: 'Questions fréquentes', sub: 'FAQ' },
        it: { heading: 'Domande frequenti', sub: 'FAQ' },
        pl: { heading: 'Najczęściej zadawane pytania', sub: 'FAQ' }
    };

    /**
     * Returns the current active language, with fallbacks.
     */
    function getLang() {
        if (window.i18n && window.i18n.lang) return window.i18n.lang;
        return localStorage.getItem('gipfel-lang') || 'nl';
    }

    /**
     * Build the HTML string for one FAQ section.
     * @param {string} pageId
     * @param {string} lang
     * @returns {string|null} HTML string or null if no data
     */
    function buildFaqHtml(pageId, lang) {
        const config = window.gipfelFaqConfig;
        if (!config || !config[pageId]) return null;

        // Try requested lang, then 'en', then first available
        const baseData = config[pageId][lang]
            || config[pageId]['en']
            || Object.values(config[pageId])[0];

        if (!baseData || !baseData.length) return null;

        // Merge admin text overrides (faq-q1/faq-a1 etc.) into the FAQ items
        // Only applies to home page FAQ (indexed 1-based)
        const translations = (window.gipfelTranslations && window.gipfelTranslations[lang]) || {};
        const langData = baseData.map((item, i) => {
            const n = i + 1;
            const qKey = `faq-q${n}`;
            const aKey = `faq-a${n}`;
            return {
                q: translations[qKey] || item.q,
                a: translations[aKey] || item.a
            };
        });

        if (!langData || !langData.length) return null;

        const labels = LABELS[lang] || LABELS['en'];

        const items = langData.map((item, i) => `
          <li class="faq-item">
            <details>
              <summary id="faq-${pageId}-q${i}">
                <span>${escHtml(item.q)}</span>
                <span class="faq-icon" aria-hidden="true">+</span>
              </summary>
              <p class="faq-answer" id="faq-${pageId}-a${i}">${escHtml(item.a)}</p>
            </details>
          </li>`).join('');

        return `
  <section class="faq-section" aria-label="${escHtml(labels.heading)}" data-faq-page="${pageId}" data-faq-lang="${lang}">
    <div class="faq-inner">
      <p class="faq-subheading">${escHtml(labels.sub)}</p>
      <h2 class="faq-heading">${escHtml(labels.heading)}</h2>
      <ul class="faq-list" role="list">
        ${items}
      </ul>
    </div>
  </section>`;
    }

    /**
     * Build FAQPage JSON-LD for a single page.
     * @param {string} pageId
     * @param {string} lang
     * @returns {string|null}
     */
    function buildJsonLd(pageId, lang) {
        const config = window.gipfelFaqConfig;
        if (!config || !config[pageId]) return null;

        const langData = config[pageId][lang]
            || config[pageId]['en']
            || Object.values(config[pageId])[0];

        if (!langData || !langData.length) return null;

        const entities = langData.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a
            }
        }));

        return JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: entities
        });
    }

    /**
     * Escape HTML special chars.
     */
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Inject or update a <script type="application/ld+json"> for FAQPage.
     * Uses a data-faq-page attribute to find and replace existing ones.
     */
    function upsertJsonLd(pageId, lang) {
        const id = 'faq-jsonld-' + pageId;
        let el = document.getElementById(id);
        const jsonStr = buildJsonLd(pageId, lang);
        if (!jsonStr) {
            if (el) el.remove();
            return;
        }
        if (!el) {
            el = document.createElement('script');
            el.type = 'application/ld+json';
            el.id = id;
            document.head.appendChild(el);
        }
        el.textContent = jsonStr;
    }

    /**
     * Render (or re-render) FAQ sections for all pages.
     */
    function renderAll() {
        const lang = getLang();

        PAGE_IDS.forEach(pageId => {
            const mainEl = document.getElementById(pageId + '-page');
            if (!mainEl) return;

            // Remove existing FAQ section if present
            const existing = mainEl.querySelector('.faq-section[data-faq-page]');
            if (existing) existing.remove();

            const html = buildFaqHtml(pageId, lang);
            if (html) {
                const ctaBlock = mainEl.querySelector('.booking-cta-v3');
                if (ctaBlock) {
                    ctaBlock.insertAdjacentHTML('beforebegin', html);
                } else {
                    mainEl.insertAdjacentHTML('beforeend', html);
                }
            }

            // Inject/update JSON-LD
            upsertJsonLd(pageId, lang);
        });
    }

    /**
     * Wait for DOM and config, then render.
     */
    function init() {
        if (!window.gipfelFaqConfig) {
            console.warn('[FaqRenderer] gipfelFaqConfig not found.');
            return;
        }
        renderAll();

        // Re-render on language change events emitted by i18n.js
        document.addEventListener('languageChanged', renderAll);
    }

    // Expose for manual triggering (e.g. after dynamic language switch)
    window.GipfelFaqRenderer = { renderAll };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

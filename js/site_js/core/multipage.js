/* Multipage navigation adapter: one HTML document per page.
 * Compatible with existing component initializers and maintenance manager.
 */
(function () {
  const routesByLanguage = {
    nl: { home: '/', lodge: '/lodge/', activities: '/activiteiten/', enjoyment: '/genieten/', booking: '/booking/' },
    de: { home: '/', lodge: '/lodge/', activities: '/aktivitaeten/', enjoyment: '/genuss/', booking: '/buchen/' },
    en: { home: '/', lodge: '/lodge/', activities: '/activities/', enjoyment: '/enjoyment/', booking: '/booking/' }
  };
  const host = location.hostname;
  const lang = host.endsWith('.at') || host.endsWith('.de') ? 'de'
    : host.endsWith('.eu') ? 'en' : (window.i18n && window.i18n.lang) || 'nl';
  const routes = routesByLanguage[lang] || routesByLanguage.nl;
  const base = location.hostname.endsWith('.github.io') ? '/Gipfel-Lodge' : '';
  const currentPageId = document.documentElement.dataset.mpaPage || 'home';
  window.router = {
    currentPageId,
    getPathForPage(page) { return base + (routes[page] || '/'); }
  };
  window.navigateTo = function (page) {
    if (!Object.prototype.hasOwnProperty.call(routes, page)) return;
    location.assign(base + routes[page]);
  };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href]').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#' || href.length < 2) return;
      const page = href.slice(1);
      if (Object.prototype.hasOwnProperty.call(routes, page)) {
        link.setAttribute('href', base + routes[page]);
      }
    });
    const init = {
      home: 'HomePage', lodge: 'LodgePage', activities: 'SeasonsPage',
      enjoyment: 'EnjoymentPage', booking: 'GipfelBooking'
    };
    const component = window[init[currentPageId]];
    if (component && typeof component.init === 'function') component.init();
    if (window.GipfelLightbox) window.GipfelLightbox.init();
    if (window.GipfelScroll) window.GipfelScroll.init();
    if (window.seoManager && typeof window.seoManager.update === 'function') window.seoManager.update(currentPageId);
  });
})();

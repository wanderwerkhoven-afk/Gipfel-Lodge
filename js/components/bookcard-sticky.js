document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("bookCard");
  const placeholder = document.getElementById("bookCardPlaceholder");
  const topbar = document.querySelector(".topbar");
  const container = document.querySelector(".lodge-header .container") || document.querySelector(".container");

  if (!card || !placeholder || !topbar) return;

  // Hoeveel "iets boven de bovenkant" je wilt (in px)
  const EXTRA_GAP = 10;

  let startTop = 0;          // card top (document)
  let cardHeight = 0;        // voor placeholder
  let cardWidth = 0;         // fixed width
  let rightOffset = 24;      // fixed right
  let stickyTop = 86;        // fixed top (topbar + gap)

  function measure() {
    // Reset naar normaal zodat we correcte metingen krijgen
    card.classList.remove("is-sticky");
    placeholder.classList.remove("is-active");
    placeholder.style.height = "0px";

    const topbarRect = topbar.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    // Document Y positie van de card
    startTop = window.scrollY + cardRect.top;

    // Hoogte + breedte card
    cardHeight = cardRect.height;
    cardWidth = cardRect.width;

    // Placeholder gelijk aan card hoogte
    placeholder.style.height = `${cardHeight}px`;

    // Sticky top = onderkant topbar + extra gap
    stickyTop = Math.round(topbarRect.height + EXTRA_GAP);

    // Right offset: uitlijnen met container (zodat hij "in" het grid blijft)
    if (container) {
      const cRect = container.getBoundingClientRect();
      rightOffset = Math.max(16, Math.round(window.innerWidth - cRect.right));
    } else {
      rightOffset = 24;
    }

    // CSS vars zetten
    card.style.setProperty("--book-sticky-top", `${stickyTop}px`);
    card.style.setProperty("--book-sticky-right", `${rightOffset}px`);
    card.style.setProperty("--book-sticky-width", `${Math.round(cardWidth)}px`);
  }

  function onScroll() {
    const topbarHeight = topbar.getBoundingClientRect().height;
    const triggerY = startTop - (topbarHeight + EXTRA_GAP);

    // Wanneer scroll voorbij trigger -> sticky
    const shouldStick = window.scrollY >= triggerY;

    if (shouldStick) {
      if (!card.classList.contains("is-sticky")) {
        card.classList.add("is-sticky");
        placeholder.classList.add("is-active");
        // placeholder hoogte staat al goed (measure), maar voor zekerheid:
        placeholder.style.height = `${cardHeight}px`;
      }
    } else {
      if (card.classList.contains("is-sticky")) {
        card.classList.remove("is-sticky");
        placeholder.classList.remove("is-active");
      }
    }
  }

  // Throttle met rAF voor smooth scroll
  let ticking = false;
  function onScrollRaf() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }

  // Init
  measure();
  onScroll();

  window.addEventListener("scroll", onScrollRaf, { passive: true });

  window.addEventListener("resize", () => {
    measure();
    onScroll();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      measure();
      onScroll();
    }, 150);
  });
});

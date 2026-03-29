/**
 * Winteractiviteiten Page Logic
 * Handles filtering of activity cards, accordion toggles, and sticky subnav
 */

document.addEventListener('DOMContentLoaded', () => {
  initWinterFilters();
  initAccordions();
  initScrollSpy();
  initParallax();
});

function initWinterFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.season-card');

  if (!buttons.length || !cards.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1. Update active state on buttons
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter').toLowerCase();

      // 2. Filter cards
      cards.forEach(card => {
        // If 'all', show all
        if (filterValue === 'all') {
          card.classList.remove('hide');
          setTimeout(() => { card.style.opacity = '1'; }, 10);
          return;
        }

        const categoriesAttr = card.getAttribute('data-categories');
        if (categoriesAttr) {
          // data-categories string is "skiën,actief,familie", etc.
          const categories = categoriesAttr.toLowerCase().split(',');
          if (categories.includes(filterValue)) {
            card.classList.remove('hide');
            setTimeout(() => { card.style.opacity = '1'; }, 10);
          } else {
            card.style.opacity = '0';
            setTimeout(() => { card.classList.add('hide'); }, 400);
          }
        }
      });
    });
  });
}

function initAccordions() {
  const accordions = document.querySelectorAll('.accordion-item');
  if (!accordions.length) return;

  accordions.forEach(acc => {
    acc.addEventListener('click', () => {
      acc.classList.toggle('active');
      
      const body = acc.querySelector('.accordion-body');
      if (acc.classList.contains('active')) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = '0px';
      }

      accordions.forEach(other => {
        if (other !== acc && other.classList.contains('active')) {
          other.classList.remove('active');
          other.querySelector('.accordion-body').style.maxHeight = '0px';
        }
      });
    });
  });
}

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.season-subnav a');

  if (!sections.length || !navLinks.length) return;

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 150; // offset for sticky nav + header

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').includes(current) && current !== '') {
        link.classList.add('active');
      }
    });
  });
  
  navLinks.forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if(targetEl) {
        window.scrollTo({
          top: targetEl.offsetTop - 120, 
          behavior: 'smooth'
        });
      }
    });
  });
}

function initParallax() {
  const heroBg = document.querySelector('.season-hero-bg');
  if (!heroBg) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    if (scrollY < window.innerHeight) {
      heroBg.style.transform = `translateY(${scrollY * 0.4}px)`;
    }
  });
}

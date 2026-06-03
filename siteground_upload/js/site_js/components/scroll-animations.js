document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll('[data-animate]');

  if (!animatedElements.length) return;

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // animatie maar 1x
        }
      });
    },
    {
      threshold: 0.2, // 20% zichtbaar
    }
  );

  animatedElements.forEach(el => observer.observe(el));
});

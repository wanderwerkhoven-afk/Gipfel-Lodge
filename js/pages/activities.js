/**
 * Activities Page Logic
 * Handles the Winter/Summer toggle interactions
 */
class ActivitiesController {
  constructor() {
    this.toggles = document.querySelectorAll('.act-toggle');
    this.sections = {
      winter: document.getElementById('season-winter'),
      summer: document.getElementById('season-summer')
    };
    this.toggleContainer = document.querySelector('.activities-toggles');

    if (this.toggles.length > 0) {
      this.init();
    }
  }

  init() {
    this.toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const targetSeason = toggle.dataset.season;
        this.switchSeason(targetSeason);
      });
    });

    // We can open Winter by default so the page looks full on entry
    this.switchSeason('winter');
  }

  switchSeason(season) {
    if (!this.toggleContainer || !this.sections[season]) return;
      
    // 1. Update Toggles states
    this.toggleContainer.classList.add('has-active');
    
    this.toggles.forEach(toggle => {
      if (toggle.dataset.season === season) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    });

    // 2. Hide all sections
    Object.values(this.sections).forEach(section => {
      if (!section) return;
      
      // If it's the target, don't hide it
      if (section.id === `season-${season}`) return;

      section.classList.remove('fade-in');
      
      // Wait for fade out to complete before display:none
      setTimeout(() => {
        if (!section.classList.contains('fade-in')) {
          section.classList.remove('active');
          section.style.display = 'none';
        }
      }, 300); // 300ms matches the transition roughly
    });

    // 3. Show target section
    const targetSection = this.sections[season];
    if (targetSection) {
      // Very small timeout, or just display block immediately and trigger fade-in next frame
      targetSection.style.display = 'block';
      targetSection.classList.add('active');
      
      // Force reflow
      void targetSection.offsetWidth;
      
      targetSection.classList.add('fade-in');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.activitiesController = new ActivitiesController();
});

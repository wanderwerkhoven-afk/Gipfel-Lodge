/**
 * Home Page Logic - Gipfel Lodge
 */

const HomePage = {
    init() {
        console.log('Initializing Home Page...');
        // Initialize Hero
        if (window.HeroCarousel) {
            window.HeroCarousel.init();
        }
    }
};

window.HomePage = HomePage;

import { db, doc, onSnapshot } from './firebase.js';

class MaintenanceManager {
    constructor() {
        this.maintenanceData = null;
        this.maintenanceScreen = document.getElementById('maintenance-screen');
        this.currentPage = 'home'; // Default
        
        this.init();
    }

    init() {
        if (!this.maintenanceScreen) return;

        // Intercept navigateTo to detect page changes seamlessly
        if (typeof window.navigateTo === 'function') {
            const originalNavigateTo = window.navigateTo;
            window.navigateTo = (pageId) => {
                originalNavigateTo(pageId);
                this.currentPage = (pageId || 'home').split('?')[0];
                this.evaluateMaintenanceState();
            };
        }

        // Keep hashchange for external navigation or browser back/forward
        window.addEventListener('hashchange', () => {
            this.currentPage = (window.location.hash.replace('#', '') || 'home').split('?')[0];
            this.evaluateMaintenanceState();
        });

        // Set initial page
        this.currentPage = (window.location.hash.replace('#', '') || 'home').split('?')[0];

        // Connect to Firestore settings
        this.listenToSettings();
        
        // Add listener for local language selector clicks within the maintenance screen
        const langLinks = this.maintenanceScreen.querySelectorAll('.lang-link');
        langLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = link.getAttribute('data-lang-switch');
                if (window.gipfelI18n) {
                    window.gipfelI18n.setLanguage(lang);
                }
            });
        });
    }

    listenToSettings() {
        const settingsRef = doc(db, 'settings', 'website');
        onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                this.maintenanceData = docSnap.data();
                this.evaluateMaintenanceState();
            } else {
                // Default to off if no settings exist
                this.maintenanceData = {
                    master_switch: false,
                    pages: {}
                };
                this.evaluateMaintenanceState();
            }
        }, (error) => {
            console.error("Error listening to maintenance settings:", error);
        });
    }

    evaluateMaintenanceState() {
        if (!this.maintenanceData) return;

        const isMasterOn = this.maintenanceData.master_switch === true;
        const isPageOn = this.maintenanceData.pages && this.maintenanceData.pages[this.currentPage] === true;

        if (isMasterOn || isPageOn) {
            this.showMaintenanceScreen();
        } else {
            this.hideMaintenanceScreen();
        }
    }

    showMaintenanceScreen() {
        this.maintenanceScreen.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    hideMaintenanceScreen() {
        this.maintenanceScreen.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.MaintenanceManager = new MaintenanceManager();
});

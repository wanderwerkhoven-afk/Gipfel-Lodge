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
                this.evaluateMaintenanceState();
            };
        }

        // Listen for browser navigation / popstate
        window.addEventListener('popstate', () => {
            this.evaluateMaintenanceState();
        });

        // Listen for languageChanged to update translations in-place
        document.addEventListener('languageChanged', () => {
            this.evaluateMaintenanceState();
        });

        // Connect to Firestore settings
        this.listenToSettings();
        
        // Add listener for local language selector clicks within the maintenance screen
        const langLinks = this.maintenanceScreen.querySelectorAll('.lang-link');
        langLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = link.getAttribute('data-lang-switch');
                if (window.i18n) {
                    window.i18n.setLanguage(lang, true);
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

        const currentPage = (window.router && window.router.currentPageId) || 'home';
        const isMasterOn = this.maintenanceData.master_switch === true;
        const isPageOn = this.maintenanceData.pages && this.maintenanceData.pages[currentPage] === true;

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

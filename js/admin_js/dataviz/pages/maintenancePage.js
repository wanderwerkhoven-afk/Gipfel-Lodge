import { db, doc, onSnapshot, setDoc } from '../../../site_js/core/firebase.js';
// No EventBus

export const MaintenancePage = {
    initialized: false,
    containerId: 'maintenance-view',
    unsubscribe: null,
    settings: {
        master_switch: false,
        pages: {
            home: false,
            lodge: false,
            activities: false,
            enjoyment: false,
            booking: false
        }
    },

    async init() {
        if (this.initialized) return;

        const container = document.getElementById(this.containerId);
        if (!container) return;

        this.render(container);
        this.attachListeners(container);
        this.startListener();

        this.initialized = true;
    },

    render(container) {
        container.innerHTML = `
            <div class="eb2-page-header">
                <div>
                    <h1>Website Status & Onderhoud</h1>
                    <p>Beheer hier welke pagina's tijdelijk afgesloten zijn met een "Onder Constructie" melding.</p>
                </div>
            </div>

            <div class="eb2-content-wrapper">
                <!-- Master Switch -->
                <div class="eb2-section-card" style="margin-bottom: 24px; border-left: 5px solid #ef4444;">
                    <div class="eb2-section-header" style="gap: 15px;">
                        <div>
                            <h2 class="eb2-section-title" style="color: #ef4444;">Totale Website Blokkeren</h2>
                            <p class="eb2-section-subtitle">Zet de hele website op "Onder Constructie". Individuele pagina-instellingen worden genegeerd zolang dit aan staat.</p>
                        </div>
                        <label class="pill-toggle pill-lg pill-danger">
                            <input type="checkbox" id="maint-master-switch">
                            <span class="pill-toggle-track">
                                <span class="pill-toggle-labels">
                                    <span class="pill-toggle-label-on">AAN</span>
                                    <span class="pill-toggle-label-off">UIT</span>
                                </span>
                                <span class="pill-toggle-thumb"></span>
                            </span>
                        </label>
                    </div>
                </div>

                <!-- Per Page -->
                <div class="eb2-section-card">
                    <div class="eb2-section-header" style="padding-bottom: 15px;">
                        <div>
                            <h2 class="eb2-section-title">Individuele Pagina's</h2>
                            <p class="eb2-section-subtitle">Schakel de onderhoudsmodus per specifieke pagina in of uit.</p>
                        </div>
                    </div>
                    
                    <div class="eb2-table-container">
                        <table class="eb2-table" style="min-width: 100%;">
                            <thead>
                                <tr>
                                    <th style="padding-left: 24px;">Pagina</th>
                                    <th style="width: 120px; text-align: right; padding-right: 24px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding-left: 24px; padding-top: 16px; padding-bottom: 16px;">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">Home</div>
                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">De hoofdpagina (/#home)</div>
                                    </td>
                                    <td style="text-align: right; padding-right: 24px;">
                                        <label class="pill-toggle">
                                            <input type="checkbox" class="maint-page-toggle" data-page="home">
                                            <span class="pill-toggle-track">
                                                <span class="pill-toggle-labels">
                                                    <span class="pill-toggle-label-on">AAN</span>
                                                    <span class="pill-toggle-label-off">UIT</span>
                                                </span>
                                                <span class="pill-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-left: 24px; padding-top: 16px; padding-bottom: 16px;">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">De Lodge</div>
                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Lodge details en galerij (/#lodge)</div>
                                    </td>
                                    <td style="text-align: right; padding-right: 24px;">
                                        <label class="pill-toggle">
                                            <input type="checkbox" class="maint-page-toggle" data-page="lodge">
                                            <span class="pill-toggle-track">
                                                <span class="pill-toggle-labels">
                                                    <span class="pill-toggle-label-on">AAN</span>
                                                    <span class="pill-toggle-label-off">UIT</span>
                                                </span>
                                                <span class="pill-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-left: 24px; padding-top: 16px; padding-bottom: 16px;">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">Activiteiten</div>
                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Zomer & Winter activiteiten (/#activities)</div>
                                    </td>
                                    <td style="text-align: right; padding-right: 24px;">
                                        <label class="pill-toggle">
                                            <input type="checkbox" class="maint-page-toggle" data-page="activities">
                                            <span class="pill-toggle-track">
                                                <span class="pill-toggle-labels">
                                                    <span class="pill-toggle-label-on">AAN</span>
                                                    <span class="pill-toggle-label-off">UIT</span>
                                                </span>
                                                <span class="pill-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-left: 24px; padding-top: 16px; padding-bottom: 16px;">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">Genuss (Nieuw)</div>
                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Eten & drinken (/#enjoyment)</div>
                                    </td>
                                    <td style="text-align: right; padding-right: 24px;">
                                        <label class="pill-toggle">
                                            <input type="checkbox" class="maint-page-toggle" data-page="enjoyment">
                                            <span class="pill-toggle-track">
                                                <span class="pill-toggle-labels">
                                                    <span class="pill-toggle-label-on">AAN</span>
                                                    <span class="pill-toggle-label-off">UIT</span>
                                                </span>
                                                <span class="pill-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-left: 24px; padding-top: 16px; padding-bottom: 16px;">
                                        <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">Boeken</div>
                                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">Beschikbaarheid en boeken (/#booking)</div>
                                    </td>
                                    <td style="text-align: right; padding-right: 24px;">
                                        <label class="pill-toggle">
                                            <input type="checkbox" class="maint-page-toggle" data-page="booking">
                                            <span class="pill-toggle-track">
                                                <span class="pill-toggle-labels">
                                                    <span class="pill-toggle-label-on">AAN</span>
                                                    <span class="pill-toggle-label-off">UIT</span>
                                                </span>
                                                <span class="pill-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;
    },

    attachListeners(container) {
        const masterSwitch = container.querySelector('#maint-master-switch');
        const pageToggles = container.querySelectorAll('.maint-page-toggle');

        masterSwitch.addEventListener('change', async (e) => {
            this.settings.master_switch = e.target.checked;
            await this.saveSettings();
            console.log('Master switch ' + (e.target.checked ? 'AAN' : 'UIT'));
        });

        pageToggles.forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const page = e.target.dataset.page;
                this.settings.pages[page] = e.target.checked;
                await this.saveSettings();
                console.log('Pagina ' + page + ' ' + (e.target.checked ? 'Offline' : 'Online'));
            });
        });
    },

    startListener() {
        const settingsRef = doc(db, 'settings', 'website');
        this.unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.settings = {
                    master_switch: data.master_switch || false,
                    pages: { ...this.settings.pages, ...(data.pages || {}) }
                };
            }
            this.updateUI();
        });
    },

    updateUI() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const masterSwitch = container.querySelector('#maint-master-switch');
        if (masterSwitch) masterSwitch.checked = this.settings.master_switch;

        const pageToggles = container.querySelectorAll('.maint-page-toggle');
        pageToggles.forEach(toggle => {
            const page = toggle.dataset.page;
            toggle.checked = this.settings.pages[page] === true;
        });
    },

    async saveSettings() {
        try {
            const settingsRef = doc(db, 'settings', 'website');
            await setDoc(settingsRef, this.settings, { merge: true });
        } catch (error) {
            console.error("Error saving maintenance settings:", error);
            console.error('Fout bij opslaan:', error.message);
        }
    },

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.initialized = false;
        const container = document.getElementById(this.containerId);
        if (container) container.innerHTML = '';
    }
};

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
                <div class="eb2-section-card" style="margin-bottom: 24px; border-left: 4px solid #ef4444;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div>
                            <h2 style="margin:0; font-size: 1.1rem; color: #1e293b;">Totale Website Blokkeren</h2>
                            <p style="margin: 4px 0 0; font-size: 0.85rem; color: #64748b;">Zet de hele website op "Onder Constructie". Individuele pagina-instellingen worden genegeerd zolang dit aan staat.</p>
                        </div>
                        <label class="eb2-toggle-switch">
                            <input type="checkbox" id="maint-master-switch">
                            <span class="eb2-toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- Per Page -->
                <div class="eb2-section-card">
                    <h2 style="margin-top:0; font-size: 1.1rem; color: #1e293b; margin-bottom: 20px;">Individuele Pagina's</h2>
                    
                    <div class="eb2-table-container">
                        <table class="eb2-table">
                            <thead>
                                <tr>
                                    <th>Pagina</th>
                                    <th style="width: 100px; text-align: right;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Home</strong> <br><span style="font-size:0.8rem;color:#64748b;">De hoofdpagina (/#home)</span></td>
                                    <td style="text-align: right;">
                                        <label class="eb2-toggle-switch"><input type="checkbox" class="maint-page-toggle" data-page="home"><span class="eb2-toggle-slider"></span></label>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>De Lodge</strong> <br><span style="font-size:0.8rem;color:#64748b;">Lodge details en galerij (/#lodge)</span></td>
                                    <td style="text-align: right;">
                                        <label class="eb2-toggle-switch"><input type="checkbox" class="maint-page-toggle" data-page="lodge"><span class="eb2-toggle-slider"></span></label>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Activiteiten</strong> <br><span style="font-size:0.8rem;color:#64748b;">Zomer & Winter activiteiten (/#activities)</span></td>
                                    <td style="text-align: right;">
                                        <label class="eb2-toggle-switch"><input type="checkbox" class="maint-page-toggle" data-page="activities"><span class="eb2-toggle-slider"></span></label>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Genuss (Nieuw)</strong> <br><span style="font-size:0.8rem;color:#64748b;">Eten & drinken (/#enjoyment)</span></td>
                                    <td style="text-align: right;">
                                        <label class="eb2-toggle-switch"><input type="checkbox" class="maint-page-toggle" data-page="enjoyment"><span class="eb2-toggle-slider"></span></label>
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Boeken</strong> <br><span style="font-size:0.8rem;color:#64748b;">Beschikbaarheid en boeken (/#booking)</span></td>
                                    <td style="text-align: right;">
                                        <label class="eb2-toggle-switch"><input type="checkbox" class="maint-page-toggle" data-page="booking"><span class="eb2-toggle-slider"></span></label>
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

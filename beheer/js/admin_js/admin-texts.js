/**
 * admin-texts.js
 * Gipfel Lodge Admin - Dynamic Texts Management
 */

let _firebaseDb = null;
let _firebaseDoc = null;
let _firebaseSetDoc = null;
let _firebaseGetDoc = null;

let _defaultTranslations = null; // window.gipfelTranslations
let _overrides = { nl: {}, de: {}, en: {} };
let _activeLang = 'nl';
let _activePage = 'home'; // home, lodge, activities, enjoyment, booking, global

let _pageKeysOrder = {
    home: [],
    lodge: [],
    activities: [],
    enjoyment: [],
    booking: [],
    global: []
};

window.initTextsView = async function() {
    try {
        const fb = await import('../site_js/core/firebase.js');
        const groupsMod = await import('./admin-texts-groups.js').catch(() => null);
        window.HOME_PAGE_GROUPS = groupsMod ? groupsMod.HOME_PAGE_GROUPS : null;

        _firebaseDb = fb.db;
        _firebaseDoc = fb.doc;
        _firebaseSetDoc = fb.setDoc;
        _firebaseGetDoc = fb.getDoc;

        // Ensure default translations are loaded
        await ensureDefaultTranslationsLoaded();
        _defaultTranslations = window.gipfelTranslations;

        // Parse index.html to get chronological order of translation keys
        await buildPageKeysOrder();

        // Fetch overrides
        const docSnap = await _firebaseGetDoc(_firebaseDoc(_firebaseDb, 'settings', 'translations'));
        if (docSnap.exists()) {
            _overrides = docSnap.data();
            // Ensure structure
            if (!_overrides.nl) _overrides.nl = {};
            if (!_overrides.de) _overrides.de = {};
            if (!_overrides.en) _overrides.en = {};
        }

        renderTextsEditor();
    } catch (e) {
        console.error("Fout bij laden teksten:", e);
        document.getElementById('texts-editor-container').innerHTML = `<div style="color:red; text-align:center;">Fout bij inladen: ${e.message}</div>`;
    }
};

window.switchTextPageTab = function(page, btnElement) {
    // Save current values to local object BEFORE switching to preserve unsaved changes
    saveCurrentTabToOverrides();

    _activePage = page;
    
    // Update active button state
    const btns = btnElement.parentElement.querySelectorAll('.eb2-tab-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    renderTextsEditor();
};

window.switchLanguageTab = function(lang, btnElement) {
    // Save current values to local object BEFORE switching lang to preserve unsaved changes in the correct language
    saveCurrentTabToOverrides();

    _activeLang = lang;
    
    // Update active button state
    const btns = btnElement.parentElement.querySelectorAll('.eb2-filter-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    renderTextsEditor();
};

function saveCurrentTabToOverrides() {
    const container = document.getElementById('texts-editor-container');
    if (!container) return;
    const inputs = container.querySelectorAll('[data-text-key]');
    if (inputs.length === 0) return;
    
    if (!_overrides[_activeLang]) _overrides[_activeLang] = {};
    
    inputs.forEach(input => {
        const key = input.getAttribute('data-text-key');
        const val = input.value.trim();
        const def = _defaultTranslations[_activeLang][key] || '';
        
        if (val !== def) {
            _overrides[_activeLang][key] = val; // Store override
        } else {
            delete _overrides[_activeLang][key]; // Delete override if it matches default
        }
    });
}

function ensureDefaultTranslationsLoaded() {
    return new Promise((resolve) => {
        if (window.gipfelTranslations && Object.keys(window.gipfelTranslations.nl || {}).length > 0) {
            resolve(); return;
        }
        
        const scripts = [
            'js/site_js/i18n/i18n_core.js',
            'js/site_js/i18n/i18n_global.js',
            'js/site_js/i18n/i18n_home.js',
            'js/site_js/i18n/i18n_lodge.js',
            'js/site_js/i18n/i18n_activities.js',
            'js/site_js/i18n/i18n_enjoyment.js',
            'js/site_js/i18n/i18n_booking.js'
        ];

        let loaded = 0;
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loaded++;
                if (loaded === scripts.length) resolve();
            };
            script.onerror = () => {
                loaded++;
                if (loaded === scripts.length) resolve();
            };
            document.head.appendChild(script);
        });
    });
}

async function buildPageKeysOrder() {
    try {
        let response = await fetch('/index.html').catch(() => null);
        if (!response || !response.ok) {
            response = await fetch('index.html').catch(() => null);
        }
        if (!response || !response.ok) {
            response = await fetch('../index.html').catch(() => null);
        }
        if (!response || !response.ok) {
            throw new Error('Could not fetch index.html from any known location');
        }
        const rawHtml = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        // Page IDs in index.html use the pattern 'home-page', 'lodge-page', etc.
        const pageIdMap = {
            home: 'home-page',
            lodge: 'lodge-page',
            activities: 'activities-page',
            enjoyment: 'enjoyment-page',
            booking: 'booking-page'
        };
        const allUsedKeys = new Set();

        // 1. Extract keys inside each page-view section (in DOM order = chronological)
        Object.entries(pageIdMap).forEach(([page, htmlId]) => {
            const pageEl = doc.getElementById(htmlId);
            if (pageEl) {
                const i18nElements = pageEl.querySelectorAll('[data-i18n]');
                i18nElements.forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (key && !_pageKeysOrder[page].includes(key)) {
                        _pageKeysOrder[page].push(key);
                        allUsedKeys.add(key);
                    }
                });
            }
        });

        // 2. Extract keys that are outside page-views (e.g. Nav, Footer)
        const allI18nElements = doc.querySelectorAll('[data-i18n]');
        allI18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && !allUsedKeys.has(key) && !_pageKeysOrder.global.includes(key)) {
                _pageKeysOrder.global.push(key);
                allUsedKeys.add(key);
            }
        });

        // 3. Fallback: Add any translation keys defined in JS that weren't found in HTML at all
        if (_defaultTranslations && _defaultTranslations['nl']) {
            Object.keys(_defaultTranslations['nl']).forEach(key => {
                if (!allUsedKeys.has(key) && !_pageKeysOrder.global.includes(key)) {
                    _pageKeysOrder.global.push(key);
                }
            });
        }

    } catch (e) {
        console.warn("Could not parse chronological order from index.html, using smart fallback grouping:", e);
        // Smart Fallback
        if (_defaultTranslations && _defaultTranslations['nl']) {
            const keys = Object.keys(_defaultTranslations['nl']);
            keys.forEach(key => {
                if (key.startsWith('nav-') || key.startsWith('footer-') || key.startsWith('cookie-') || key.startsWith('maint-')) {
                    _pageKeysOrder.global.push(key);
                } else if (key.startsWith('hero-') || key.startsWith('intro-') || key.startsWith('usp-') || key.startsWith('seasonal-') || key.startsWith('visual-') || key.startsWith('act-card')) {
                    _pageKeysOrder.home.push(key);
                } else if (key.startsWith('lodge-') || key.startsWith('sauna-') || key.startsWith('amenity-') || key.startsWith('kitchen-')) {
                    _pageKeysOrder.lodge.push(key);
                } else if (key.startsWith('act-') && !key.startsWith('act-card')) {
                    _pageKeysOrder.activities.push(key);
                } else if (key.startsWith('enjoy-')) {
                    _pageKeysOrder.enjoyment.push(key);
                } else if (key.startsWith('book-') || key.startsWith('price-') || key.startsWith('calc-') || key.startsWith('form-') || key.startsWith('discount-') || key.startsWith('modal-')) {
                    _pageKeysOrder.booking.push(key);
                } else {
                    _pageKeysOrder.global.push(key);
                }
            });
        }
    }
}

function renderTextsEditor() {
    const container = document.getElementById('texts-editor-container');
    
    const defaults = _defaultTranslations[_activeLang] || {};
    const overrides = _overrides[_activeLang] || {};

    let html = '';

    const keysToRender = _pageKeysOrder[_activePage] || [];

    if (keysToRender.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px;">Geen teksten gevonden voor deze pagina.</div>`;
        return;
    }

    if (_activePage === 'home' && window.HOME_PAGE_GROUPS) {
        html += renderGroupedEditor(window.HOME_PAGE_GROUPS, defaults, overrides);
    } else {
        // Render all keys chronologically
        html += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="background:#f8fafc; padding:12px 20px; border-bottom:1px solid #e2e8f0; font-weight:600; text-transform:uppercase; font-size:0.8rem; color:#64748b; letter-spacing:0.05em;">
                    Pagina: ${_activePage}
                </div>
                <div style="padding:20px; display:flex; flex-direction:column; gap:15px;">
        `;
        
        for (const key of keysToRender) {
            const defaultValue = defaults[key] || '';
        const overrideValue = overrides[key] || '';
        
        // If the text is very long, use a textarea, else input
        const isLong = defaultValue.length > 80;

        html += `
            <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:0.85rem; font-weight:600; color:#475569;">${key}</label>
                ${isLong 
                    ? `<textarea data-text-key="${key}" rows="3" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; font-size:0.9rem;">${overrideValue || defaultValue}</textarea>`
                    : `<input type="text" data-text-key="${key}" value="${(overrideValue || defaultValue).replace(/"/g, '&quot;')}" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; font-size:0.9rem;">`
                }
                ${overrideValue ? `<div style="font-size:0.75rem; color:var(--color-gold);">* Aangepast (Standaard: ${defaultValue.substring(0, 50).replace(/</g, '&lt;')}${defaultValue.length > 50 ? '...' : ''})</div>` : ''}
            </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderGroupedEditor(groups, defaults, overrides) {
    let html = '';
    for (const group of groups) {
        html += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.02); margin-bottom:20px;">
                <div style="background:#f8fafc; padding:12px 20px; border-bottom:1px solid #e2e8f0; font-weight:700; font-size:1rem; color:#1e293b;">
                    ${group.title}
                </div>
                <div style="padding:20px; display:flex; flex-direction:column; gap:15px;">
        `;
        for (const fieldItem of group.fields) {
            if (Array.isArray(fieldItem)) {
                html += `<div style="display:flex; gap:15px; align-items:flex-start; width:100%;">`;
                for (const field of fieldItem) {
                    html += renderSingleField(field, defaults, overrides);
                }
                html += `</div>`;
            } else {
                html += renderSingleField(fieldItem, defaults, overrides);
            }
        }
        html += `
                </div>
            </div>
        `;
    }
    return html;
}

function renderSingleField(field, defaults, overrides) {
    const defaultValue = defaults[field.id] || '';
    const currentVal = overrides[field.id] !== undefined ? overrides[field.id] : defaultValue;
    const isTextarea = currentVal.length > 60 || defaultValue.length > 60;
    
    // Zorg voor placeholder tekst
    const placeholderEscaped = defaultValue ? defaultValue.replace(/"/g, '&quot;') : '';
    const valEscaped = currentVal ? currentVal.replace(/"/g, '&quot;') : '';

    return `
        <div class="eb2-form-group" style="margin:0;">
            <label style="color:#64748b; font-size:0.85rem; font-weight:600;">${field.label}</label>
            <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:4px; font-family:monospace;">ID: ${field.id}</div>
            ${isTextarea 
                ? `<textarea data-text-key="${field.id}" rows="3" class="eb2-input" placeholder="${placeholderEscaped}">${valEscaped}</textarea>`
                : `<input type="text" data-text-key="${field.id}" value="${valEscaped}" class="eb2-input" placeholder="${placeholderEscaped}">`
            }
        </div>
    `;
}

window.saveTextTranslations = async function() {
    if (!_firebaseSetDoc) return;

    // Support both old and new button onclick names
    const btn = document.querySelector('button[onclick="saveTexts()"], button[onclick="saveTextTranslations()"]');
    const originalHTML = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="ph ph-spinner"></i> Opslaan...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    // Gather values for current language
    saveCurrentTabToOverrides();

    try {
        await _firebaseSetDoc(_firebaseDoc(_firebaseDb, 'settings', 'translations'), _overrides);

        if (window.logActivity) {
            window.logActivity('Website update', `Teksten op de website zijn bijgewerkt (${_activeLanguage.toUpperCase()})`, 'website');
        }

        if (window.showToast) {
            window.showToast('Teksten opgeslagen', 'De wijzigingen staan nu live op de website.', 'success');
        }

        // Re-render to show updated override labels
        renderTextsEditor();
    } catch (e) {
        console.error('Fout bij opslaan teksten:', e);
        if (window.showToast) {
            window.showToast('Opslaan mislukt', e.message, 'error');
        }
    } finally {
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
};

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
let _activeSection = 0;

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
        window.LODGE_PAGE_GROUPS = groupsMod ? groupsMod.LODGE_PAGE_GROUPS : null;

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
    _activeSection = 0;
    
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

window.switchTextSection = function(index, btnElement) {
    saveCurrentTabToOverrides();
    _activeSection = index;
    
    // The UI will re-render, so active classes will be set automatically in renderSidebarLayout
    renderTextsEditor();
};

function saveCurrentTabToOverrides() {
    const container = document.getElementById('texts-editor-container');
    if (!container) return [];
    const inputs = container.querySelectorAll('[data-text-key]');
    if (inputs.length === 0) return [];
    
    if (!_overrides[_activeLang]) _overrides[_activeLang] = {};
    
    let changedKeys = [];
    inputs.forEach(input => {
        const key = input.getAttribute('data-text-key');
        const val = input.value.trim();
        const def = _defaultTranslations[_activeLang][key] || '';
        const oldVal = _overrides[_activeLang][key] || def;
        
        if (val !== oldVal) {
            changedKeys.push(key);
        }

        if (val !== def) {
            _overrides[_activeLang][key] = val; // Store override
        } else {
            delete _overrides[_activeLang][key]; // Delete override if it matches default
        }
    });
    return changedKeys;
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
        html += renderSidebarLayout(window.HOME_PAGE_GROUPS, defaults, overrides);
    } else if (_activePage === 'lodge' && window.LODGE_PAGE_GROUPS) {
        html += renderSidebarLayout(window.LODGE_PAGE_GROUPS, defaults, overrides);
    } else {
        const fallbackGroup = [{
            title: 'Alle Teksten',
            fields: keysToRender.map(k => ({ id: k, label: k }))
        }];
        html += renderSidebarLayout(fallbackGroup, defaults, overrides);
    }

    container.innerHTML = html;
}

function renderSidebarLayout(groups, defaults, overrides) {
    if (!groups || groups.length === 0) return '';
    
    if (_activeSection >= groups.length) _activeSection = 0;
    
    const activeGroup = groups[_activeSection];

    let html = `<div style="display:flex; gap:20px; align-items:flex-start; min-height: 500px;">`;
    
    // Sidebar
    html += `
        <div style="width:160px; background:white; border:1px solid #e2e8f0; border-radius:12px; padding:10px; box-shadow:0 1px 3px rgba(0,0,0,0.02); flex-shrink:0;">
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8; padding:10px 15px 5px; letter-spacing:0.05em;">Secties</div>
            <div style="display:flex; flex-direction:column; gap:2px;">
    `;
    
    groups.forEach((group, idx) => {
        const isActive = idx === _activeSection;
        const bg = isActive ? '#f1f5f9' : 'transparent';
        const color = isActive ? '#0f172a' : '#64748b';
        const weight = isActive ? '600' : '500';
        html += `
            <button class="cms-sidebar-btn ${isActive ? 'active' : ''}" onclick="switchTextSection(${idx}, this)" style="background:${bg}; color:${color}; font-weight:${weight}; text-align:left; padding:10px 15px; border-radius:6px; border:none; cursor:pointer; font-size:0.9rem; transition:all 0.2s;">
                ${group.title}
            </button>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    // Content area
    html += `
        <div style="flex:1; background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
            <div style="background:#f8fafc; padding:15px 20px; border-bottom:1px solid #e2e8f0; font-weight:700; font-size:1.1rem; color:#1e293b;">
                ${activeGroup.title}
            </div>
            <div style="padding:24px; display:flex; flex-direction:column; gap:20px;">
    `;
    
    if (activeGroup.title === 'Reviews') {
        const reviewTitleField = activeGroup.fields.find(f => f.id === 'testi-v3-title');
        const reviewSourceField = activeGroup.fields.find(f => f.id === 'review-source');
        
        if (reviewTitleField) html += renderSingleField(reviewTitleField, defaults, overrides);
        if (reviewSourceField) html += renderSingleField(reviewSourceField, defaults, overrides);
        
        let activeCount = 0;
        
        for (let i = 1; i <= 10; i++) {
            const textField = activeGroup.fields.find(f => f.id === `review-${i}-text`);
            const nameField = activeGroup.fields.find(f => f.id === `review-${i}-name`);
            const flagField = activeGroup.fields.find(f => f.id === `review-${i}-flag`);
            
            if (!textField) continue;
            
            const currentText = overrides[textField.id] !== undefined ? overrides[textField.id] : (defaults[textField.id] || '');
            
            if (currentText.trim() === '-' || currentText.includes('laat "-" staan')) {
                continue;
            }
            
            activeCount++;
            
            html += `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:15px; position:relative;">
                    <div style="position:absolute; top:15px; right:15px;">
                        <button class="action-btn" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; padding:6px 12px; font-size:0.8rem; cursor:pointer; border-radius:4px;" onclick="removeReviewSlot(${i})">✕ Verwijder</button>
                    </div>
                    <h4 style="margin-top:0; margin-bottom:15px; color:#475569; font-size:0.95rem;">Review ${i}</h4>
                    <div style="display:flex; flex-direction:column; gap:15px;">
                        ${renderSingleField(textField, defaults, overrides)}
                        <div style="display:flex; gap:15px;">
                            <div style="flex:1;">${nameField ? renderSingleField(nameField, defaults, overrides) : ''}</div>
                            <div style="flex:1;">${flagField ? renderSingleField(flagField, defaults, overrides) : ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (activeCount < 10) {
            html += `
                <div style="margin-top:10px;">
                    <button class="action-btn" style="background:white; color:#0f172a; border:2px dashed #cbd5e1; width:100%; padding:15px; border-radius:8px; font-weight:600; cursor:pointer; transition:all 0.2s;" onclick="addReviewSlot()">+ Review Toevoegen</button>
                </div>
            `;
        } else {
            html += `<div style="text-align:center; font-size:0.85rem; color:#64748b; margin-top:10px;">Maximum van 10 reviews bereikt.</div>`;
        }
        
    } else {
        for (const fieldItem of activeGroup.fields) {
            if (Array.isArray(fieldItem)) {
                html += `<div style="display:flex; gap:20px; align-items:flex-start; width:100%;">`;
                for (const field of fieldItem) {
                    html += renderSingleField(field, defaults, overrides);
                }
                html += `</div>`;
            } else {
                html += renderSingleField(fieldItem, defaults, overrides);
            }
        }
    }
    
    html += `
            </div>
        </div>
    </div>`;
    
    return html;
}

function renderSingleField(field, defaults, overrides) {
    const defaultValue = defaults[field.id] || '';
    const currentVal = overrides[field.id] !== undefined ? overrides[field.id] : defaultValue;
    const isTextarea = currentVal.length > 60 || defaultValue.length > 60;
    const isFlag = field.id.endsWith('-flag');
    
    // Zorg voor placeholder tekst
    const placeholderEscaped = defaultValue ? defaultValue.replace(/"/g, '&quot;') : '';
    const valEscaped = currentVal ? currentVal.replace(/"/g, '&quot;') : '';

    let inputHtml = '';
    
    if (isFlag) {
        inputHtml = `
            <select data-text-key="${field.id}" class="eb2-input" style="cursor:pointer; font-family:inherit; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.9rem; width:100%;">
                <option value="-" ${valEscaped === '-' || !valEscaped ? 'selected' : ''}>Geen vlag (Verbergen)</option>
                <option value="🇳🇱" ${valEscaped === '🇳🇱' ? 'selected' : ''}>Nederland 🇳🇱</option>
                <option value="🇧🇪" ${valEscaped === '🇧🇪' ? 'selected' : ''}>België 🇧🇪</option>
                <option value="🇩🇪" ${valEscaped === '🇩🇪' ? 'selected' : ''}>Duitsland 🇩🇪</option>
                <option value="🇬🇧" ${valEscaped === '🇬🇧' ? 'selected' : ''}>Verenigd Koninkrijk 🇬🇧</option>
                <option value="🇫🇷" ${valEscaped === '🇫🇷' ? 'selected' : ''}>Frankrijk 🇫🇷</option>
                <option value="🇦🇹" ${valEscaped === '🇦🇹' ? 'selected' : ''}>Oostenrijk 🇦🇹</option>
                <option value="🇨🇭" ${valEscaped === '🇨🇭' ? 'selected' : ''}>Zwitserland 🇨🇭</option>
            </select>
        `;
    } else if (isTextarea) {
        inputHtml = `<textarea data-text-key="${field.id}" rows="3" class="eb2-input" placeholder="${placeholderEscaped}">${valEscaped}</textarea>`;
    } else {
        inputHtml = `<input type="text" data-text-key="${field.id}" value="${valEscaped}" class="eb2-input" placeholder="${placeholderEscaped}">`;
    }

    return `
        <div class="eb2-form-group" style="margin:0;">
            <label style="color:#64748b; font-size:0.85rem; font-weight:600;">${field.label}</label>
            <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:4px; font-family:monospace;">ID: ${field.id}</div>
            ${inputHtml}
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
    const changedKeys = saveCurrentTabToOverrides() || [];

    try {
        await _firebaseSetDoc(_firebaseDoc(_firebaseDb, 'settings', 'translations'), _overrides);

        if (window.logActivity) {
            let changeDetails = '';
            if (changedKeys.length > 0) {
                // Find group names
                let groups = new Set();
                changedKeys.forEach(k => {
                    let foundGroup = 'Overig';
                    if (_activePage === 'home' && window.HOME_PAGE_GROUPS) {
                        for (const g of window.HOME_PAGE_GROUPS) {
                            for (const f of g.fields) {
                                if (Array.isArray(f)) {
                                    if (f.find(sub => sub.id === k)) {
                                        foundGroup = g.title.replace('#', '');
                                        break;
                                    }
                                } else if (f.id === k) {
                                    foundGroup = g.title.replace('#', '');
                                    break;
                                }
                            }
                            if (foundGroup !== 'Overig') break;
                        }
                    } else if (_activePage === 'lodge' && window.LODGE_PAGE_GROUPS) {
                        for (const g of window.LODGE_PAGE_GROUPS) {
                            for (const f of g.fields) {
                                if (Array.isArray(f)) {
                                    if (f.find(sub => sub.id === k)) {
                                        foundGroup = g.title.replace('#', '');
                                        break;
                                    }
                                } else if (f.id === k) {
                                    foundGroup = g.title.replace('#', '');
                                    break;
                                }
                            }
                            if (foundGroup !== 'Overig') break;
                        }
                    }
                    groups.add(foundGroup.trim());
                });
                const groupNames = Array.from(groups).join(', ');
                changeDetails = ` (${_activeLang.toUpperCase()} - ${_activePage.toUpperCase()} - ${groupNames})`;
            } else {
                changeDetails = ` (${_activeLang.toUpperCase()} - ${_activePage.toUpperCase()})`;
            }

            window.logActivity('Website update', `Teksten bijgewerkt${changeDetails}`, 'website');
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

window.removeReviewSlot = function(index) {
    if (!confirm('Weet je zeker dat je deze review wilt verwijderen?')) return;
    saveCurrentTabToOverrides();
    if (!_overrides[_activeLang]) _overrides[_activeLang] = {};
    _overrides[_activeLang][`review-${index}-text`] = '-';
    _overrides[_activeLang][`review-${index}-name`] = '-';
    _overrides[_activeLang][`review-${index}-flag`] = '-';
    renderTextsEditor();
};

window.addReviewSlot = function() {
    saveCurrentTabToOverrides();
    if (!_overrides[_activeLang]) _overrides[_activeLang] = {};
    
    let availableIndex = -1;
    for (let i = 1; i <= 10; i++) {
        const currentText = _overrides[_activeLang][`review-${i}-text`] !== undefined 
            ? _overrides[_activeLang][`review-${i}-text`] 
            : (_defaultTranslations[_activeLang][`review-${i}-text`] || '');
            
        if (currentText.trim() === '-' || currentText.includes('laat "-" staan')) {
            availableIndex = i;
            break;
        }
    }
    
    if (availableIndex !== -1) {
        _overrides[_activeLang][`review-${availableIndex}-text`] = 'Nieuwe review tekst...';
        _overrides[_activeLang][`review-${availableIndex}-name`] = 'Naam';
        _overrides[_activeLang][`review-${availableIndex}-flag`] = '-';
        renderTextsEditor();
    }
};

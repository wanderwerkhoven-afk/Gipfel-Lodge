/* MODULE: Pricing */

// --- PRICING DB LOGIC ---
// Render pricing versions with target container support
window.loadPricingVersions = async function(targetId = 'pricing-versions-container') {
    const container = document.getElementById(targetId);
    if (!container) return;
    
    const { db, collection, getDocs, query, orderBy } = await import('../site_js/core/firebase.js');

    try {
        const q = query(collection(db, 'pricing_versions'), orderBy('effectiveDate', 'desc'));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">Geen prijslijsten gevonden in Firebase.</div>';
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const dateCount = Object.keys(data.prices || {}).length;
            
            html += `
                <div class="pricing-version-item" style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; overflow: hidden; background: white;">
                    <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; cursor: pointer;" onclick="togglePricingTable('${id}')">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="background: var(--color-gold); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                <i class="ph ph-calendar"></i>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #1e293b;">Ingangsdatum: ${data.effectiveDate}</div>
                                <div style="font-size: 0.75rem; color: #64748b;">${dateCount} dagen geconfigureerd · Toegevoegd op ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Onbekend'}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            ${currentUserRole === 'superuser' ? `
                                <button class="eb2-action-btn eb2-btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="event.stopPropagation(); deletePricingVersion('${id}', '${data.effectiveDate}')">
                                    <i class="ph ph-trash"></i>
                                </button>
                            ` : ''}
                            <i class="ph ph-caret-down pricing-caret-${id}" style="transition: transform 0.3s; color: #94a3b8;"></i>
                        </div>
                    </div>
                    <div id="pricing-table-${id}" style="display: none; padding: 15px; border-top: 1px solid #f1f5f9; max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr style="text-align: left; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                                    <th style="padding: 8px;">Datum</th>
                                    <th style="padding: 8px;">Dagprijs</th>
                                    <th style="padding: 8px;">Seizoen</th>
                                    <th style="padding: 8px;">Min. Boeken</th>
                                    <th style="padding: 8px;">Min. Betalen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(data.prices || {}).sort((a,b) => a[0].localeCompare(b[0])).map(([date, p]) => `
                                    <tr style="border-bottom: 1px solid #f8fafc;">
                                        <td style="padding: 6px 8px; font-family: monospace;">${date}</td>
                                        <td style="padding: 6px 8px; font-weight: 600; color: var(--color-gold);">€${Number(p.dagprijs || 0).toFixed(2)}</td>
                                        <td style="padding: 6px 8px;">${p.seizoen || '-'}</td>
                                        <td style="padding: 6px 8px; text-align: center;">${p.min_nachten_boeken || '-'}</td>
                                        <td style="padding: 6px 8px; text-align: center;">${p.min_nachten_betalen || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Error loading pricing versions:", err);
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Fout bij laden: ${err.message}</div>`;
    }
};

window.togglePricingTable = function(id) {
    const table = document.getElementById(`pricing-table-${id}`);
    const caret = document.querySelector(`.pricing-caret-${id}`);
    if (!table) return;
    
    // Check current state
    const isHidden = table.style.display === 'none' || table.style.display === '';
    
    if (isHidden) {
        table.style.display = 'block';
        if (caret) caret.style.transform = 'rotate(180deg)';
    } else {
        table.style.display = 'none';
        if (caret) caret.style.transform = 'rotate(0deg)';
    }
};

// --- PRICING PAGE & DISCOUNT LOGIC ---
let _allDiscountPresets = [];

window.initPricingView = async function() {
    console.log("Initializing Pricing & Discounts View...");
    await loadDiscountPresets();
    window.loadPricingVersions('pricing-view-versions-container');
};

window.loadDiscountPresets = async function() {
    const { db, collection, getDocs, doc, getDoc, query, orderBy } = await import('../site_js/core/firebase.js');

    try {
        // 1. Load active setting
        const settingsDoc = await getDoc(doc(db, 'settings', 'pricing'));
        let activeId = 'none';
        if (settingsDoc.exists()) {
            activeId = settingsDoc.data().activePresetId || 'none';
        }
        window._currentActiveDiscountId = activeId;

        // 2. Load all presets
        const q = query(collection(db, 'discount_presets'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        
        _allDiscountPresets = [];
        
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const d = { id: docSnap.id, ...data };
            _allDiscountPresets.push(d);
        });

        renderAllDiscountRules();
    } catch (err) {
        console.error("Error loading discount presets:", err);
    }
};

window.renderAllDiscountRules = function() {
    const container = document.getElementById('all-discount-rules-container');
    if (!container) return;
    
    const activeId = window._currentActiveDiscountId || 'none';

    if (!_allDiscountPresets || _allDiscountPresets.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; text-align:center; padding: 20px;">Geen automatische regels gevonden. Maak er één aan.</div>';
        return;
    }

    let html = '<div class="eb2-discount-list">';
    
    _allDiscountPresets.forEach(preset => {
        const isActive = preset.id === activeId;
        
        // Sort by days descending
        const sortedTiers = [...preset.tiers].sort((a,b) => b.days - a.days);
        
        html += `
            <div class="discount-item ${isActive ? 'active' : ''}">
                <div class="discount-item-header">
                    <div class="discount-item-title" style="cursor:pointer;" onclick="toggleActiveDiscount('${preset.id}')">
                        <i class="ph ${isActive ? 'ph-check-square' : 'ph-square'}"></i>
                        <span>${preset.name}</span>
                    </div>
                    <button class="discount-item-delete" onclick="deleteDiscountPreset('${preset.id}')">
                        <i class="ph ph-trash"></i> Verwijderen
                    </button>
                </div>
                <div class="discount-timeline">
                    <div class="discount-timeline-days">
        `;
        
        // Add the days text row
        sortedTiers.forEach((tier, index) => {
            const nextDays = sortedTiers[index + 1] ? sortedTiers[index + 1].days : 0;
            const weight = tier.days - nextDays;
            html += `<div style="flex: ${weight} 1 0%; border-left: 1px dashed #cbd5e1; padding-left: 6px;">${tier.days} d</div>`;
        });
        
        html += `
                    </div>
                    <div class="discount-timeline-bars">
        `;
        
        // Add the percentages bar row
        sortedTiers.forEach((tier, index) => {
            const nextDays = sortedTiers[index + 1] ? sortedTiers[index + 1].days : 0;
            const weight = tier.days - nextDays;
            html += `
                        <div class="discount-tier-segment" style="flex: ${weight} 1 0%;">
                            ${tier.percentage}%
                        </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
};

window.toggleActiveDiscount = async function(id) {
    // Toggle off if it's already active
    const newActiveId = (window._currentActiveDiscountId === id) ? 'none' : id;
    window._currentActiveDiscountId = newActiveId;
    
    // Re-render immediately for visual feedback
    renderAllDiscountRules();
    
    // Call save
    await saveActiveDiscount(newActiveId);
};

window.saveActiveDiscount = async function(id) {
    const { db, doc, setDoc } = await import('../site_js/core/firebase.js');
    
    try {
        await setDoc(doc(db, 'settings', 'pricing'), {
            activePresetId: id,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showToast("Succes", "Kortingsinstelling opgeslagen.");
        logActivity('Discount Update', `Actieve kortingsregel gewijzigd naar ${id}`);
    } catch (err) {
        alert("Fout bij opslaan: " + err.message);
    }
};

window.openDiscountModal = function() {
    document.getElementById('discount-modal-name').value = '';
    document.getElementById('discount-modal-tiers').innerHTML = '';
    addDiscountTierRow(); // Add one empty row by default
    document.getElementById('discount-modal-overlay').classList.add('active');
};

window.closeDiscountModal = function() {
    document.getElementById('discount-modal-overlay').classList.remove('active');
};

window.addDiscountTierRow = function(days = '', percentage = '') {
    const container = document.getElementById('discount-modal-tiers');
    const row = document.createElement('div');
    row.className = 'discount-tier-row';
    row.innerHTML = `
        <input type="number" class="discount-tier-input tier-days" placeholder="Dagen vantevoren (bijv. 42)" value="${days}">
        <input type="number" class="discount-tier-input tier-percentage" placeholder="Korting % (bijv. 20)" value="${percentage}">
        <button class="btn-tier-remove" onclick="this.parentElement.remove()">
            <i class="ph ph-trash"></i>
        </button>
    `;
    container.appendChild(row);
};

window.saveDiscountPresetFromModal = async function() {
    const name = document.getElementById('discount-modal-name').value.trim();
    if (!name) { alert("Voer een naam in."); return; }

    const tierRows = document.querySelectorAll('.discount-tier-row');
    const tiers = [];
    
    tierRows.forEach(row => {
        const days = parseInt(row.querySelector('.tier-days').value);
        const percentage = parseInt(row.querySelector('.tier-percentage').value);
        if (!isNaN(days) && !isNaN(percentage)) {
            tiers.push({ days, percentage });
        }
    });

    if (tiers.length === 0) {
        alert("Voeg minimaal één geldige stap toe.");
        return;
    }

    try {
        const { db, collection, addDoc } = await import('../site_js/core/firebase.js');
        await addDoc(collection(db, 'discount_presets'), {
            name,
            tiers,
            createdAt: new Date().toISOString()
        });

        showToast("Succes", "Kortingsregel aangemaakt.");
        closeDiscountModal();
        loadDiscountPresets();
    } catch (err) {
        alert("Fout bij opslaan: " + err.message);
    }
};

window.openNewDiscountModal = async function() {
    openDiscountModal();
};

window.deleteDiscountPreset = async function(id) {
    if (!confirm("Weet u zeker dat u deze kortingsregel wilt verwijderen?")) return;
    
    try {
        const { db, doc, deleteDoc } = await import('../site_js/core/firebase.js');
        await deleteDoc(doc(db, 'discount_presets', id));
        showToast("Verwijderd", "Kortingsregel verwijderd.");
        loadDiscountPresets();
    } catch (err) {
        alert("Fout bij verwijderen: " + err.message);
    }
};

window.deletePricingVersion = async function(id, date) {
    const confirm1 = confirm(`Weet je zeker dat je de prijslijst van ${date} wilt verwijderen?`);
    if (!confirm1) return;
    
    const confirm2 = confirm(`LET OP: Dit kan gevolgen hebben voor prijsberekeningen. Weet je het HEEL zeker? Dit is een onomkeerbare actie.`);
    if (!confirm2) return;

    const { db, doc, deleteDoc } = await import('../site_js/core/firebase.js');
    try {
        await deleteDoc(doc(db, 'pricing_versions', id));
        logActivity('Pricing Delete', `Prijslijst verwijderd voor ingangsdatum ${date}`, id);
        loadPricingVersions();
    } catch (err) {
        alert("Fout bij verwijderen: " + err.message);
    }
};

window.uploadPricingFile = async function() {
    const effDate = document.getElementById('pricing-effective-date').value;
    if (!effDate) {
        alert("Selecteer eerst een ingangsdatum.");
        return;
    }

    if (!_pricingParsed) return;

    const { db, doc, setDoc, serverTimestamp } = await import('../site_js/core/firebase.js');
    
    try {
        const docId = `price_list_${effDate.replace(/-/g, '')}`;
        await setDoc(doc(db, 'pricing_versions', docId), {
            effectiveDate: effDate,
            prices: _pricingParsed,
            createdAt: serverTimestamp()
        });

        alert("Prijslijst succesvol opgeslagen!");
        logActivity('Pricing Upload', `Nieuwe prijslijst geüpload voor ingangsdatum ${effDate}`, docId);
        resetPricingUpload();
        loadPricingVersions();
    } catch (err) {
        console.error("Upload failed:", err);
        alert("Fout bij opslaan: " + err.message);
    }
};

window.resetPricingUpload = function() {
    _pricingParsed = null;
    document.getElementById('pricing-file-input').value = '';
    document.getElementById('pricing-upload-confirm').style.display = 'none';
    document.getElementById('pricing-drop-zone').style.borderColor = '';
    document.getElementById('pricing-drop-zone').style.background = '';
    document.getElementById('pricing-effective-date').value = '';
};

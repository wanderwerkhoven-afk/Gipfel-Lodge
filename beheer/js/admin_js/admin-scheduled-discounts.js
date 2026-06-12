/* MODULE: Geplande Datumkortingen (Scheduled Discounts) */

/* ============================================================
 * SLUG UTILITY
 * ============================================================ */
function generateScheduledDiscountSlug(name) {
    return name
        .toLowerCase()
        .replace(/[\/\\]/g, '-')
        .replace(/[^a-z0-9\-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function getUniqueScheduledSlug(db, docFn, getDocFn, baseSlug) {
    const baseSnap = await getDocFn(docFn(db, 'scheduled_discounts', baseSlug));
    if (!baseSnap.exists()) return baseSlug;
    for (let i = 2; i <= 99; i++) {
        const candidate = `${baseSlug}-${i}`;
        const snap = await getDocFn(docFn(db, 'scheduled_discounts', candidate));
        if (!snap.exists()) return candidate;
    }
    throw new Error('Kon geen unieke slug genereren.');
}

/* ============================================================
 * STATE
 * ============================================================ */
let _scheduledDiscounts = [];
let _scheduledCalendarDate = new Date();
let _editingScheduledId = null;
let _sdBookedDates = [];

/* ============================================================
 * LOAD & RENDER OVERVIEW
 * ============================================================ */
window.loadScheduledDiscounts = async function () {
    const container = document.getElementById('scheduled-discounts-container');
    if (!container) return [];

    container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Laden...</div>';

    try {
        const { db, collection, getDocs, query, orderBy } = await import('../site_js/core/firebase.js');
        const [sdSnap, availSnap] = await Promise.all([
            getDocs(query(collection(db, 'scheduled_discounts'), orderBy('startDate', 'asc'))),
            getDocs(query(collection(db, 'public_availability')))
        ]);

        _scheduledDiscounts = [];
        sdSnap.forEach(docSnap => {
            _scheduledDiscounts.push({ id: docSnap.id, ...docSnap.data() });
        });

        _sdBookedDates = [];
        availSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (!data.checkIn || !data.checkOut) return;
            if (data.status !== 'confirmed' && data.status !== 'pending' && data.status !== 'owner' && data.status) return;

            let current = new Date(data.checkIn);
            current.setHours(12, 0, 0, 0);
            const end = new Date(data.checkOut);
            end.setHours(12, 0, 0, 0);
            
            while (current < end) {
                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, '0');
                const d = String(current.getDate()).padStart(2, '0');
                _sdBookedDates.push(`${y}-${m}-${d}`);
                current.setDate(current.getDate() + 1);
            }
        });

        renderScheduledDiscountsUI();
        return _scheduledDiscounts;
    } catch (err) {
        console.error('Error loading scheduled discounts:', err);
        container.innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;">Fout bij laden: ${err.message}</div>`;
        return [];
    }
};

function getScheduledDiscountStatus(d) {
    if (!d.active) return 'inactive';
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(d.startDate + 'T00:00:00');
    const end   = new Date(d.endDate   + 'T23:59:59');
    if (end < today) return 'expired';
    if (start > today) return 'future';
    return 'active';
}

function statusBadgeHTML(status) {
    const map = {
        active:   { label: 'Actief',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        inactive: { label: 'Inactief',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
        future:   { label: 'Toekomstig', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        expired:  { label: 'Verlopen',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
    };
    const s = map[status] || map.inactive;
    return `<span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
        padding:3px 8px; border-radius:20px; background:${s.bg}; color:${s.color};">${s.label}</span>`;
}

function renderScheduledDiscountsUI() {
    const container = document.getElementById('scheduled-discounts-container');
    if (!container) return;

    // Reset calendar to current month
    _scheduledCalendarDate = new Date();
    _scheduledCalendarDate.setDate(1);

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 340px; gap:20px; align-items:start;" class="sd-grid-layout">
            <!-- Kalender -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <button onclick="sdCalPrev()" style="background:#f1f5f9; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:1rem;">‹</button>
                    <span id="sd-cal-title" style="font-weight:700; color:#1e293b;"></span>
                    <button onclick="sdCalNext()" style="background:#f1f5f9; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:1rem;">›</button>
                </div>
                <div id="sd-cal-grid" style="display:grid; grid-template-columns:repeat(7,1fr); gap:3px;"></div>
                <div style="display:flex; gap:16px; margin-top:12px; flex-wrap:wrap;">
                    <span style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#64748b;">
                        <span style="width:12px; height:12px; border-radius:3px; background:rgba(197,160,89,0.35); display:inline-block;"></span> Actieve korting
                    </span>
                    <span style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#64748b;">
                        <span style="width:12px; height:12px; border-radius:3px; background:rgba(59,130,246,0.2); display:inline-block;"></span> Toekomstige korting
                    </span>
                    <span style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#64748b;">
                        <span style="width:12px; height:12px; border-radius:3px; background:rgba(16, 185, 129, 0.2); display:inline-block;"></span> Last Minute
                    </span>
                    <span style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#64748b;">
                        <span style="width:12px; height:12px; border-radius:3px; background:rgba(251, 146, 60, 0.2); display:inline-block;"></span> Bezet (Geboekt)
                    </span>
                    <span style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#64748b;">
                        <span style="width:12px; height:12px; border-radius:3px; background:rgba(148,163,184,0.2); display:inline-block;"></span> Inactief / Verlopen
                    </span>
                </div>
            </div>

            <!-- Lijst -->
            <div>
                <div style="font-size:0.75rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Alle Kortingen</div>
                <div id="sd-list" style="display:flex; flex-direction:column; gap:8px;"></div>
            </div>
        </div>

        <style>
            @media(max-width:700px){ .sd-grid-layout{ grid-template-columns:1fr !important; } }
        </style>
    `;

    renderSDCalendar();
    renderSDList();
}

function renderSDCalendar() {
    const grid = document.getElementById('sd-cal-grid');
    const title = document.getElementById('sd-cal-title');
    if (!grid || !title) return;

    const year  = _scheduledCalendarDate.getFullYear();
    const month = _scheduledCalendarDate.getMonth();
    const monthNames = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
    const dayNames   = ['Ma','Di','Wo','Do','Vr','Za','Zo'];

    title.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';

    // Day headers
    dayNames.forEach(d => {
        const el = document.createElement('div');
        el.style.cssText = 'text-align:center; font-size:0.7rem; font-weight:700; color:#94a3b8; padding:4px 0;';
        el.textContent = d;
        grid.appendChild(el);
    });

    const today = new Date(); today.setHours(0,0,0,0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay() - 1;
    if (firstDay === -1) firstDay = 6;

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        grid.appendChild(el);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const cellDate = new Date(year, month, i);

        // Find which discounts cover this day
        const matching = _scheduledDiscounts.filter(d => dateStr >= d.startDate && dateStr <= d.endDate);

        const el = document.createElement('div');
        el.style.cssText = `
            text-align:center; border-radius:6px; padding:5px 2px;
            font-size:0.8rem; font-weight:500; position:relative; cursor:default;
            min-height:34px; display:flex; flex-direction:column; align-items:center; justify-content:center;
        `;

        let bgColor = 'transparent';
        let color   = cellDate < today ? '#cbd5e1' : '#1e293b';
        let title_  = '';

        const isBooked = _sdBookedDates.includes(dateStr);

        let lastMinPct = 0;
        let lastMinName = '';
        if (window._currentActiveDiscountId && window._currentActiveDiscountId !== 'none' && window._allDiscountPresets) {
            const activePreset = window._allDiscountPresets.find(p => p.id === window._currentActiveDiscountId);
            if (activePreset && Array.isArray(activePreset.tiers) && cellDate >= today) {
                const diffTime = cellDate.getTime() - today.getTime();
                const daysUntil = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                
                // Parse strings safely just in case they are stored as strings in DB
                const safeTiers = activePreset.tiers.map(t => ({ 
                    days: parseInt(t.days, 10) || 0, 
                    percentage: parseInt(t.percentage, 10) || 0 
                }));
                
                const sortedTiers = safeTiers.sort((a, b) => a.days - b.days);
                const matchingTier = sortedTiers.find(t => daysUntil <= t.days);
                
                if (matchingTier && matchingTier.percentage > 0) {
                    lastMinPct = matchingTier.percentage;
                    lastMinName = activePreset.name || 'Last Minute';
                }
            }
        }

        let schedPct = 0;
        let schedStatuses = [];
        if (matching.length > 0) {
            schedStatuses = matching.map(d => getScheduledDiscountStatus(d));
            schedPct = Math.max(...matching.map(d => d.percentage || 0));
        }

        const maxPct = Math.max(lastMinPct, schedPct);

        if (isBooked) {
            bgColor = 'rgba(251, 146, 60, 0.2)'; // Orange for booked
            color = '#ea580c';
            el.innerHTML = `<span>${i}</span>`;
            el.title = 'Geboekt';
            if (maxPct > 0) {
                el.style.border = '1px dashed rgba(197,160,89,0.5)';
            }
        } else if (maxPct > 0) {
            if (lastMinPct > schedPct) {
                bgColor = 'rgba(16, 185, 129, 0.15)'; // Greenish for last minute
                color = '#047857';
                title_ = `Last Minute: ${lastMinName}`;
            } else {
                if (schedStatuses.includes('active'))   { bgColor = 'rgba(197,160,89,0.35)'; color = '#92700a'; }
                else if (schedStatuses.includes('future'))  { bgColor = 'rgba(59,130,246,0.15)'; color = '#1d4ed8'; }
                else                                   { bgColor = 'rgba(148,163,184,0.18)'; color = '#64748b'; }
                title_ = matching.map(d => d.name).join(', ');
            }

            el.innerHTML = `
                <span>${i}</span>
                <span style="font-size:0.6rem; font-weight:700; color:inherit; line-height:1;">-${maxPct}%</span>
            `;
            el.title = title_;
            if (schedPct >= lastMinPct && matching.length > 0) {
                el.style.cursor = 'pointer';
                el.onclick = () => openScheduledDiscountModal(matching[0].id);
            }
        } else {
            el.textContent = i;
        }

        el.style.background = bgColor;
        el.style.color = color;
        grid.appendChild(el);
    }
}

function renderSDList() {
    const list = document.getElementById('sd-list');
    if (!list) return;

    if (_scheduledDiscounts.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px; font-size:0.85rem;">Geen kortingen gevonden. Maak er één aan.</div>';
        return;
    }

    const sorted = [..._scheduledDiscounts].sort((a, b) => a.startDate.localeCompare(b.startDate));

    list.innerHTML = sorted.map(d => {
        const status = getScheduledDiscountStatus(d);
        const badge  = statusBadgeHTML(status);
        return `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; cursor:pointer;"
                 onclick="openScheduledDiscountModal('${d.id}')"
                 onmouseover="this.style.borderColor='#C5A059'" onmouseout="this.style.borderColor='#e2e8f0'">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; color:#1e293b; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.name}</div>
                        <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">${d.startDate} → ${d.endDate}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                        <span style="font-size:1rem; font-weight:800; color:#C5A059;">-${d.percentage}%</span>
                        ${badge}
                    </div>
                </div>
                ${d.note ? `<div style="font-size:0.72rem; color:#94a3b8; margin-top:6px; font-style:italic;">${d.note}</div>` : ''}
            </div>
        `;
    }).join('');
}

window.sdCalPrev = function () {
    _scheduledCalendarDate.setMonth(_scheduledCalendarDate.getMonth() - 1);
    renderSDCalendar();
};
window.sdCalNext = function () {
    _scheduledCalendarDate.setMonth(_scheduledCalendarDate.getMonth() + 1);
    renderSDCalendar();
};

/* ============================================================
 * MODAL — CREATE / EDIT
 * ============================================================ */
window.openScheduledDiscountModal = async function (id = null) {
    _editingScheduledId = id;

    let preset = null;
    if (id) {
        preset = _scheduledDiscounts.find(d => d.id === id);
        if (!preset) {
            // Fetch from Firestore if not in memory
            try {
                const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
                const snap = await getDoc(doc(db, 'scheduled_discounts', id));
                if (snap.exists()) preset = { id: snap.id, ...snap.data() };
            } catch (e) { console.error(e); }
        }
    }

    // Populate form
    document.getElementById('sd-modal-name').value         = preset?.name        || '';
    document.getElementById('sd-modal-percentage').value   = preset?.percentage  || '';
    document.getElementById('sd-modal-start').value        = preset?.startDate   || '';
    document.getElementById('sd-modal-end').value          = preset?.endDate     || '';
    document.getElementById('sd-modal-active').checked     = preset ? (preset.active !== false) : true;
    document.getElementById('sd-modal-minnights').value    = preset?.minNights   || '';
    document.getElementById('sd-modal-note').value         = preset?.note        || '';
    document.getElementById('sd-modal-title').textContent  = id ? 'Korting Bewerken' : 'Nieuwe Datumkorting';
    document.getElementById('sd-modal-delete-btn').style.display = id ? 'block' : 'none';

    document.getElementById('sd-modal-overlay').classList.add('active');
};

window.closeScheduledDiscountModal = function () {
    document.getElementById('sd-modal-overlay').classList.remove('active');
    _editingScheduledId = null;
};

window.saveScheduledDiscountFromModal = async function () {
    const name       = document.getElementById('sd-modal-name').value.trim();
    const percentage = parseInt(document.getElementById('sd-modal-percentage').value);
    const startDate  = document.getElementById('sd-modal-start').value;
    const endDate    = document.getElementById('sd-modal-end').value;
    const active     = document.getElementById('sd-modal-active').checked;
    const minNights  = parseInt(document.getElementById('sd-modal-minnights').value) || 0;
    const note       = document.getElementById('sd-modal-note').value.trim();

    if (!name)              { alert('Voer een naam in.');            return; }
    if (!percentage || isNaN(percentage) || percentage < 1 || percentage > 100) {
        alert('Voer een geldig kortingspercentage in (1–100).');     return; }
    if (!startDate)         { alert('Kies een startdatum.');         return; }
    if (!endDate)           { alert('Kies een einddatum.');          return; }
    if (endDate < startDate){ alert('Einddatum moet na startdatum liggen.'); return; }

    const payload = {
        name, percentage, startDate, endDate, active,
        ...(minNights > 0 ? { minNights } : {}),
        ...(note       ? { note }       : {}),
        updatedAt: new Date().toISOString(),
    };

    try {
        const { db, doc, getDoc, setDoc } = await import('../site_js/core/firebase.js');

        let docId = _editingScheduledId;

        if (!docId) {
            // New document — generate slug
            payload.createdAt = new Date().toISOString();
            const baseSlug = generateScheduledDiscountSlug(name);
            if (!baseSlug) { alert('Naam bevat geen geldige tekens.'); return; }
            docId = await getUniqueScheduledSlug(db, doc, getDoc, baseSlug);
        }

        await setDoc(doc(db, 'scheduled_discounts', docId), payload, { merge: true });

        showToast('Succes', _editingScheduledId ? 'Korting bijgewerkt.' : `Korting aangemaakt (ID: ${docId}).`);
        closeScheduledDiscountModal();
        loadScheduledDiscounts();
    } catch (err) {
        alert('Fout bij opslaan: ' + err.message);
    }
};

window.deleteScheduledDiscount = async function () {
    if (!_editingScheduledId) return;
    if (!confirm(`Weet je zeker dat je deze korting wilt verwijderen?`)) return;

    try {
        const { db, doc, deleteDoc } = await import('../site_js/core/firebase.js');
        await deleteDoc(doc(db, 'scheduled_discounts', _editingScheduledId));
        showToast('Verwijderd', 'Korting verwijderd.');
        closeScheduledDiscountModal();
        loadScheduledDiscounts();
    } catch (err) {
        alert('Fout bij verwijderen: ' + err.message);
    }
};

/* ============================================================
 * HELPER — used by booking.js (public website)
 * Exported-style: attached to window for non-module access.
 * ============================================================ */

/**
 * Determine the scheduled discount percentage for a given date string,
 * respecting active status and optional minNights constraint.
 *
 * @param {string}   dateStr   - 'YYYY-MM-DD'
 * @param {Array}    discounts - array of scheduled_discount objects
 * @param {number}   nights    - total nights of the stay (for minNights check)
 * @returns {number} percentage (0 if no match)
 */
window.getScheduledDiscountPct = function (dateStr, discounts, nights = 0) {
    if (!discounts || discounts.length === 0) return 0;

    const today = new Date(); today.setHours(0,0,0,0);

    let best = 0;
    for (const d of discounts) {
        if (!d.active) continue;
        if (new Date(d.endDate + 'T23:59:59') < today) continue; // expired
        if (dateStr < d.startDate || dateStr > d.endDate) continue;
        if (d.minNights && nights > 0 && nights < d.minNights) continue;
        if ((d.percentage || 0) > best) best = d.percentage;
    }
    return best;
};

/**
 * Find the best matching scheduled discount name for a date range.
 * Used to populate `appliedDiscountName` in calculateCosts.
 */
window.getScheduledDiscountName = function (checkInStr, checkOutStr, discounts, nights = 0) {
    if (!discounts || discounts.length === 0) return '';
    const today = new Date(); today.setHours(0,0,0,0);
    let best = null; let bestPct = 0;
    for (const d of discounts) {
        if (!d.active) continue;
        if (new Date(d.endDate + 'T23:59:59') < today) continue;
        // Check overlap with stay
        if (checkOutStr <= d.startDate || checkInStr >= d.endDate) continue;
        if (d.minNights && nights > 0 && nights < d.minNights) continue;
        if ((d.percentage || 0) > bestPct) { bestPct = d.percentage; best = d; }
    }
    return best ? `Datumkorting: ${best.name}` : '';
};

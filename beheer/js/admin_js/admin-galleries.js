/**
 * admin-galleries.js
 * Gipfel Lodge Admin - Gallery Management Module (Redesigned)
 * Hierarchical View: Page -> Zones -> Image Selection Modal
 */

const GALLERY_PAGES = [
    {
        id: 'home',
        label: '🏠 Home Pagina',
        zones: ['hero_slider']
    },
    {
        id: 'lodge',
        label: '🛏️ Lodge Pagina',
        zones: ['lodge_top_carousel', 'lodge_mini_ug', 'lodge_mini_1og', 'lodge_mini_2og', 'lodge_gallery']
    },
    {
        id: '_single',
        label: '🖼️ Vaste Afbeeldingen',
        zones: []
    }
];

const GALLERY_ZONES = {
    'hero_slider': { label: 'Hoofd Slider (Hero)', description: 'Achtergrondafbeeldingen bovenaan de pagina.' },
    'lodge_top_carousel': { label: 'Lodge Foto Strip (Bovenaan)', description: 'De horizontaal scrollende fotobalk bovenaan de Lodge pagina.' },
    'lodge_mini_ug': { label: 'Indeling Souterrain (UG)', description: 'Sauna, skiruimte, entree.' },
    'lodge_mini_1og': { label: 'Indeling 1e Verdieping', description: 'Slaapkamers en badkamers.' },
    'lodge_mini_2og': { label: 'Indeling 2e Verdieping', description: 'Keuken, woonkamer, leeshoek.' },
    'lodge_gallery': { label: 'Volledige Galerij (Impressionen)', description: 'Sfeerbeelden van de woning.' }
};

/**
 * Registry of all single-image slots in the site.
 * key: the data-img-key value in HTML
 * label: human-readable name shown in admin
 * page: which page it lives on
 */
const SINGLE_IMAGES = [
    // Home
    { key: 'hero-slide-1',       label: 'Home Hero — Slide 1 (Winter)',         page: 'Home' },
    { key: 'hero-slide-2',       label: 'Home Hero — Slide 2 (Zomer)',          page: 'Home' },
    { key: 'home-accommodatie-1', label: 'Home Accommodatie — Woonkamer',        page: 'Home' },
    { key: 'home-accommodatie-2', label: 'Home Accommodatie — Keuken',           page: 'Home' },
    { key: 'home-accommodatie-3', label: 'Home Accommodatie — Slaapkamer',       page: 'Home' },
    { key: 'home-accommodatie-4', label: 'Home Accommodatie — Terras',           page: 'Home' },
    { key: 'home-accommodatie-5', label: 'Home Accommodatie — Badkamer',         page: 'Home' },
    { key: 'home-accommodatie-6', label: 'Home Accommodatie — Gang',             page: 'Home' },
    { key: 'home-act-1',          label: 'Home Activiteiten — Skiën',            page: 'Home' },
    { key: 'home-act-2',          label: 'Home Activiteiten — Wandelen',         page: 'Home' },
    { key: 'home-act-3',          label: 'Home Activiteiten — Sauna',            page: 'Home' },
    { key: 'home-act-4',          label: 'Home Activiteiten — Natuur',           page: 'Home' },
    { key: 'home-act-5',          label: 'Home Activiteiten — Omgeving',         page: 'Home' },
    { key: 'booking-cta-bg',      label: 'Home Boekings CTA — Achtergrond',      page: 'Home' },
    // Lodge
    { key: 'lodge-cta-bg',        label: 'Lodge CTA — Achtergrond',             page: 'Lodge' },
    // Activities
    { key: 'activities-hero-bg',  label: 'Activiteiten Hero — Achtergrond',     page: 'Activiteiten' },
    { key: 'activities-cta-bg',   label: 'Activiteiten CTA — Achtergrond',      page: 'Activiteiten' },
    // Enjoyment
    { key: 'enjoyment-hero-bg',   label: 'Genieten Hero — Achtergrond',         page: 'Genieten' },
    { key: 'enjoyment-cta-bg',    label: 'Genieten CTA — Achtergrond',          page: 'Genieten' },
    { key: 'enjoyment-loc-1',     label: 'Genieten Locatie 1 — Hofstadl (Lunch)',  page: 'Genieten' },
    { key: 'enjoyment-loc-2',     label: 'Genieten Locatie 2 — Café Freiraum',  page: 'Genieten' },
    { key: 'enjoyment-loc-3',     label: 'Genieten Locatie 3 — Bakkerij',       page: 'Genieten' },
    { key: 'enjoyment-loc-4',     label: 'Genieten Locatie 4 — Jandlalm',       page: 'Genieten' },
    { key: 'enjoyment-loc-5',     label: 'Genieten Locatie 5 — Römerkeller',    page: 'Genieten' },
];

let _allImages = [];
let _galleryConfig = {};
let _singleImagesConfig = {}; // { key: url } from settings/single_images
let _activePageId = null;
let _activeModalZoneId = null;
let _activeSingleKey = null;  // key being edited in single-image picker
let _galleryFilter = '';

/* ─────────────────────────────────────────────────────────────
   INIT & LOAD
   ───────────────────────────────────────────────────────────── */
window.initGalleriesView = async function () {
    renderPageTabs();
    await loadGalleryConfig();
    await loadSingleImagesConfig();
    await loadAllImages();
    selectPage(GALLERY_PAGES[0].id);
};

async function loadAllImages() {
    // First try the live PHP scanner (works on SiteGround with PHP)
    try {
        const phpResp = await fetch('../list-images.php?v=' + Date.now());
        if (phpResp.ok) {
            let data;
            try { data = await phpResp.json(); } catch(jsonErr) { data = null; }
            if (data && data.images && data.images.length > 0) {
                _allImages = data.images;
                console.log(`[galleries] Loaded ${_allImages.length} images via live PHP scan.`);
                return;
            }
        }
    } catch (e) {
        // PHP not available (GitHub Pages / local dev), fall through to static JSON
    }

    // Fallback: static images.json (generated by build script)
    try {
        const resp = await fetch('js/site_js/data/images.json?v=' + Date.now());
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        _allImages = data.images || [];
        console.log(`[galleries] Loaded ${_allImages.length} images via images.json.`);
    } catch (e) {
        console.warn('[galleries] Could not load images.json:', e);
        _allImages = [];
    }
}


async function loadGalleryConfig() {
    try {
        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
        const snap = await getDoc(doc(db, 'settings', 'galleries'));
        _galleryConfig = snap.exists() ? (snap.data().zones || {}) : {};
    } catch (e) {
        console.warn('[galleries] Could not load gallery config:', e);
        _galleryConfig = {};
    }
}

async function loadSingleImagesConfig() {
    try {
        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
        const snap = await getDoc(doc(db, 'settings', 'single_images'));
        _singleImagesConfig = snap.exists() ? (snap.data().images || {}) : {};
    } catch (e) {
        console.warn('[galleries] Could not load single_images config:', e);
        _singleImagesConfig = {};
    }
}

window.refreshImages = async function () {
    const btn = document.getElementById('galleries-refresh-btn');
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Bezig...'; btn.disabled = true; }
    
    await loadAllImages();
    
    // Check if we are in the editor view right now
    if (document.getElementById('gallery-editor-container') && document.getElementById('gallery-editor-container').style.display !== 'none') {
        renderEditorLibrary();
    }
    
    if (btn) { btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Haal afbeeldingen op'; btn.disabled = false; }
    showToast('Afbeeldingen ververst', `Er zijn ${_allImages.length} afbeeldingen gevonden in de bibliotheek.`, 'success');
};

window.saveGalleryConfig = async function () {
    const btn = document.getElementById('galleries-save-btn');
    if (btn) { btn.innerHTML = '<i class="ph ph-spinner"></i> Opslaan...'; btn.disabled = true; }

    try {
        const { db, doc, setDoc } = await import('../site_js/core/firebase.js');
        // Save gallery zones
        await setDoc(doc(db, 'settings', 'galleries'), {
            zones: _galleryConfig,
            updatedAt: new Date().toISOString()
        });
        // Save single images
        await setDoc(doc(db, 'settings', 'single_images'), {
            images: _singleImagesConfig,
            updatedAt: new Date().toISOString()
        });
        showToast('Galerijen opgeslagen', 'De afbeeldingsselectie is bijgewerkt.', 'success');
    } catch (e) {
        showToast('Fout', 'Kon niet opslaan: ' + e.message, 'error');
    } finally {
        if (btn) { btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Wijzigingen Opslaan'; btn.disabled = false; }
    }
};

/* ─────────────────────────────────────────────────────────────
   RENDER TOP-LEVEL (Pages & Zones)
   ───────────────────────────────────────────────────────────── */
function renderPageTabs() {
    const container = document.getElementById('gallery-pages-container');
    if (!container) return;

    container.innerHTML = GALLERY_PAGES.map(page => `
        <button class="eb2-action-btn ${page.id === _activePageId ? 'eb2-btn-primary' : 'eb2-btn-secondary'}" 
                onclick="selectPage('${page.id}')" id="page-tab-${page.id}">
            ${page.label}
        </button>
    `).join('');
}

window.selectPage = function (pageId) {
    _activePageId = pageId;
    renderPageTabs(); // Update active tab styling
    renderZonesForPage(pageId);
};

function renderZonesForPage(pageId) {
    const container = document.getElementById('gallery-zones-container');
    if (!container) return;

    // Special page: single images
    if (pageId === '_single') {
        renderSingleImagesGrid(container);
        return;
    }

    const page = GALLERY_PAGES.find(p => p.id === pageId);
    if (!page) return;

    container.innerHTML = page.zones.map(zoneId => {
        const zoneInfo = GALLERY_ZONES[zoneId];
        const images = _galleryConfig[zoneId] || [];
        
        // Show up to 4 previews
        const previews = images.slice(0, 4).map(src => `<img src="${src}" style="width:100%; height:80px; object-fit:cover; border-radius:4px;">`).join('');
        const previewHtml = images.length > 0 
            ? `<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-top:15px;">${previews}</div>`
            : `<div style="margin-top:15px; height:80px; background:#f1f5f9; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:0.8rem;">Geen foto's ingesteld</div>`;

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px; box-shadow:0 2px 4px rgba(0,0,0,0.02); display:flex; flex-direction:column;">
                <div style="flex:1;">
                    <h3 style="margin:0 0 5px 0; font-size:1.1rem; color:#1e293b;">${zoneInfo.label}</h3>
                    <p style="margin:0; font-size:0.85rem; color:#64748b;">${zoneInfo.description}</p>
                    <div style="margin-top:10px; font-size:0.8rem; font-weight:600; color:var(--color-gold);">
                        ${images.length} foto's gebruikt
                    </div>
                    ${previewHtml}
                </div>
                <button class="eb2-action-btn eb2-btn-secondary" style="width:100%; margin-top:20px; justify-content:center;" onclick="openGalleryEditor('${zoneId}')">
                    <i class="ph ph-pencil-simple"></i> Foto's Beheren
                </button>
            </div>
        `;
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   SINGLE IMAGES GRID
   ───────────────────────────────────────────────────────────── */
function renderSingleImagesGrid(container) {
    // Group by page
    const grouped = {};
    SINGLE_IMAGES.forEach(item => {
        if (!grouped[item.page]) grouped[item.page] = [];
        grouped[item.page].push(item);
    });

    let html = '';
    for (const [pageName, items] of Object.entries(grouped)) {
        html += `<div style="grid-column:1/-1; margin-top:10px; margin-bottom:4px;"><h3 style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:700; margin:0;">${pageName}</h3></div>`;
        html += items.map(item => {
            const currentSrc = _singleImagesConfig[item.key] || '';
            const preview = currentSrc
                ? `<img src="${currentSrc}" style="width:100%; height:120px; object-fit:cover; border-radius:6px 6px 0 0; display:block;">`
                : `<div style="width:100%; height:120px; background:#f1f5f9; border-radius:6px 6px 0 0; display:flex; align-items:center; justify-content:center;"><i class="ph ph-image" style="font-size:2rem; color:#cbd5e1;"></i></div>`;
            return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.04); display:flex; flex-direction:column;">
                ${preview}
                <div style="padding:12px 14px; flex:1;">
                    <p style="margin:0 0 4px 0; font-size:0.85rem; font-weight:600; color:#1e293b;">${item.label}</p>
                    <p style="margin:0; font-size:0.75rem; color:#94a3b8; font-family:monospace;">${item.key}</p>
                </div>
                <div style="padding:0 14px 14px; display:flex; gap:8px;">
                    <button class="eb2-action-btn eb2-btn-secondary" style="flex:1; justify-content:center; font-size:0.8rem;" onclick="openSingleImagePicker('${item.key}')">
                        <i class="ph ph-image"></i> Wijzig
                    </button>
                    ${currentSrc ? `<button class="eb2-action-btn" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5; padding:8px 10px;" onclick="removeSingleImage('${item.key}')" title="Herstel standaard"><i class="ph ph-trash"></i></button>` : ''}
                </div>
            </div>`;
        }).join('');
    }
    container.innerHTML = html;
}

window.openSingleImagePicker = function (key) {
    _activeSingleKey = key;
    const item = SINGLE_IMAGES.find(i => i.key === key);

    document.getElementById('gallery-editor-title').textContent = (item ? item.label : key) + ' — Afbeelding Kiezen';
    document.getElementById('gallery-editor-count').textContent = 'Kies één afbeelding uit de bibliotheek';

    // Show a single-image selected preview panel
    const selectedContainer = document.getElementById('gallery-editor-selected');
    const currentSrc = _singleImagesConfig[key] || '';
    selectedContainer.style.gridTemplateColumns = '1fr';
    if (currentSrc) {
        selectedContainer.innerHTML = `
            <div style="position:relative; background:white; border-radius:6px; overflow:hidden; border:2px solid var(--color-gold);">
                <img src="${currentSrc}" style="width:100%; height:160px; object-fit:cover; display:block;">
                <div style="padding:8px; text-align:center; font-size:0.8rem; color:#64748b;">Huidige afbeelding</div>
            </div>`;
    } else {
        selectedContainer.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8;"><i class="ph ph-image" style="font-size:2rem; margin-bottom:10px; display:block;"></i>Nog geen afbeelding ingesteld.</div>`;
    }

    document.getElementById('gallery-pages-container').style.display = 'none';
    document.getElementById('gallery-zones-container').style.display = 'none';
    document.getElementById('gallery-editor-container').style.display = 'flex';

    renderSingleImageLibrary();
};

function renderSingleImageLibrary() {
    const grid = document.getElementById('gallery-editor-library');
    if (!grid) return;

    const filter = _galleryFilter.toLowerCase();
    const filtered = filter ? _allImages.filter(src => src.toLowerCase().includes(filter)) : _allImages;

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">Geen afbeeldingen gevonden.</div>`;
        return;
    }

    const currentSrc = _singleImagesConfig[_activeSingleKey] || '';
    grid.innerHTML = filtered.map(src => {
        const isSelected = currentSrc === src;
        return `
            <div onclick="selectSingleImage('${src}')" style="position:relative; border-radius:6px; overflow:hidden; cursor:pointer; border:2px solid ${isSelected ? 'var(--color-gold)' : 'transparent'}; opacity:${isSelected ? '0.8' : '1'}; transition:border 0.15s;">
                <img src="${src}" style="width:100%; height:120px; object-fit:cover; display:block;" loading="lazy">
                <div style="font-size:0.7rem; padding:5px 6px; background:#f8fafc; border-top:1px solid #e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${src.split('/').pop()}">${src.split('/').pop()}</div>
                ${isSelected ? `<div style="position:absolute; top:4px; right:4px; background:var(--color-gold); color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-check"></i></div>` : ''}
            </div>`;
    }).join('');
}

window.selectSingleImage = function (src) {
    if (!_activeSingleKey) return;
    _singleImagesConfig[_activeSingleKey] = src;

    // Update the selected preview
    const selectedContainer = document.getElementById('gallery-editor-selected');
    selectedContainer.innerHTML = `
        <div style="position:relative; background:white; border-radius:6px; overflow:hidden; border:2px solid var(--color-gold);">
            <img src="${src}" style="width:100%; height:160px; object-fit:cover; display:block;">
            <div style="padding:8px; text-align:center; font-size:0.8rem; color:#64748b;">Geselecteerd ✔</div>
        </div>`;

    renderSingleImageLibrary(); // Update active states
};

window.removeSingleImage = function (key) {
    delete _singleImagesConfig[key];
    renderSingleImagesGrid(document.getElementById('gallery-zones-container'));
};

/* ─────────────────────────────────────────────────────────────
   EDITOR LOGIC (Inline)
   ───────────────────────────────────────────────────────────── */
window.openGalleryEditor = function (zoneId) {
    _activeModalZoneId = zoneId;
    const zoneInfo = GALLERY_ZONES[zoneId];
    
    document.getElementById('gallery-editor-title').textContent = zoneInfo.label + ' Aanpassen';
    
    // Hide pages and zones, show editor
    document.getElementById('gallery-pages-container').style.display = 'none';
    document.getElementById('gallery-zones-container').style.display = 'none';
    document.getElementById('gallery-editor-container').style.display = 'flex';
    
    renderEditorSelected();
    renderEditorLibrary();
};

window.closeGalleryEditor = function () {
    // Hide editor, show pages and zones
    document.getElementById('gallery-editor-container').style.display = 'none';
    document.getElementById('gallery-pages-container').style.display = 'flex';
    document.getElementById('gallery-zones-container').style.display = 'grid';
    // Restore grid style in case single-image picker changed it
    document.getElementById('gallery-editor-selected').style.gridTemplateColumns = '';
    
    _activeModalZoneId = null;
    _activeSingleKey = null;
    if (_activePageId) renderZonesForPage(_activePageId); // Refresh previews
};

function renderEditorSelected() {
    if (!_activeModalZoneId) return;
    const container = document.getElementById('gallery-editor-selected');
    const images = _galleryConfig[_activeModalZoneId] || [];
    const zoneInfo = GALLERY_ZONES[_activeModalZoneId];
    
    document.getElementById('gallery-editor-count').textContent = `${images.length} foto's geselecteerd (Sleep om te ordenen)`;

    if (images.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;"><i class="ph ph-image" style="font-size:2rem; margin-bottom:10px; display:block;"></i>Nog geen afbeeldingen. Klik rechts om toe te voegen.</div>`;
        return;
    }

    container.innerHTML = images.map((src, idx) => `
        <div class="zone-img-card" data-src="${src}" draggable="true" style="position:relative; background:white; border-radius:6px; overflow:hidden; border:1px solid #cbd5e1; cursor:move;">
            <img src="${src}" style="width:100%; height:90px; object-fit:cover; display:block;" loading="lazy">
            <button onclick="removeImageFromEditor(${idx})" style="position:absolute; top:4px; right:4px; background:rgba(255,0,0,0.8); color:white; border:none; border-radius:4px; width:24px; height:24px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <i class="ph ph-x"></i>
            </button>
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:white; font-size:0.7rem; padding:4px; text-align:center;">
                Positie ${idx + 1}
            </div>
        </div>
    `).join('');

    initEditorSortable();
}

function renderEditorLibrary() {
    const grid = document.getElementById('gallery-editor-library');
    if (!grid) return;

    const filter = _galleryFilter.toLowerCase();
    const filtered = filter ? _allImages.filter(src => src.toLowerCase().includes(filter)) : _allImages;

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">Geen afbeeldingen gevonden.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(src => {
        const isUsed = (_galleryConfig[_activeModalZoneId] || []).includes(src);
        return `
            <div onclick="addImageToEditor('${src}')" style="position:relative; border-radius:6px; overflow:hidden; cursor:pointer; border:2px solid ${isUsed ? 'var(--color-gold)' : 'transparent'}; opacity:${isUsed ? '0.6' : '1'};">
                <img src="${src}" style="width:100%; height:120px; object-fit:cover; display:block;" loading="lazy">
                <div style="font-size:0.7rem; padding:6px; background:#f8fafc; border-top:1px solid #e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${src.split('/').pop()}">${src.split('/').pop()}</div>
                ${isUsed ? `<div style="position:absolute; top:4px; right:4px; background:var(--color-gold); color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center;"><i class="ph ph-check"></i></div>` : ''}
            </div>
        `;
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   EDITOR ACTIONS
   ───────────────────────────────────────────────────────────── */
window.addImageToEditor = function (src) {
    if (!_activeModalZoneId) return;
    if (!_galleryConfig[_activeModalZoneId]) _galleryConfig[_activeModalZoneId] = [];
    
    // Don't add duplicates
    if (_galleryConfig[_activeModalZoneId].includes(src)) return;

    _galleryConfig[_activeModalZoneId].push(src);
    renderEditorSelected();
    renderEditorLibrary(); // Update active states
};

window.removeImageFromEditor = function (idx) {
    if (!_activeModalZoneId || !_galleryConfig[_activeModalZoneId]) return;
    _galleryConfig[_activeModalZoneId].splice(idx, 1);
    renderEditorSelected();
    renderEditorLibrary();
};

window.filterImageLibrary = function (val) {
    _galleryFilter = val;
    renderEditorLibrary();
};

/* ─────────────────────────────────────────────────────────────
   SORTABLE LOGIC
   ───────────────────────────────────────────────────────────── */
function initEditorSortable() {
    const grid = document.getElementById('gallery-editor-selected');
    if (!grid) return;

    let dragSrc = null;

    grid.querySelectorAll('.zone-img-card').forEach(card => {
        card.addEventListener('dragstart', function (e) {
            dragSrc = this;
            e.dataTransfer.effectAllowed = 'move';
            this.style.opacity = '0.4';
        });
        card.addEventListener('dragend', function () {
            this.style.opacity = '1';
            grid.querySelectorAll('.zone-img-card').forEach(c => c.style.border = '1px solid #cbd5e1');
        });
        card.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            grid.querySelectorAll('.zone-img-card').forEach(c => c.style.border = '1px solid #cbd5e1');
            this.style.border = '2px dashed var(--color-gold)';
        });
        card.addEventListener('drop', function (e) {
            e.preventDefault();
            if (dragSrc === this) return;

            const cards = [...grid.querySelectorAll('.zone-img-card')];
            const fromIdx = cards.indexOf(dragSrc);
            const toIdx = cards.indexOf(this);

            const arr = _galleryConfig[_activeModalZoneId] || [];
            const [moved] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, moved);
            _galleryConfig[_activeModalZoneId] = arr;

            renderEditorSelected();
        });
    });
}

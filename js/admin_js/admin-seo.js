/**
 * Admin SEO CMS - Gipfel Lodge
 * Manages SEO pages in Firestore.
 */

class AdminSEO {
    constructor() {
        this.pages = [];
        this.currentEditorId = null;
        this.isInitialized = false;
    }

    async init() {
        if (!this.isInitialized) {
            this.isInitialized = true;
            await this.loadPages();
        }
    }

    async getDb() {
        try {
            const fb = await import('../site_js/core/firebase.js');
            return fb;
        } catch (err) {
            console.error("Firebase not loaded", err);
            return null;
        }
    }

    async loadPages() {
        const listEl = document.getElementById('seo-pages-list');
        listEl.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Laden...</td></tr>';

        const fb = await this.getDb();
        if (!fb) return;

        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        try {
            const q = query(collection(fb.db, 'seo_pages'), orderBy('marketKey'));
            const snapshot = await getDocs(q);
            
            this.pages = [];
            snapshot.forEach(doc => {
                this.pages.push({ id: doc.id, ...doc.data() });
            });

            this.renderList();
        } catch (err) {
            console.error("Error loading SEO pages", err);
            listEl.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Fout bij laden: ${err.message}</td></tr>`;
        }
    }

    renderList() {
        const listEl = document.getElementById('seo-pages-list');
        const filter = document.getElementById('seo-market-filter').value;

        listEl.innerHTML = '';

        const filtered = filter === 'all' 
            ? this.pages 
            : this.pages.filter(p => p.marketKey === filter);

        if (filtered.length === 0) {
            listEl.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Geen pagina\'s gevonden.</td></tr>';
            return;
        }

        filtered.forEach(page => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="padding:4px 8px; background:#f1f5f9; border-radius:4px; font-weight:600; font-size:0.8rem;">${page.marketKey.toUpperCase()}</span></td>
                <td>${page.type}</td>
                <td style="font-family:monospace; font-size:0.85rem;">${page.path}</td>
                <td>${page.title || '-'}</td>
                <td>
                    <span style="padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; 
                        ${page.status === 'published' ? 'background:#dcfce7; color:#166534;' : 'background:#fef9c3; color:#854d0e;'}">
                        ${page.status.toUpperCase()}
                    </span>
                </td>
                <td style="text-align:right;">
                    <button class="eb2-action-btn eb2-btn-secondary" onclick="window.adminSeo.editPage('${page.id}')">Bewerk</button>
                    ${page.status === 'published' 
                        ? `<a href="https://${page.domain}${page.path}" target="_blank" class="eb2-action-btn" style="background:transparent; border:1px solid #e2e8f0;"><i class="ph ph-eye"></i></a>` 
                        : `<a href="/${page.path}?preview=true" target="_blank" class="eb2-action-btn" style="background:transparent; border:1px solid #e2e8f0;" title="Preview (Superuser)"><i class="ph ph-eye-slash"></i></a>`
                    }
                </td>
            `;
            listEl.appendChild(tr);
        });
    }

    showCreateModal() {
        const marketKey = prompt("Market Key (nl, de, at, eu):", "nl");
        if (!marketKey) return;
        const slug = prompt("Slug (bijv. luxe-chalet-oostenrijk):", "");
        if (!slug || !/^[a-z0-9\-]+$/.test(slug)) {
            alert("Ongeldige slug. Gebruik alleen kleine letters, cijfers en streepjes.");
            return;
        }

        const docId = `${marketKey}__${slug}`;
        if (this.pages.find(p => p.id === docId)) {
            alert("Deze pagina bestaat al!");
            return;
        }

        const domainMap = {
            'nl': 'gipfellodge.nl',
            'de': 'gipfellodge.de',
            'at': 'gipfellodge.at',
            'eu': 'gipfellodge.eu'
        };
        const localeMap = {
            'nl': 'nl-NL',
            'de': 'de-DE',
            'at': 'de-AT',
            'eu': 'en'
        };

        const newPage = {
            id: docId,
            marketKey: marketKey,
            locale: localeMap[marketKey],
            domain: domainMap[marketKey],
            pageId: slug,
            type: 'landing',
            status: 'draft',
            path: `/${slug}`,
            slug: slug,
            title: '',
            metaDescription: '',
            h1: '',
            intro: '',
            contentBlocks: [],
            faq: [],
            translations: {},
            noindex: false
        };

        this.openEditor(newPage);
    }

    editPage(id) {
        const page = this.pages.find(p => p.id === id);
        if (page) {
            this.openEditor(page);
        }
    }

    openEditor(page) {
        this.currentEditorId = page.id;
        document.querySelector('#seo-pages-view > .eb2-section-card').style.display = 'none';
        
        const container = document.getElementById('seo-editor-container');
        container.style.display = 'block';

        // Basic form for MVP CMS
        container.innerHTML = `
            <div class="eb2-section-card" style="padding: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2 style="margin:0;">Bewerk Pagina: <span style="color:var(--color-gold);">${page.id}</span></h2>
                    <div style="display:flex; gap:10px;">
                        <button class="eb2-action-btn eb2-btn-secondary" onclick="window.adminSeo.closeEditor()">Annuleren</button>
                        <button class="eb2-action-btn eb2-btn-primary" onclick="window.adminSeo.savePage('draft')">Opslaan als Draft</button>
                        <button class="eb2-action-btn eb2-btn-gold" onclick="window.adminSeo.savePage('published')">Publiceren</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">Title (40-65 tekens aanbevolen)</label>
                        <input type="text" id="seo-edit-title" class="form-input" style="width:100%; margin-bottom:15px;" value="${page.title || ''}">

                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">Meta Description (120-160 tekens)</label>
                        <textarea id="seo-edit-meta" class="form-input" style="width:100%; height:80px; margin-bottom:15px;">${page.metaDescription || ''}</textarea>

                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">H1 Titel</label>
                        <input type="text" id="seo-edit-h1" class="form-input" style="width:100%; margin-bottom:15px;" value="${page.h1 || ''}">

                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">Intro Text</label>
                        <textarea id="seo-edit-intro" class="form-input" style="width:100%; height:80px; margin-bottom:15px;">${page.intro || ''}</textarea>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">Translations JSON (bijv. {"de":"/luxus-chalet"})</label>
                        <textarea id="seo-edit-translations" class="form-input" style="width:100%; height:80px; margin-bottom:15px; font-family:monospace;">${JSON.stringify(page.translations || {})}</textarea>

                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">Content Blocks JSON</label>
                        <textarea id="seo-edit-blocks" class="form-input" style="width:100%; height:120px; margin-bottom:15px; font-family:monospace;">${JSON.stringify(page.contentBlocks || [], null, 2)}</textarea>

                        <label style="display:block; font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px;">FAQ JSON</label>
                        <textarea id="seo-edit-faq" class="form-input" style="width:100%; height:120px; margin-bottom:15px; font-family:monospace;">${JSON.stringify(page.faq || [], null, 2)}</textarea>
                    </div>
                </div>

                <input type="hidden" id="seo-edit-market" value="${page.marketKey}">
                <input type="hidden" id="seo-edit-locale" value="${page.locale}">
                <input type="hidden" id="seo-edit-domain" value="${page.domain}">
                <input type="hidden" id="seo-edit-pageid" value="${page.pageId}">
                <input type="hidden" id="seo-edit-path" value="${page.path}">
                <input type="hidden" id="seo-edit-slug" value="${page.slug}">
                <input type="hidden" id="seo-edit-type" value="${page.type}">
            </div>
        `;
    }

    closeEditor() {
        this.currentEditorId = null;
        document.getElementById('seo-editor-container').style.display = 'none';
        document.querySelector('#seo-pages-view > .eb2-section-card').style.display = 'block';
    }

    async savePage(status) {
        if (!this.currentEditorId) return;

        const title = document.getElementById('seo-edit-title').value.trim();
        const metaDesc = document.getElementById('seo-edit-meta').value.trim();
        const h1 = document.getElementById('seo-edit-h1').value.trim();
        const intro = document.getElementById('seo-edit-intro').value.trim();

        if (status === 'published') {
            if (!title) return alert("Title is verplicht bij publiceren.");
            if (!metaDesc) return alert("Meta description is verplicht bij publiceren.");
            if (!h1) return alert("H1 is verplicht bij publiceren.");
            if (!intro) return alert("Intro is verplicht bij publiceren.");
        }

        let translations, contentBlocks, faq;
        try {
            translations = JSON.parse(document.getElementById('seo-edit-translations').value || '{}');
            contentBlocks = JSON.parse(document.getElementById('seo-edit-blocks').value || '[]');
            faq = JSON.parse(document.getElementById('seo-edit-faq').value || '[]');
        } catch (e) {
            return alert("Fout in JSON formattering (Translations, Blocks of FAQ). Controleer de syntax.");
        }

        const pageData = {
            marketKey: document.getElementById('seo-edit-market').value,
            locale: document.getElementById('seo-edit-locale').value,
            domain: document.getElementById('seo-edit-domain').value,
            pageId: document.getElementById('seo-edit-pageid').value,
            path: document.getElementById('seo-edit-path').value,
            slug: document.getElementById('seo-edit-slug').value,
            type: document.getElementById('seo-edit-type').value,
            status: status,
            title: title,
            metaDescription: metaDesc,
            h1: h1,
            intro: intro,
            translations: translations,
            contentBlocks: contentBlocks,
            faq: faq,
            noindex: false
        };

        const fb = await this.getDb();
        if (!fb) return;

        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        try {
            const docRef = doc(fb.db, 'seo_pages', this.currentEditorId);
            
            // For new objects or updates
            const updatePayload = {
                ...pageData,
                updatedAt: serverTimestamp()
            };
            
            if (status === 'published') {
                updatePayload.publishedAt = serverTimestamp();
            }

            await setDoc(docRef, updatePayload, { merge: true });
            
            alert(`Pagina succesvol opgeslagen als ${status}!`);
            this.closeEditor();
            await this.loadPages();
        } catch (err) {
            console.error("Save error", err);
            alert("Fout bij opslaan: " + err.message);
        }
    }
}

window.adminSeo = new AdminSEO();

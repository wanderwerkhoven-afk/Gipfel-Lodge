/* MODULE: Import */
// --- IMPORT LOGIC ---
let _xlsxLoaded = false;
let _importParsed = [];
let _importInitialized = false;
let _pricingParsed = null;

window.switchImportTab = function(tabId, el) {
    // Update tabs
    const parent = el.parentElement;
    parent.querySelectorAll('.kp-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    // Update panes
    document.querySelectorAll('.import-pane').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });
    const activePane = document.getElementById(`import-pane-${tabId}`);
    if (activePane) {
        activePane.style.display = 'block';
        activePane.classList.add('active');
    }

    // If pricing tab, load versions
    if (tabId === 'pricing' && window.loadPricingVersions) {
        window.loadPricingVersions();
    }
};

window.initImportView = async function() {
    if (_importInitialized) return;
    _importInitialized = true;

    // Load Pricing Data (Legacy)
    if (window.loadAdminPricingData) loadAdminPricingData();

    // Lazy-load SheetJS
    if (!_xlsxLoaded) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
            s.onload = () => { _xlsxLoaded = true; resolve(); };
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // GUEST IMPORT EVENTS
    const dropZone = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('import-file-input');
    const btnImport = document.getElementById('imp-btn-import');
    const btnReset = document.getElementById('imp-btn-reset');

    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.background = '#fdf8f0'; });
        dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#fafcff'; });
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.style.background = '#fafcff';
            if (e.dataTransfer.files[0]) importProcessFile(e.dataTransfer.files[0]);
        });
    }
    if (fileInput) {
        fileInput.addEventListener('change', e => {
            if (e.target.files[0]) importProcessFile(e.target.files[0]);
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            _importParsed = [];
            fileInput.value = '';
            document.getElementById('import-preview-section').style.display = 'none';
            document.getElementById('import-log-section').style.display = 'none';
            document.getElementById('imp-log').innerHTML = '';
            document.getElementById('imp-progress-bar').style.width = '0%';
        });
    }

    if (btnImport) btnImport.addEventListener('click', importToFirebase);

    // PRICING IMPORT EVENTS
    const pricingDropZone = document.getElementById('pricing-drop-zone');
    const pricingFileInput = document.getElementById('pricing-file-input');

    if (pricingDropZone) {
        pricingDropZone.addEventListener('click', () => pricingFileInput.click());
        pricingDropZone.addEventListener('dragover', e => { e.preventDefault(); pricingDropZone.style.background = '#fef2f2'; });
        pricingDropZone.addEventListener('dragleave', () => { pricingDropZone.style.background = '#f8fafc'; });
        pricingDropZone.addEventListener('drop', e => {
            e.preventDefault();
            pricingDropZone.style.background = '#f8fafc';
            if (e.dataTransfer.files[0]) processPricingFile(e.dataTransfer.files[0]);
        });
    }
    if (pricingFileInput) {
        pricingFileInput.addEventListener('change', e => {
            if (e.target.files[0]) processPricingFile(e.target.files[0]);
        });
    }

    // Initial load
    if (window.loadPricingVersions) {
        window.loadPricingVersions();
    }
};

window.importProcessFile = async function(file) {
    if (window.loadAdminPricingData) await loadAdminPricingData(); // Ensure pricing is loaded

    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    const headers = rows[0];
    const col = {};
    headers.forEach((h, i) => { if (h) col[String(h).trim()] = i; });

    _importParsed = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every(c => c === null || c === '')) continue;
        
        const raw = String(row[col['Boeking']] || '').trim();
        const adults = Number(row[col['Volw.']] || 0);
        const children = Number(row[col['Knd.']] || 0);
        const babies = Number(row[col['Bab.']] || 0);
        const nights = Number(row[col['Nachten']] || 0);
        
        if (!raw) continue;
        const parts = raw.split('|');
        const sourceId = parts[0].trim();
        const platform = (parts[1] || '').trim();
        const id = importBuildId(sourceId, platform);
        
        const isOwner = id.startsWith('Owner-');
        const chargeableGuests = adults + children;
        const cleaning = isOwner ? 0 : 350.00;
        const bedLinen = isOwner ? 0 : (chargeableGuests * 20.95);
        const touristTax = isOwner ? 0 : (chargeableGuests * nights * 2.50);
        const mobilityFee = isOwner ? 0 : (chargeableGuests * nights * 0.50);

        const checkIn = importParseDate(row[col['Aankomst']]);
        const checkOut = importParseDate(row[col['Vertrek']]);
        if (!checkIn || !checkOut) continue;

        // Booking Date / Year identification
        const rawBookingDate = row[col['Datum']] || row[col['Boekingsdatum']] || row[col['Geboekt op']];
        const bookingDateParsed = importParseDate(rawBookingDate);
        const bookingDateStr = bookingDateParsed ? formatDateLocal(new Date(bookingDateParsed)) : '';
        const bookingYear = bookingDateParsed ? new Date(bookingDateParsed).getFullYear() : new Date(checkIn).getFullYear();

        // --- Calculate Rent from Dynamic Pricing ---
        let rent = 0;
        let hasPricingError = false;
        
        // Select active version from DB (already populated in loadAdminPricingData)
        const targetMap = adminPricingMaps.active || adminPricingMaps.old;
        let usedPriceVersion = (adminPricingMaps.versions && adminPricingMaps.versions.length > 0) ? 'Database' : 'Legacy-2026';

        if (!isOwner) {
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            let tempDate = new Date(start);
            
            // Check minimum payable nights on the start date
            const startPriceObj = targetMap[formatDateLocal(start)];
            const minPayNights = (startPriceObj && startPriceObj.min_nachten_betalen) ? startPriceObj.min_nachten_betalen : 0;

            for (let i = 0; i < nights; i++) {
                const dateStr = formatDateLocal(tempDate);
                const priceObj = targetMap[dateStr];
                if (priceObj && priceObj.dagprijs !== undefined) {
                    rent += priceObj.dagprijs;
                } else {
                    hasPricingError = true;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }

            // Apply minimum payable nights if stay is shorter
            if (nights > 0 && nights < minPayNights) {
                const avgPrice = rent / nights;
                rent = avgPrice * minPayNights;
            }

            // --- APPLY LAST MINUTE DISCOUNT (SIMULATION) ---
            let discountPercentage = 0;
            let appliedDiscountName = "";
            let originalRent = rent;
            
            if (activeDiscountPreset && activeDiscountPreset.tiers && bookingDateParsed) {
                const diffArrival = new Date(checkIn).getTime() - new Date(bookingDateParsed).getTime();
                const daysUntilArrival = Math.max(0, Math.ceil(diffArrival / (1000 * 60 * 60 * 24)));
                
                const tiers = [...activeDiscountPreset.tiers].sort((a, b) => a.days - b.days);
                const matchingTier = tiers.find(t => daysUntilArrival <= t.days);
                if (matchingTier) {
                    discountPercentage = matchingTier.percentage;
                    appliedDiscountName = activeDiscountPreset.name;
                }
            }

            var discountAmount = originalRent * (discountPercentage / 100);
            rent = originalRent - discountAmount;
        }

        const totalAmount = isOwner ? 0 : (rent + cleaning + bedLinen + touristTax + mobilityFee);

        _importParsed.push({
            id, sourceId, platform,
            type: isOwner ? 'owner' : 'guest',
            guestName: String(row[col['Gast']] || '').trim(),
            guestEmail: String(row[col['E-mailadres']] || '').trim(),
            guestPhone: String(row[col['Telefoon']] || '').replace(/\D/g, ''),
            guestCountry: String(row[col['Land']] || '').trim(),
            checkIn, checkOut,
            nights: nights,
            adults: adults,
            children: children,
            babies: babies,
            totalAmount: totalAmount,
            message: String(row[col['Opmerking']] || '').trim(),
            rent: rent,
            originalRent: typeof originalRent !== 'undefined' ? originalRent : rent,
            discountAmount: typeof discountAmount !== 'undefined' ? discountAmount : 0,
            discountPercentage: typeof discountPercentage !== 'undefined' ? discountPercentage : 0,
            appliedDiscountName: typeof appliedDiscountName !== 'undefined' ? appliedDiscountName : "",
            cleaning: cleaning,
            bedLinen: bedLinen,
            touristTax: touristTax,
            mobilityFee: mobilityFee,
            bookingYear: bookingYear,
            hasPricingError: hasPricingError,
            usedPriceVersion: usedPriceVersion,
            secretToken: Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8)
        });
    }
    renderImportPreview();
}

window.importToFirebase = async function() {
    const overwrite = document.getElementById('imp-chk-overwrite').checked;
    const btn = document.getElementById('imp-btn-import');
    btn.disabled = true;
    btn.textContent = 'Bezig...';

    const logSection = document.getElementById('import-log-section');
    logSection.style.display = '';
    const logEl = document.getElementById('imp-log');
    logEl.innerHTML = '';

    function impLog(msg, color = '#64748b') {
        logEl.innerHTML += `<div style="color:${color};">${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    }

    const { db, doc, getDoc, setDoc, serverTimestamp } = await import('../site_js/core/firebase.js');
    let success = 0, skipped = 0, failed = 0;

    impLog(`🚀 Start import van ${_importParsed.length} boekingen...`);

    for (let i = 0; i < _importParsed.length; i++) {
        const b = _importParsed[i];
        const snap = await getDoc(doc(db, 'bookings', b.id));
        const exists = snap.exists();

        if (exists && !overwrite) {
            skipped++;
            impLog(`⏭ ${b.id} — overgeslagen (bestaat al)`);
            document.getElementById('imp-progress-bar').style.width = Math.round(((i + 1) / _importParsed.length) * 100) + '%';
            continue;
        }

        try {
            let invoiceId = exists ? snap.data().invoiceId : null;
            if (!invoiceId && b.type === 'guest' && window.getSequentialInvoiceId) {
                invoiceId = await window.getSequentialInvoiceId(b.bookingYear);
            }

            await setDoc(doc(db, 'bookings', b.id), {
                bookingId: b.id,
                invoiceId: invoiceId,
                type: b.type,
                status: b.type === 'owner' ? 'owner' : 'confirmed',
                guestName: b.guestName,
                guestEmail: b.guestEmail,
                guestPhone: b.guestPhone,
                guestAddress: b.guestAddress || '',
                guestZipcode: b.guestZipcode || '',
                guestCity: b.guestCity || '',
                guestCountry: b.guestCountry || '',
                country: b.guestCountry || '',
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                nights: b.nights,
                adults: b.adults,
                children: b.children,
                babies: b.babies,
                totalGuests: b.adults + b.children + b.babies,
                totalAmount: b.totalAmount,
                rent: b.rent || 0,
                cleaning: b.cleaning || 0,
                bedLinen: b.bedLinen || 0,
                touristTax: b.touristTax || 0,
                mobilityFee: b.mobilityFee || 0,
                depositPaid: false,
                balancePaid: false,
                message: b.message,
                source: b.sourceId,
                platform: b.platform,
                importedAt: new Date().toISOString(),
                secretToken: b.secretToken || '',
                createdAt: serverTimestamp(),
                mailChain: {
                    depositReminder: false, depositReceived: false,
                    balanceReminder: false, balanceReceived: false,
                    preStayInfo: false, postStay: false
                }
            }, { merge: true });

            success++;
            if (window.logActivity) await window.logActivity('Excel Import', `Boeking geïmporteerd via Excel upload`, b.id);
        } catch (err) {
            failed++;
            impLog(`❌ ${b.id} — ${err.message}`, '#dc2626');
        }

        document.getElementById('imp-progress-bar').style.width = Math.round(((i + 1) / _importParsed.length) * 100) + '%';
    }

    impLog(`📊 Klaar! ✅ ${success} geïmporteerd · ⏭ ${skipped} overgeslagen · ❌ ${failed} mislukt.`);
    btn.textContent = '✔ Import voltooid';
    btn.disabled = false;
};

// Hidden/Internal helpers
function importParseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    const s = String(val).trim();
    const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
}

function importBuildId(sourceId, platform) {
    const digits = sourceId.replace(/\D/g, '');
    const suffix = digits.slice(-6).padStart(6, '0');
    const isOwner = !platform || /eigenaar|owner/i.test(platform);
    return (isOwner ? 'Owner-' : 'Gipfel-') + suffix;
}

async function renderImportPreview() {
    const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
    const tbody = document.getElementById('import-preview-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">Laden van status...</td></tr>';
    
    let newCount = 0, existsCount = 0;
    const rowsHtml = [];

    for (const b of _importParsed) {
        const snap = await getDoc(doc(db, 'bookings', b.id));
        const exists = snap.exists();
        if (exists) existsCount++; else newCount++;
        
        const statusBadge = exists
            ? `<span class="status-badge" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">Bestaat</span>`
            : `<span class="status-badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;">Nieuw</span>`;
        
        rowsHtml.push(`
            <tr>
                <td>${statusBadge}</td>
                <td style="font-family:monospace;font-size:0.75rem;">${b.id}</td>
                <td style="font-size:0.75rem;color:#94a3b8;">${b.sourceId}</td>
                <td>${b.guestName || '<em style="color:#94a3b8">Eigenaar</em>'}</td>
                <td>${b.checkIn}</td>
                <td>${b.checkOut}</td>
                <td style="text-align:center;">${b.nights}</td>
                <td style="color:var(--color-gold); text-align:right;">€${b.totalAmount.toFixed(2)}</td>
                <td>${b.guestCountry || ''}</td>
            </tr>
        `);
    }

    tbody.innerHTML = rowsHtml.join('');
    document.getElementById('imp-stat-total').textContent = _importParsed.length;
    document.getElementById('imp-stat-new').textContent = newCount;
    document.getElementById('imp-stat-exists').textContent = existsCount;
    document.getElementById('import-preview-section').style.display = '';
}

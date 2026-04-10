/* MODULE: Invoices */
        // --- 9. FINANCE & INVOICES ---
        let currentInvoiceView = localStorage.getItem('gipfel_invoice_view') || 'grid';

        window.switchInvoiceView = function(type) {
            currentInvoiceView = type;
            localStorage.setItem('gipfel_invoice_view', type);

            // Update buttons
            document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById(`toggle-${type}-btn`);
            if (activeBtn) activeBtn.classList.add('active');

            // Update containers
            document.querySelectorAll('.invoice-view-content').forEach(el => el.classList.remove('active'));
            const activeContainer = document.getElementById(`invoices-${type}-container`);
            if (activeContainer) activeContainer.classList.add('active');
            
            // Re-render if switching (optional since they are both loaded, but keeps it clean)
            loadInvoices();
        };

        // --- Invoice Sort Dropdown Controller ---
        window.toggleInvoiceSortDropdown = function(e) {
            e.stopPropagation();
            const dd = document.getElementById('invoice-sort-dropdown');
            const caret = document.getElementById('invoice-sort-caret');
            const isOpen = dd && dd.style.display === 'block';
            if (dd) dd.style.display = isOpen ? 'none' : 'block';
            if (caret) caret.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        };

        window.setInvoiceSort = function(sortValue, label, el) {
            // Update hidden select value (used by loadInvoices)
            const sel = document.getElementById('invoice-sort');
            if (sel) sel.value = sortValue;
            // Update visible button label
            const lbl = document.getElementById('invoice-sort-label');
            if (lbl) lbl.textContent = label;
            // Highlight active sort option
            document.querySelectorAll('.inv-sort-option').forEach(opt => {
                const active = opt.dataset.sort === sortValue;
                opt.style.background = active ? '#f8fafc' : '';
                opt.style.color = active ? 'var(--color-gold)' : '';
                opt.style.fontWeight = active ? '700' : '';
            });
            // Close dropdown & reset caret
            const dd = document.getElementById('invoice-sort-dropdown');
            const caret = document.getElementById('invoice-sort-caret');
            if (dd) dd.style.display = 'none';
            if (caret) caret.style.transform = 'rotate(0deg)';
            // Persist and reload
            localStorage.setItem('gipfel_invoice_sort', sortValue);
            loadInvoices();
        };

        // Close sort dropdown on outside click
        document.addEventListener('click', function(e) {
            const wrap = document.querySelector('.invoice-sort-wrap');
            if (wrap && !wrap.contains(e.target)) {
                const dd = document.getElementById('invoice-sort-dropdown');
                const caret = document.getElementById('invoice-sort-caret');
                if (dd) dd.style.display = 'none';
                if (caret) caret.style.transform = 'rotate(0deg)';
            }
        });

        window.loadInvoices = async function() {
            const listBody = document.getElementById('invoices-list-body');
            const gridBody = document.getElementById('invoices-grid-body');
            const loader = document.getElementById('invoices-loader');
            const emptyState = document.getElementById('invoices-empty');
            if (!listBody || !gridBody) return;

            listBody.innerHTML = '';
            gridBody.innerHTML = '';
            loader.style.display = 'block';
            emptyState.style.display = 'none';

            // Ensure correct view is active on load
            document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`toggle-${currentInvoiceView}-btn`)?.classList.add('active');
            document.querySelectorAll('.invoice-view-content').forEach(el => el.classList.remove('active'));
            document.getElementById(`invoices-${currentInvoiceView}-container`)?.classList.add('active');

            // Sort preference
            const sortType = document.getElementById('invoice-sort')?.value || localStorage.getItem('gipfel_invoice_sort') || 'date_desc';
            if (document.getElementById('invoice-sort')) document.getElementById('invoice-sort').value = sortType;
            localStorage.setItem('gipfel_invoice_sort', sortType);

            try {
                const { db, collection, getDocs, query } = await import('../site_js/core/firebase.js');
                const querySnapshot = await getDocs(collection(db, "bookings"));

                const allInvoices = [];
                querySnapshot.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    if (data.invoiceId || data.status === 'confirmed' || data.status === 'pending') {
                        allInvoices.push(data);
                    }
                });

                allInvoices.sort((a, b) => {
                    if (sortType === 'checkin_asc') {
                        // Sort by check-in date ascending (eerstvolgende boeking)
                        const now = new Date();
                        const dateA = new Date(a.checkIn || 0);
                        const dateB = new Date(b.checkIn || 0);
                        // Future bookings first (ascending from today), past bookings last
                        const aFuture = dateA >= now;
                        const bFuture = dateB >= now;
                        if (aFuture && !bFuture) return -1;
                        if (!aFuture && bFuture) return 1;
                        return dateA - dateB;
                    } else if (sortType === 'guest_az') {
                        return (a.guestName || '').localeCompare(b.guestName || '');
                    } else if (sortType === 'invoice_asc') {
                        if (!a.invoiceId) return 1;
                        if (!b.invoiceId) return -1;
                        return a.invoiceId.localeCompare(b.invoiceId);
                    } else if (sortType === 'invoice_desc') {
                        if (!a.invoiceId) return 1;
                        if (!b.invoiceId) return -1;
                        return b.invoiceId.localeCompare(a.invoiceId);
                    } else if (sortType === 'date_asc') {
                        const dateA = new Date(a.checkIn || 0);
                        const dateB = new Date(b.checkIn || 0);
                        return dateA - dateB;
                    } else {
                        // Default: date_desc (Nieuwste eerst)
                        const tA = (a.createdAt && a.createdAt.seconds) 
                            ? a.createdAt.seconds * 1000 
                            : new Date(a.receivedDate || a.checkIn || 0).getTime();
                        const tB = (b.createdAt && b.createdAt.seconds) 
                            ? b.createdAt.seconds * 1000 
                            : new Date(b.receivedDate || b.checkIn || 0).getTime();
                        
                        if (!isNaN(tA) && !isNaN(tB)) {
                            return tB - tA;
                        }
                        
                        // Fallback fallback als receivedDate onzinnig was:
                        const fbA = new Date(a.checkIn || 0).getTime();
                        const fbB = new Date(b.checkIn || 0).getTime();
                        return fbB - fbA;
                    }
                });

                allInvoices.forEach(data => {
                    // Populate List
                    listBody.appendChild(renderInvoiceRow(data));
                    // Populate Grid
                    gridBody.appendChild(renderInvoiceCard(data));
                });

                if (allInvoices.length === 0) {
                    emptyState.style.display = 'block';
                }
            } catch (err) {
                console.error("Error loading invoices:", err);
                const errMsg = `<tr><td colspan="5" style="text-align:center; color:#ff6b6b; padding:40px;">Fout bij laden: ${err.message}</td></tr>`;
                listBody.innerHTML = errMsg;
                gridBody.innerHTML = `<p style="text-align:center; color:#ff6b6b; padding:20px;">Fout bij laden.</p>`;
            } finally {
                loader.style.display = 'none';
                filterInvoiceTable(); // Maintain filter state after reload/sort
            }
        };

        function renderInvoiceRow(data) {
            const tr = document.createElement('tr');
            const total = data.totalAmount || 0;
            const fmtEUR = (val) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(val);
            const previewUrl = `invoice.html?id=${data.id}&token=${data.secretToken}`;
            const status = getPaymentStatusInfo(data);
            const deadlines = calcPaymentDeadlines(data);

            const depositStr = deadlines.isMerged ? 'N.v.t.' : (deadlines.depositDeadline
                ? deadlines.depositDeadline.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—');
            const balanceStr = deadlines.balanceDeadline
                ? deadlines.balanceDeadline.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

            tr.innerHTML = `
                <td><span class="invoice-row-id">${data.invoiceId || 'NOG GEEN'}</span></td>
                <td><span class="invoice-row-date">${data.receivedDate || data.checkIn || '—'}</span></td>
                <td>
                    <div class="invoice-row-guest">${data.guestName || '—'}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${data.id}</div>
                </td>
                <td class="invoice-row-amount">${fmtEUR(total)}</td>
                <td>
                    <span class="inv-status-badge inv-status-badge--${status.colorClass}">${status.label}</span>
                </td>
                <td style="font-size:0.75rem; color:#64748b; line-height:1.6;">
                    ${deadlines.isMerged 
                        ? `<div>Direct / Volledig: <strong style="color:var(--color-darkred);">${balanceStr}</strong></div>`
                        : `<div>Aanbetaling: <strong>${depositStr}</strong></div>
                           <div>Volledig: <strong>${balanceStr}</strong></div>`
                    }
                </td>
                <td>
                    <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
                        <a href="${previewUrl}" target="_blank" class="view-toggle-btn active" style="padding: 4px 8px;" title="Bekijk factuur">
                            <i class="ph ph-eye"></i>
                        </a>
                        <button class="view-toggle-btn" style="padding:4px 8px; cursor:pointer;" title="Betaalstatus bijwerken"
                            onclick="openPaymentModal('${data.id}')">
                            <i class="ph ph-credit-card"></i>
                        </button>
                    </div>
                </td>
            `;
            return tr;
        }

        function renderInvoiceCard(data) {
            const div = document.createElement('div');
            const previewUrl = `invoice.html?id=${data.id}&token=${data.secretToken}`;
            const status = getPaymentStatusInfo(data);
            const deadlines = calcPaymentDeadlines(data);

            const depositStr = deadlines.depositDeadline
                ? deadlines.depositDeadline.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
                : '—';
            const balanceStr = deadlines.balanceDeadline
                ? deadlines.balanceDeadline.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
                : '—';

            const depositPaid = data.paymentStatus === 'deposit_paid' || data.paymentStatus === 'fully_paid';
            const fullyPaid  = data.paymentStatus === 'fully_paid';

            const depositClass = fullyPaid ? 'is-paid' : (depositPaid ? 'is-paid' : (deadlines.depositOverdue ? 'is-overdue' : ''));
            const balanceClass = fullyPaid ? 'is-paid' : (deadlines.balanceOverdue ? 'is-overdue' : '');

            div.className = 'invoice-grid-item';
            div.innerHTML = `
                <div class="invoice-card" style="cursor:default;">
                    <a href="${previewUrl}" target="_blank" style="display:contents; text-decoration:none; color:inherit;">
                        <div class="pdf-icon-wrapper">
                            <div class="pdf-lines">
                                <div class="pdf-line"></div>
                                <div class="pdf-line"></div>
                                <div class="pdf-line"></div>
                                <div class="pdf-line"></div>
                            </div>
                            <div class="pdf-status-band pdf-status-band--${status.colorClass}">${status.label}</div>
                        </div>
                        <div class="invoice-card__id">${data.invoiceId || 'NOG GEEN'}</div>
                        <div class="invoice-card__guest">${data.guestName || 'Gast'}</div>
                        <div class="invoice-card__date">${data.receivedDate || data.checkIn || '—'}</div>
                    </a>
                    <div class="invoice-card__deadlines">
                        ${deadlines.isMerged ? `
                        <div class="inv-deadline-row" style="margin-top:6px;">
                            <span>Direct Voldoen</span>
                            <span class="inv-dl-val ${balanceClass}" style="color:var(--color-darkred);">${balanceStr}</span>
                        </div>
                        ` : `
                        <div class="inv-deadline-row">
                            <span>Aanbetaling</span>
                            <span class="inv-dl-val ${depositClass}">${depositStr}</span>
                        </div>
                        <div class="inv-deadline-row">
                            <span>Volledig</span>
                            <span class="inv-dl-val ${balanceClass}">${balanceStr}</span>
                        </div>
                        `}
                    </div>
                    <button class="invoice-card__pay-btn" onclick="openPaymentModal('${data.id}')">
                        <i class="ph ph-credit-card"></i> Betaalstatus
                    </button>
                </div>
            `;
            return div;
        }

        window.filterInvoiceTable = function() {
            const searchVal = document.getElementById('invoice-search').value.toLowerCase();
            const yearVal = document.getElementById('invoice-filter-year').value;
            const rows = document.querySelectorAll('#invoices-list-body tr');
            const cards = document.querySelectorAll('.invoice-grid-item');
            
            let visibleCount = 0;

            // Filter List rows
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const matches = text.includes(searchVal) && (yearVal === "" || text.includes(yearVal));
                row.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });

            // Filter Grid cards
            cards.forEach(card => {
                const text = card.innerText.toLowerCase();
                const matches = text.includes(searchVal) && (yearVal === "" || text.includes(yearVal));
                card.style.display = matches ? '' : 'none';
            });

        };

        // ============================================================
        // BETAALSTATUS HELPERS
        // ============================================================

        /**
         * Berekent de aanbetalingstermijn (14 dagen na boekingsdatum)
         * en de volledige betalingstermijn (30 dagen voor check-in).
         */
        function calcPaymentDeadlines(data) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            let depositDeadline = null;
            let balanceDeadline = null;
            let isMerged = false;

            // Bepaal de boekingsdatum zo exact mogelijk
            const bookingDate = data.receivedDate
                ? new Date(data.receivedDate)
                : (data.createdAt && data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date());
            
            const checkInDate = data.checkIn ? new Date(data.checkIn) : null;

            if (checkInDate && !isNaN(checkInDate) && bookingDate && !isNaN(bookingDate)) {
                // Standaard termijnen
                const stdDeposit = new Date(bookingDate);
                stdDeposit.setDate(stdDeposit.getDate() + 14);
                stdDeposit.setHours(0, 0, 0, 0);

                const stdBalance = new Date(checkInDate);
                stdBalance.setDate(stdBalance.getDate() - 42); // 6 weken ipv 30 dagen
                stdBalance.setHours(0, 0, 0, 0);

                if (stdBalance < bookingDate) {
                    // Regel 1: Volledige Last-Minute (binnen 6 weken geboekt)
                    // Ze krijgen 3 dagen, of uiterlijk incheck - 1 dag
                    let urgentDl = new Date(bookingDate);
                    urgentDl.setDate(urgentDl.getDate() + 3);
                    urgentDl.setHours(0, 0, 0, 0);

                    const maxDl = new Date(checkInDate);
                    maxDl.setDate(maxDl.getDate() - 1);
                    maxDl.setHours(0, 0, 0, 0);

                    if (urgentDl > maxDl) urgentDl = maxDl;
                    if (urgentDl < bookingDate) urgentDl = new Date(bookingDate);

                    depositDeadline = new Date(urgentDl);
                    balanceDeadline = new Date(urgentDl);
                    isMerged = true;
                } else if (stdDeposit >= stdBalance) {
                    // Regel 2: Aanbetaling kruist of raakt de volledige betalingsgrens
                    depositDeadline = new Date(stdBalance);
                    balanceDeadline = new Date(stdBalance);
                    isMerged = true;
                } else {
                    // Regel 3: Genoeg tijd voor reguliere flow
                    depositDeadline = stdDeposit;
                    balanceDeadline = stdBalance;
                }
            } else if (bookingDate && !isNaN(bookingDate)) {
                // Fallback (geen checkin ingevuld)
                depositDeadline = new Date(bookingDate);
                depositDeadline.setDate(depositDeadline.getDate() + 14);
                depositDeadline.setHours(0, 0, 0, 0);
            }

            return {
                depositDeadline,
                balanceDeadline,
                depositOverdue: depositDeadline ? now > depositDeadline : false,
                balanceOverdue: balanceDeadline ? now > balanceDeadline : false,
                isMerged
            };
        }

        /**
         * Bepaalt de betaalstatus en retourneert klasse + label.
         * Vijf mogelijke statussen:
         *  1. unpaid + binnen aanbetalingstermijn     → orange / NOG TE BETALEN
         *  2. unpaid + aanbetalingstermijn verstreken → red    / AANBETALING VERVALLEN
         *  3. deposit_paid + binnen balancetermijn    → orange / AANBETAALD
         *  4. deposit_paid + balancetermijn verstreken → darkred / RESTBETALING VERVALLEN
         *  5. fully_paid                              → green  / VOLLEDIG BETAALD
         */
        function getPaymentStatusInfo(data) {
            const ps = data.paymentStatus || 'unpaid';
            const dl = calcPaymentDeadlines(data);

            if (ps === 'fully_paid') {
                return { colorClass: 'green', label: 'VOLLEDIG BETAALD', color: '#22c55e' };
            }
            if (ps === 'deposit_paid') {
                if (dl.balanceOverdue) {
                    return { colorClass: 'darkred', label: 'RESTBETALING VERVALLEN', color: '#b91c1c' };
                }
                return { colorClass: 'orange', label: 'AANBETAALD', color: '#f59e0b' };
            }
            // unpaid
            if (dl.depositOverdue) {
                return { colorClass: 'red', label: 'AANBETALING VERVALLEN', color: '#ef4444' };
            }
            return { colorClass: 'orange', label: 'NOG TE BETALEN', color: '#f59e0b' };
        }

        // Cache van geladen boekingsdata voor gebruik in de modal
        window._invoiceDataCache = {};

        /**
         * Slaat betaalstatus op in Firestore en vernieuwt de factuurlijst.
         */
        window.markPaymentStatus = async function(bookingId, newStatus) {
            const actionsEl = document.getElementById('pay-modal-actions');

            // Tijdelijk disable knoppen
            actionsEl.querySelectorAll('button').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
            });

            try {
                const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                const updateData = { paymentStatus: newStatus };

                if (newStatus === 'deposit_paid') {
                    updateData.depositPaidAt = new Date().toISOString();
                    updateData.depositPaid = true;
                } else if (newStatus === 'fully_paid') {
                    updateData.balancePaidAt = new Date().toISOString();
                    updateData.depositPaid = true;
                    updateData.balancePaid = true;
                } else if (newStatus === 'unpaid') {
                    updateData.depositPaidAt = null;
                    updateData.balancePaidAt = null;
                    updateData.depositPaid = false;
                    updateData.balancePaid = false;
                }

                await updateDoc(doc(db, 'bookings', bookingId), updateData);

                const statusLabels = {
                    'unpaid': 'teruggezet op onbetaald',
                    'deposit_paid': 'Aanbetaling geregistreerd',
                    'fully_paid': 'Volledig betaald geregistreerd'
                };
                logActivity('PAYMENT_STATUS_UPDATED', statusLabels[newStatus] || newStatus, bookingId);

                // Update cache
                if (window._invoiceDataCache[bookingId]) {
                    window._invoiceDataCache[bookingId].paymentStatus = newStatus;
                    if (updateData.depositPaidAt !== undefined) window._invoiceDataCache[bookingId].depositPaidAt = updateData.depositPaidAt;
                    if (updateData.balancePaidAt !== undefined) window._invoiceDataCache[bookingId].balancePaidAt = updateData.balancePaidAt;
                }

                closePaymentModal();
                loadInvoices(); // Ververs het overzicht

                // Toast melding
                showToast("Betaalstatus", statusLabels[newStatus] || 'Status bijgewerkt', 'success');

            } catch (err) {
                console.error('Fout bij opslaan betaalstatus:', err);
                alert('Fout bij opslaan: ' + err.message);
                actionsEl.querySelectorAll('button').forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '';
                });
            }
        };

        /**
         * Opent de betaalstatus modal voor een specifieke boeking.
         * Haalt data op uit cache of Firestore.
         */
        window.openPaymentModal = async function(bookingId) {
            const modal = document.getElementById('payment-status-modal');
            if (!modal) return;

            // Vul alvast title in terwijl we laden
            document.getElementById('pay-modal-title').textContent = 'Betaalstatus bijwerken';
            document.getElementById('pay-modal-subtitle').textContent = 'Laden...';
            document.getElementById('pay-modal-actions').innerHTML = '<div class="spinner" style="margin:16px auto; width:24px; height:24px;"></div>';
            modal.classList.add('is-open');

            try {
                // Haal boekingsdata op (uit cache of Firestore)
                let data = window._invoiceDataCache[bookingId];
                if (!data) {
                    const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
                    const snap = await getDoc(doc(db, 'bookings', bookingId));
                    if (!snap.exists()) throw new Error('Boeking niet gevonden');
                    data = { id: snap.id, ...snap.data() };
                    window._invoiceDataCache[bookingId] = data;
                }

                const ps = data.paymentStatus || 'unpaid';
                const status = getPaymentStatusInfo(data);
                const deadlines = calcPaymentDeadlines(data);
                const fmtDate = (d) => d ? d.toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

                // Header
                document.getElementById('pay-modal-title').textContent = data.guestName || 'Boeking';
                document.getElementById('pay-modal-subtitle').textContent =
                    `${data.invoiceId || data.id} · Check-in: ${data.checkIn || '—'}`;

                // Huidige status
                document.getElementById('pay-modal-status-dot').style.background = status.color;
                document.getElementById('pay-modal-status-label').textContent = status.label;

                // Betaaltermijnen
                const depositDlEl = document.getElementById('pay-modal-deposit-dl');
                const balanceDlEl = document.getElementById('pay-modal-balance-dl');
                
                depositDlEl.className = 'pay-dl-date';
                balanceDlEl.className = 'pay-dl-date';

                if (deadlines.isMerged) {
                    depositDlEl.innerHTML = '<i style="color:#64748b; font-weight:normal;">N.v.t. (Direct betalen)</i>';
                    balanceDlEl.textContent = fmtDate(deadlines.balanceDeadline);
                    
                    if (ps === 'fully_paid') {
                        balanceDlEl.classList.add('is-paid');
                        balanceDlEl.textContent += ' ✓';
                    } else if (deadlines.balanceOverdue) {
                        balanceDlEl.classList.add('is-overdue');
                    }
                } else {
                    depositDlEl.textContent = fmtDate(deadlines.depositDeadline);
                    if (ps === 'deposit_paid' || ps === 'fully_paid') {
                        depositDlEl.classList.add('is-paid');
                        depositDlEl.textContent += ' ✓';
                    } else if (deadlines.depositOverdue) {
                        depositDlEl.classList.add('is-overdue');
                    }

                    balanceDlEl.textContent = fmtDate(deadlines.balanceDeadline);
                    if (ps === 'fully_paid') {
                        balanceDlEl.classList.add('is-paid');
                        balanceDlEl.textContent += ' ✓';
                    } else if (deadlines.balanceOverdue) {
                        balanceDlEl.classList.add('is-overdue');
                    }
                }

                // Actieknoppen op basis van huidige status
                const actionsEl = document.getElementById('pay-modal-actions');
                actionsEl.innerHTML = '';

                if (ps === 'unpaid') {
                    actionsEl.innerHTML = `
                        <button class="pay-action-btn pay-action-btn--deposit" onclick="markPaymentStatus('${bookingId}', 'deposit_paid')">
                            <i class="ph ph-check-circle"></i> Aanbetaling ontvangen
                        </button>
                        <button class="pay-action-btn pay-action-btn--full" onclick="markPaymentStatus('${bookingId}', 'fully_paid')">
                            <i class="ph ph-check-square"></i> Volledig betaald
                        </button>
                    `;
                } else if (ps === 'deposit_paid') {
                    actionsEl.innerHTML = `
                        <button class="pay-action-btn pay-action-btn--full" onclick="markPaymentStatus('${bookingId}', 'fully_paid')">
                            <i class="ph ph-check-square"></i> Restbetaling ontvangen
                        </button>
                    `;
                } else if (ps === 'fully_paid') {
                    actionsEl.innerHTML = `<p style="text-align:center; color:#22c55e; font-weight:700; padding:8px 0;">Volledig betaald</p>`;
                }

                // Superuser: terugzetten optie
                const footerEl = document.getElementById('pay-modal-footer');
                footerEl.innerHTML = '';
                if (currentUserRole === 'superuser' && ps !== 'unpaid') {
                    footerEl.innerHTML = `
                        <button class="pay-action-btn pay-action-btn--reset" onclick="markPaymentStatus('${bookingId}', 'unpaid')">
                            Status terugzetten naar onbetaald
                        </button>
                    `;
                }

            } catch (err) {
                console.error('openPaymentModal error:', err);
                document.getElementById('pay-modal-actions').innerHTML =
                    `<p style="color:#ef4444; text-align:center;">Fout: ${err.message}</p>`;
            }
        };

        window.closePaymentModal = function() {
            const modal = document.getElementById('payment-status-modal');
            if (modal) modal.classList.remove('is-open');
        };

        window.showToast = function(title, message, type = 'success') {
            const container = document.getElementById('eb-toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `eb-toast eb-toast--${type}`;
            toast.innerHTML = `
                <div class="eb-toast__title">${title}</div>
                <div class="eb-toast__message">${message}</div>
                <div class="eb-toast__progress">
                    <div class="eb-toast__progress-bar"></div>
                </div>
            `;

            container.appendChild(toast);

            // Trigger animation
            setTimeout(() => toast.classList.add('active'), 10);

            // Auto-remove after 4s
            setTimeout(() => {
                toast.classList.remove('active');
                setTimeout(() => toast.remove(), 400);
            }, 4000);
        };

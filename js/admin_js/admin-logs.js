/* MODULE: Logs */
        // --- LOGS MANAGEMENT ---
        let allLogEntries = []; // Store all fetched logs for client-side filtering

        async function loadActivityLogs() {
            const listEl = document.getElementById('activity-logs-list');
            const loader = document.getElementById('logs-loader');
            if (!listEl) return;

            listEl.innerHTML = '';
            loader.style.display = 'block';

            try {
                const { db, collection, getDocs, query, orderBy } = await import('../site_js/core/firebase.js');
                const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);

                allLogEntries = [];
                querySnapshot.forEach((doc) => {
                    allLogEntries.push(doc.data());
                });

                // Fetch ALL bookings for the booking filter dropdown
                const bookingsSnap = await getDocs(collection(db, "bookings"));
                const allBookings = [];
                bookingsSnap.forEach(d => allBookings.push({ id: d.id, ...d.data() }));

                // Build dropdown options
                populateLogFilters(allLogEntries, allBookings);

                // Render all entries initially
                renderLogRows(allLogEntries);

            } catch (err) {
                console.error("Error loading logs:", err);
                listEl.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#e74c3c;">Fout bij laden van logs.</td></tr>';
            } finally {
                loader.style.display = 'none';
            }
        }

        function populateLogFilters(entries, allBookings = []) {
            const userSelect = document.getElementById('log-filter-user');
            const bookingSelect = document.getElementById('log-filter-booking');
            if (!userSelect || !bookingSelect) return;

            // Collect unique users from log entries
            const users = new Map(); // uid -> displayName
            entries.forEach(data => {
                if (data.userId && !users.has(data.userId)) {
                    const name = data.userName || data.userEmail?.split('@')[0] || data.userId;
                    users.set(data.userId, name);
                }
            });

            // Rebuild user options
            userSelect.innerHTML = '<option value="">Alle gebruikers</option>';
            users.forEach((name, uid) => {
                const opt = document.createElement('option');
                opt.value = uid;
                opt.textContent = name;
                userSelect.appendChild(opt);
            });

            // Rebuild booking options from ALL bookings, sorted by check-in
            bookingSelect.innerHTML = '<option value="">Alle boekingen</option>';
            const sorted = [...allBookings].sort((a, b) => {
                return new Date(a.checkIn || 0) - new Date(b.checkIn || 0);
            });
            sorted.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                const ref = b.bookingId || b.id;
                const name = b.guestName || 'Gast';
                const checkIn = b.checkIn || '';
                opt.textContent = `${name} — ${ref}${checkIn ? ' (' + checkIn + ')' : ''}`;
                bookingSelect.appendChild(opt);
            });
        }

        function filterLogs() {
            const selectedUser = document.getElementById('log-filter-user')?.value || '';
            const selectedBooking = document.getElementById('log-filter-booking')?.value || '';

            let filtered = allLogEntries;
            if (selectedUser) {
                filtered = filtered.filter(d => d.userId === selectedUser);
            }
            if (selectedBooking) {
                filtered = filtered.filter(d => d.bookingId === selectedBooking);
            }

            renderLogRows(filtered);
        }

        function renderLogRows(entries) {
            const listEl = document.getElementById('activity-logs-list');
            const countEl = document.getElementById('logs-result-count');
            if (!listEl) return;

            listEl.innerHTML = '';

            if (entries.length === 0) {
                listEl.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color:#94a3b8;">Geen activiteiten gevonden voor dit filter.</td></tr>';
                if (countEl) countEl.textContent = '0 resultaten';
                return;
            }

            if (countEl) countEl.textContent = `${entries.length} ${entries.length === 1 ? 'activiteit' : 'activiteiten'} gevonden`;

            entries.forEach((data) => {
                const date = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeStr = date.toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                const row = document.createElement('tr');
                const displayName = data.userName || data.userEmail?.split('@')[0] || '-';
                row.innerHTML = `
                    <td class="td-date">${timeStr}</td>
                    <td><strong>${displayName}</strong><br><small style="color:#94a3b8">${data.userEmail || ''}</small></td>
                    <td><span class="status-badge" style="background:#f1f5f9; color:#475569; border:none">${data.action}</span></td>
                    <td><code>${data.bookingId || '-'}</code></td>
                    <td style="font-size:0.85rem">${data.details}</td>
                `;
                listEl.appendChild(row);
            });
        }

        // --- FILTER LOGICA ---
        let currentFilter = 'pending';
        function filterBookings(status, el) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            el.classList.add('active');
            currentFilter = status;
            loadBookings(status);
        }

        function applyRolePermissions() {
            const isSuperUser = currentUserRole === 'superuser';

            // Show/hide current user info in sidebar
            const userInfoEl = document.getElementById('sidebar-user-info');
            const userEmailEl = document.getElementById('sidebar-user-email');
            const userRoleBadge = document.getElementById('sidebar-user-role-badge');
            if (userInfoEl && currentUser) {
                userInfoEl.style.display = 'block';
                // Show display name prominently, email smaller below
                userEmailEl.innerHTML = `${currentUserName || currentUser.email.split('@')[0]}<br><span style="font-size:0.75rem; font-weight:400; opacity:0.5;">${currentUser.email}</span>`;
                if (isSuperUser) {
                    userRoleBadge.textContent = '⭐ Super User';
                    userRoleBadge.style.background = 'rgba(197,160,89,0.25)';
                    userRoleBadge.style.color = 'var(--color-gold)';
                } else {
                    userRoleBadge.textContent = 'Medewerker';
                    userRoleBadge.style.background = 'rgba(255,255,255,0.1)';
                    userRoleBadge.style.color = 'rgba(255,255,255,0.6)';
                }
            }

            // Show/hide Superuser sections
            document.querySelectorAll('.section-superuser-only').forEach(el => {
                el.style.display = isSuperUser ? '' : 'none';
            });

            // Show/hide Excel Import tab
            const importDesktop = document.getElementById('nav-import-desktop');
            const logsDesktop = document.getElementById('nav-logs-desktop');
            
            if (importDesktop) importDesktop.style.display = isSuperUser ? '' : 'none';
            if (logsDesktop) logsDesktop.style.display = isSuperUser ? '' : 'none';
        }

        function showDashboard() {
            document.getElementById("login-screen").style.display = "none";
            document.getElementById("dashboard-screen").style.display = "block";
            // Pas flex toe op small screens
            if (window.innerWidth > 600) {
                document.body.style.display = 'flex';
            } else {
                document.body.style.display = 'block';
            }

            // Apply role-based UI restrictions
            applyRolePermissions();

            // Zorg dat de juiste view geladen wordt (default Alle Aanvragen)
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                const clickAttr = activeNav.getAttribute('onclick');
                if (clickAttr.includes('bookings-view')) {
                    loadBookings('pending');
                } else if (clickAttr.includes('mailchain-view')) {
                    loadMailChain();
                } else if (clickAttr.includes('logs-view') && currentUserRole === 'superuser') {
                    loadActivityLogs();
                }
            }
        }


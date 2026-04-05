        // --- HELPER FUNCTIONS ---
        function getCountryData(phone, bookingData = null) {
            // Priority 1: Use specific country code if available
            if (bookingData && bookingData.country) {
                const code = bookingData.country.toLowerCase();
                const names = {
                    'nl': 'Nederland', 'be': 'België', 'de': 'Duitsland', 'at': 'Oostenrijk',
                    'ch': 'Zwitserland', 'gb': 'UK', 'uk': 'UK', 'fr': 'Frankrijk',
                    'it': 'Italië', 'dk': 'Denemarken', 'se': 'Zweden', 'no': 'Noorwegen', 'es': 'Spanje'
                };
                if (names[code]) return { code: code, name: names[code] };
                return { code: code, name: bookingData.country }; // Fallback to raw code
            }

            // Priority 2: Use guestCountry name if available
            if (bookingData && bookingData.guestCountry) {
                const name = bookingData.guestCountry.toLowerCase();
                if (name.includes('nederland') || name === 'nl' || name.includes('netherlands')) return { code: 'nl', name: 'Nederland' };
                if (name.includes('belgi') || name === 'be') return { code: 'be', name: 'België' };
                if (name.includes('duits') || name === 'de' || name.includes('germany') || name === 'deutschland') return { code: 'de', name: 'Duitsland' };
                if (name.includes('oostenrijk') || name === 'at' || name.includes('austria')) return { code: 'at', name: 'Oostenrijk' };
                if (name.includes('zwitser') || name === 'ch' || name.includes('switzer')) return { code: 'ch', name: 'Zwitserland' };
                if (name.includes('frank') || name === 'fr' || name.includes('france')) return { code: 'fr', name: 'Frankrijk' };
                if (name.includes('itail') || name === 'it' || name.includes('italy')) return { code: 'it', name: 'Italië' };
                if (name.includes('uk') || name.includes('united kingdom') || name.includes('engeland') || name.includes('brit')) return { code: 'gb', name: 'UK' };
                if (name.includes('denemarken') || name === 'dk' || name.includes('denmark')) return { code: 'dk', name: 'Denemarken' };
                if (name.includes('zweden') || name === 'se' || name.includes('sweden')) return { code: 'se', name: 'Zweden' };
                if (name.includes('noorwegen') || name === 'no' || name.includes('norway')) return { code: 'no', name: 'Noorwegen' };
                if (name.includes('spanje') || name === 'es' || name.includes('spain')) return { code: 'es', name: 'Spanje' };
            }

            // Priority 3: Fallback to phone number detection
            if (!phone) return null;
            const p = phone.replace(/[^0-9+]/g, '');
            if (p.startsWith('+31')) return { code: 'nl', name: 'Nederland' };
            if (p.startsWith('+32')) return { code: 'be', name: 'België' };
            if (p.startsWith('+49')) return { code: 'de', name: 'Duitsland' };
            if (p.startsWith('+43')) return { code: 'at', name: 'Oostenrijk' };
            if (p.startsWith('+41')) return { code: 'ch', name: 'Zwitserland' };
            if (p.startsWith('+44')) return { code: 'gb', name: 'UK' };
            if (p.startsWith('+33')) return { code: 'fr', name: 'Frankrijk' };
            if (p.startsWith('+39')) return { code: 'it', name: 'Italië' };
            if (p.startsWith('+45')) return { code: 'dk', name: 'Denemarken' };
            if (p.startsWith('+46')) return { code: 'se', name: 'Zweden' };
            if (p.startsWith('+47')) return { code: 'no', name: 'Noorwegen' };
            if (p.startsWith('+34')) return { code: 'es', name: 'Spanje' };
            return null;
        }

        function detectLanguage(phone) {
            if (!phone) return 'nl';
            const p = phone.replace(/[^0-9+]/g, '');
            if (p.startsWith('+49') || p.startsWith('+43') || p.startsWith('+41')) return 'de';
            if (p.startsWith('+31') || p.startsWith('+32')) return 'nl';
            return 'en';
        }

        // --- 1. LOGIN LOGICA (Firebase Auth) ---
        let currentUser = null;
        let currentUserRole = 'user'; // Default to least privilege
        let currentUserName = '';    // Display name fetched from Firestore

        // AUTH Observer: Handle session properly
        import('../site_js/core/firebase.js').then(firebase => {
            firebase.onAuthStateChanged(firebase.auth, async (user) => {
                if (user) {
                    console.log("User is logged in:", user.email);
                    currentUser = user;

                    // Fetch role + displayName from Firestore 'users' collection
                    try {
                        const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists()) {
                            const data = userDoc.data();
                            currentUserRole = data.role === 'superuser' ? 'superuser' : 'user';
                            // Use stored displayName, or fall back to the part before @ in the email
                            currentUserName = data.displayName || user.email.split('@')[0];
                        } else {
                            currentUserRole = 'user';
                            currentUserName = user.email.split('@')[0];
                        }
                    } catch (e) {
                        console.warn('Could not fetch user role, defaulting to regular user.', e);
                        currentUserRole = 'user';
                        currentUserName = user.email.split('@')[0];
                    }

                    console.log('User role:', currentUserRole);
                    showDashboard();
                } else {
                    console.log("No user is logged in.");
                    currentUser = null;
                    currentUserRole = 'user';
                    currentUserName = '';
                    document.getElementById("dashboard-screen").style.display = "none";
                    document.getElementById("login-screen").style.display = "block";
                    document.body.style.display = 'flex';
                }
            });
        });

        async function login() {
            const emailInput = document.getElementById("admin-email").value;
            const passwordInput = document.getElementById("admin-password").value;
            const errorMsg = document.getElementById("login-error");
            const btn = document.getElementById("login-btn-el");

            if (!emailInput || !passwordInput) {
                errorMsg.innerText = "Vul a.u.b. alle velden in.";
                errorMsg.classList.add('visible');
                return;
            }

            try {
                btn.disabled = true;
                btn.innerText = "Bezig...";

                const { auth, signInWithEmailAndPassword } = await import('../site_js/core/firebase.js');
                await signInWithEmailAndPassword(auth, emailInput, passwordInput);

                // onAuthStateChanged will handle the UI transition
                errorMsg.classList.remove('visible');
            } catch (err) {
                console.error("Login failed:", err);
                errorMsg.innerText = "Inloggen mislukt. Controleer gegevens.";
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    errorMsg.innerText = "E-mail of wachtwoord onjuist.";
                }
                errorMsg.classList.add('visible');
                document.getElementById("admin-password").value = "";
            } finally {
                btn.disabled = false;
                btn.innerText = "Inloggen";
            }
        }

        async function logout() {
            try {
                const { auth, signOut } = await import('../site_js/core/firebase.js');
                await signOut(auth);
                // Auth observer handles the rest
            } catch (err) {
                console.error("Logout failed", err);
            }
        }

        // --- ACTIVITY LOGGING HELPER ---
        async function logActivity(action, details = '', bookingId = '') {
            if (!currentUser) return;
            try {
                const { db, collection, addDoc, serverTimestamp } = await import('../site_js/core/firebase.js');
                await addDoc(collection(db, "audit_logs"), {
                    timestamp: serverTimestamp(),
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    userName: currentUserName || currentUser.email.split('@')[0],
                    action: action,
                    details: details,
                    bookingId: bookingId
                });
                console.log(`Activity logged: ${action}`);
            } catch (err) {
                console.error("Failed to log activity:", err);
            }
        }

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

            // Show/hide Activiteiten tab (desktop + mobile)
            const logsDesktop = document.getElementById('nav-logs-desktop');
            const logsMobile = document.getElementById('nav-logs-mobile');
            if (logsDesktop) logsDesktop.style.display = isSuperUser ? '' : 'none';
            if (logsMobile) logsMobile.style.display = isSuperUser ? '' : 'none';

            // Show/hide Excel Import tab (desktop + mobile)
            const importDesktop = document.getElementById('nav-import-desktop');
            const importMobile = document.getElementById('nav-import-mobile');
            if (importDesktop) importDesktop.style.display = isSuperUser ? '' : 'none';
            if (importMobile) importMobile.style.display = isSuperUser ? '' : 'none';
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

        // --- 2. EMAILJS LOGICA ---
        // Initialize EmailJS config
        if (typeof emailjs !== 'undefined') {
            emailjs.init({ publicKey: "WC62OFB5MXpryYO1u" });
        }

        // Reusable function to send confirmation
        async function sendBookingConfirmation(tmplParams, btnElement, statusElement, bookingId) {
            const originalContent = btnElement.innerHTML;

            try {
                // UI State: Loading
                btnElement.disabled = true;
                btnElement.innerHTML = `<div class="spinner" style="display:block; margin:0 auto; width:18px; height:18px;"></div>`;
                if (statusElement) {
                    statusElement.innerHTML = "Bezig met verzenden...";
                    statusElement.classList.remove("success", "error");
                    statusElement.style.display = "block";
                }

                // Ensure to_email is present, fallback to a dash if missing (to see error clearer)
                if (!tmplParams.to_email) {
                    console.warn("to_email was missing in tmplParams, attempting to fix...");
                    tmplParams.to_email = tmplParams.user_email || "";
                }

                console.log("EmailJS Sending with template_oy6c1fe...", tmplParams);
                await emailjs.send('service_rl6qzmr', 'template_oy6c1fe', tmplParams, "WC62OFB5MXpryYO1u");

                // Update Firestore status if we have an ID
                if (bookingId) {
                    try {
                        const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                        await updateDoc(doc(db, "bookings", bookingId), {
                            status: "confirmed",
                            confirmedAt: new Date().toISOString()
                        });
                        console.log("Firestore status updated to confirmed.");

                        // LOG ACTIVITY
                        logActivity('BOOKING_CONFIRMED', `Boeking handmatig bevestigd en e-mail verstuurd naar ${tmplParams.to_email}`, bookingId);
                    } catch (fsErr) {
                        console.error("Firestore update failed:", fsErr);
                    }
                }

                // Success UI
                btnElement.innerHTML = "✅ VERSTUURD";
                btnElement.style.background = "#27ae60";
                if (statusElement) {
                    statusElement.innerHTML = "✅ De acceptatie-email is succesvol verstuurd naar " + tmplParams.to_email;
                    statusElement.classList.add("success");
                }
                return true;
            } catch (error) {
                console.error("EmailJS or Firestore Error:", error);
                const errorStr = error.text || error.message || "Onbekende fout";
                btnElement.innerHTML = "❌ FOUT: " + errorStr.substring(0, 20);
                btnElement.title = errorStr;
                btnElement.style.background = "#e74c3c";
                if (statusElement) {
                    statusElement.innerHTML = "❌ Fout: " + errorStr;
                    statusElement.classList.add("error");
                }
                setTimeout(() => {
                    btnElement.innerHTML = originalContent;
                    btnElement.disabled = false;
                    btnElement.style.background = "";
                }, 3000);
                return false;
            }
        }

        async function confirmDeleteBooking(bookingId, guestName) {
            const confirm1 = confirm(`Weet je zeker dat je de boeking van "${guestName}" permanent wilt verwijderen?`);
            if (!confirm1) return;

            const confirm2 = confirm(`LAATSTE WAARSCHUWING: Dit kan niet ongedaan worden gemaakt. Alle gegevens van deze boeking worden definitief gewist uit de database.\n\nWil je echt doorgaan met verwijderen?`);
            if (!confirm2) return;

            try {
                const { db, doc, deleteDoc } = await import('../site_js/core/firebase.js');
                await deleteDoc(doc(db, "bookings", bookingId));

                // 1. Remove from Bookings View
                const bookingCards = document.querySelectorAll('.booking-card');
                bookingCards.forEach(card => {
                    // Search for elements referring to this ID
                    if (card.innerHTML.includes(bookingId)) {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.9)';
                        setTimeout(() => card.remove(), 400);
                    }
                });

                // 2. Remove from Mail Chain View
                const mailCards = document.querySelectorAll('.mail-card');
                mailCards.forEach(card => {
                    if (card.id === `mc-card-${bookingId}`) {
                        card.style.opacity = '0';
                        card.style.transform = 'translateX(-20px)';
                        setTimeout(() => card.remove(), 400);
                    }
                });

                // 3. Close Hub Modal if open for this booking
                if (window.currentComposerData && window.currentComposerData.id === bookingId) {
                    closeCommHub();
                }

                alert("De boeking is definitief verwijderd.");
                logActivity('BOOKING_DELETED', `Boeking van ${guestName} definitief verwijderd`, bookingId);
                console.log("Booking deleted successfully:", bookingId);
            } catch (err) {
                console.error("Deletion failed:", err);
                alert("Fout bij verwijderen: " + err.message);
            }
        }

        function confirmDirectlyFromButton(btn) {
            const ds = btn.dataset;
            console.log("Direct confirmation button dataset:", ds);
            const params = {
                user_name: ds.name,
                user_email: ds.email,
                to_email: ds.email,
                check_in: ds.in,
                check_out: ds.out,
                guests: ds.guests + " personen",
                secretToken: ds.token || ""
            };
            console.log("Sending confirmation with params:", params);
            sendBookingConfirmation(params, btn, null, ds.id);
        }

        // Handle "accept-booking-form" only if it exists in the DOM
        const acceptBookingForm = document.getElementById("accept-booking-form");
        if (acceptBookingForm) {
            acceptBookingForm.addEventListener("submit", async function (e) {
                e.preventDefault();

                const submitBtn = document.getElementById("submit-btn");
                const statusDiv = document.getElementById("form-status");

                const dIn = new Date(document.getElementById("check-in").value);
                const dOut = new Date(document.getElementById("check-out").value);
                const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric' };

                const tmplParams = {
                    user_name: document.getElementById("guest-name").value,
                    user_email: document.getElementById("guest-email").value,
                    to_email: document.getElementById("guest-email").value,
                    check_in: dIn.toLocaleDateString('nl-NL', fmtOpts),
                    check_out: dOut.toLocaleDateString('nl-NL', fmtOpts),
                    guests: document.getElementById("guest-count").value + " personen"
                };

                const success = await sendBookingConfirmation(tmplParams, submitBtn, statusDiv);
                if (success) this.reset();
            });
        }

        // --- 3. VIEW SWITCHING ---
        async function copyComposerHtmlCode() {
            const previewArea = document.getElementById('composer-preview-area');
            const btn = document.getElementById('btn-composer-copy-code');

            // Clean up the HTML slightly (remove contenteditable if it leaked in, etc)
            let html = previewArea.innerHTML;

            // Wrap in basic boilerplate if not present
            if (!html.includes('\x3C!DOCTYPE html>')) {
                html = `\x3C!DOCTYPE html>\x3Chtml lang="nl">\x3Chead>\x3Cmeta charset="UTF-8">\x3Clink href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\x3C/head>\x3Cbody style="margin:0; background:#FAF9F6;">${html}\x3C/body>\x3C/html>`;
            }

            try {
                await navigator.clipboard.writeText(html);

                // Auto-check step in the hub
                const uiTemplateId = document.getElementById('composer-template-select').value;
                autoCheckMailStep(uiTemplateId);

                btn.innerHTML = '✔ HTML Gekopieerd!';
                btn.style.background = '#27ae60';
                setTimeout(() => {
                    btn.innerHTML = '⎘ Kopieer HTML-Code';
                    btn.style.background = '';
                }, 2000);
            } catch (err) {
                console.error("Copy failed:", err);
                alert("Kopiëren mislukt. Selecteer de tekst in het voorbeeld en kopieer handmatig.");
            }
        }

        function switchView(viewId, navEl) {
            // Block regular users from accessing superuser-only views
            if ((viewId === 'logs-view' || viewId === 'import-view') && currentUserRole !== 'superuser') {
                console.warn('Access denied: ' + viewId + ' requires superuser role.');
                return;
            }

            // Update desktop nav items
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            // Update mobile nav items
            document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));

            // Highlight the correct nav item by ID (more robust than index)
            if (viewId === 'bookings-view') {
                document.querySelectorAll('.nav-item')[0]?.classList.add('active');
                document.querySelectorAll('.mobile-nav-item')[0]?.classList.add('active');
            } else if (viewId === 'mailchain-view') {
                document.querySelectorAll('.nav-item')[1]?.classList.add('active');
                document.querySelectorAll('.mobile-nav-item')[1]?.classList.add('active');
            } else if (viewId === 'logs-view') {
                document.getElementById('nav-logs-desktop')?.classList.add('active');
                document.getElementById('nav-logs-mobile')?.classList.add('active');
            } else if (viewId === 'import-view') {
                document.getElementById('nav-import-desktop')?.classList.add('active');
                document.getElementById('nav-import-mobile')?.classList.add('active');
            } else if (viewId === 'carousel-view') {
                document.getElementById('nav-carousel-desktop')?.classList.add('active');
                document.getElementById('nav-carousel-mobile')?.classList.add('active');
            }

            // Update views
            document.querySelectorAll('.dashboard-view').forEach(el => el.classList.remove('active'));
            const targetView = document.getElementById(viewId);
            if (targetView) targetView.classList.add('active');

            if (viewId === 'bookings-view') {
                loadBookings();
            } else if (viewId === 'mailchain-view') {
                loadMailChain();
            } else if (viewId === 'logs-view') {
                loadActivityLogs();
            } else if (viewId === 'import-view') {
                initImportView();
            } else if (viewId === 'carousel-view') {
                loadCarouselView();
            }

            // Scroll to top when switching views on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function filterBookings(status, el) {
            // Update active state of buttons
            const parent = el.closest('.filter-bar');
            if (parent) {
                parent.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            }
            el.classList.add('active');

            // Reload list with filter
            loadBookings(status);
        }

        async function loadBookings(status = 'all') {
            const list = document.getElementById('bookings-list');
            const loader = document.getElementById('bookings-loader');

            list.innerHTML = '';
            loader.style.display = 'block';

            try {
                const { db, collection, getDocs, query, orderBy } = await import('../site_js/core/firebase.js');

                // Fetch all initially to avoid composite index requirements in Firestore
                const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);

                loader.style.display = 'none';

                let matchCount = 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const matchedBookings = [];

                querySnapshot.forEach((doc) => {
                    const data = { id: doc.id, ...doc.data() };

                    // Bereken of datum verstreken is (check-out is voor vandaag of vandaag zelf)
                    const checkOutDate = new Date(data.checkOut);
                    checkOutDate.setHours(0, 0, 0, 0);
                    const isPassed = checkOutDate <= today;

                    // Client-side filtering logic
                    let isMatch = false;
                    if (status === 'all') {
                        isMatch = true;
                    } else if (status === 'completed') {
                        isMatch = isPassed;
                    } else if (status === 'pending') {
                        isMatch = !isPassed && data.status === 'pending';
                    } else if (status === 'confirmed') {
                        isMatch = !isPassed && data.status === 'confirmed';
                    } else if (status === 'declined') {
                        isMatch = data.status === 'declined';
                    }

                    if (isMatch) {
                        data.isPassed = isPassed;
                        matchedBookings.push(data);
                    }
                });

                // Sort bookings by check-in date (closest first)
                matchedBookings.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

                matchedBookings.forEach(data => {
                    matchCount++;
                    const card = document.createElement('div');
                    card.className = 'booking-card';

                    const dIn = new Date(data.checkIn);
                    const dOut = new Date(data.checkOut);
                    const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric' };

                    const rawVal = data.totalAmount || data.total_amount || 0;
                    const raw = (typeof rawVal === 'string') ? parseFloat(rawVal.replace(/[^0-9,.-]/g, '').replace(',', '.')) : rawVal;
                    const fmt = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0);
                    const totalAmount = raw ? fmt(raw) : 'N/A';
                    const depositAmount = raw ? fmt(raw * 0.30) : '';
                    const balanceAmount = raw ? fmt(raw * 0.70) : '';

                    // Construct Pre-filled Email Body
                    let emailBody = `Beste ${data.guestName || 'Gast'},\n\n`;
                    emailBody += `Hierbij sturen wij u een bericht over uw boeking:\n\n`;
                    emailBody += `• Check-in:  ${dIn.toLocaleDateString('nl-NL', fmtOpts)}\n`;
                    emailBody += `• Check-out: ${dOut.toLocaleDateString('nl-NL', fmtOpts)}\n`;
                    emailBody += `• Reizigers: ${data.totalGuests} personen\n`;
                    if (raw) emailBody += `• Totaalbedrag: ${totalAmount}\n`;
                    emailBody += `\nMet vriendelijke groet,\nTeam Gipfel Lodge\nwww.gipfellodge.at`;

                    const encodedSubject = encodeURIComponent("Bericht over uw boeking bij Gipfel Lodge");
                    const encodedBody = encodeURIComponent(emailBody);
                    const mailtoLink = `mailto:${data.guestEmail || ''}?subject=${encodedSubject}&body=${encodedBody}`;
                    const cardIsPassed = data.isPassed;

                    const country = getCountryData(data.guestPhone, data);

                    card.innerHTML = `
                        <div class="booking-card-header">
                            <div>
                                <p style="font-size: 0.7rem; font-weight: 800; color: var(--color-gold); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Ref: ${data.bookingId || data.id}</p>
                                <h3>${data.guestName || 'Gast'}</h3>
                                <p style="margin-bottom: 4px; font-weight: 600; color: var(--color-slate);">${data.guestEmail || '-'}</p>
                                <p style="font-size: 0.85rem;">${data.guestPhone || '-'}</p>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="status-badge status-${cardIsPassed ? 'completed' : (data.status || 'pending')}">
                                        ${cardIsPassed ? 'Voltooid' : (data.status === 'pending' ? 'In Afwachting' : (data.status === 'confirmed' ? 'Bevestigd' : (data.status === 'declined' ? 'Geweigerd' : data.status)))}
                                    </span>
                                    ${(data.status === 'declined' && currentUserRole === 'superuser') ? `
                                        <button class="delete-btn-trash" onclick="confirmDeleteBooking('${data.id}', '${data.guestName}')" title="Boeking permanent verwijderen">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    ` : ''}
                                </div>
                                ${country ? `
                                    <div class="country-badge" style="margin-top: 0;">
                                        <img src="https://flagcdn.com/w40/${country.code}.png" alt="${country.name}">
                                        <span class="country-code-label">${country.code}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="booking-card-body">
                            <div class="tile-data-row">
                                <span class="tile-section-label">Boeking binnengekomen:</span>
                                <strong>${data.receivedDate || '-'}</strong> om ${data.receivedTime || '-'}
                            </div>
                            
                            <div class="tile-data-row">
                                <span class="tile-section-label">Gewenst verblijf periode:</span>
                                <strong>${data.checkIn} t/m ${data.checkOut}</strong>
                            </div>
                            
                            <div class="tile-data-row">
                                <span class="tile-section-label">Gasten:</span>
                                <strong>${[
                            data.adults > 0 ? `volw: ${data.adults}` : null,
                            data.children > 0 ? `kind: ${data.children}` : null,
                            data.babies > 0 ? `baby: ${data.babies}` : null
                        ].filter(x => x).join(' | ') || 'Niet gespecificeerd'}</strong>
                            </div>
                            
                            <div class="tile-data-row">
                                <span class="tile-section-label">Bericht / opmerking:</span>
                                <p style="font-style: italic; opacity: 0.8; font-size: 0.95rem;">"${data.message || 'Geen bericht'}"</p>
                            </div>

                            <div class="payment-info">
                                <div class="payment-toggle" style="border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; margin-bottom: 5px;">
                                    <strong style="color: var(--color-slate); font-size: 1rem;">Totaal bedrag:</strong>
                                    <strong style="color: var(--color-gold); font-size: 1.1rem;">${totalAmount}</strong>
                                </div>
                                
                                <div class="payment-toggle">
                                    <span>30% aanbetaling: <strong style="color: var(--color-slate); margin-left: 4px;">${depositAmount}</strong></span>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" ${data.depositPaid ? 'checked' : ''} onchange="togglePayment('${data.id}', 'depositPaid', this.checked, this)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>

                                <div class="payment-toggle">
                                    <span>Rest betaling: <strong style="color: var(--color-slate); margin-left: 4px;">${balanceAmount}</strong></span>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" ${data.balancePaid ? 'checked' : ''} onchange="togglePayment('${data.id}', 'balancePaid', this.checked, this)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="booking-card-footer" style="display:flex; flex-direction:column; gap:12px;">
                            ${data.status === 'declined' ? `
                                <button class="btn btn-primary action-btn" onclick="openCommunicationHub('${data.id}')" style="background:transparent; border:1px solid var(--color-gold); color:var(--color-gold);">
                                    ✉ Beheer Communicatie
                                </button>
                                <button class="btn-decline confirming" style="background: rgba(198,40,40,0.06); color: #c62828; border-color: rgba(198,40,40,0.3);" onclick="undeclineBooking('${data.id}', this)">
                                    ↩ Weigering ongedaan maken
                                </button>
                            ` : `
                                <button class="btn btn-primary action-btn" onclick="openCommunicationHub('${data.id}')" style="background:transparent; border:1px solid var(--color-gold); color:var(--color-gold);">
                                    ✉ Beheer Communicatie
                                </button>
                                <button class="btn-confirm-direct" 
                                    data-id="${data.id}" 
                                    data-name="${data.guestName}" 
                                    data-email="${data.guestEmail}" 
                                    data-in="${data.checkIn}" 
                                    data-out="${data.checkOut}" 
                                    data-guests="${data.totalGuests}"
                                    data-token="${data.secretToken || ''}"
                                    onclick="confirmDirectlyFromButton(this)">
                                    ✔ Bevestig & Mail Factuur
                                </button>
                                <button class="btn-decline" onclick="declineBooking('${data.id}', this)">
                                    ✕ Boeking Weigeren (Snel)
                                </button>
                            `}
                        </div>
                    `;
                    list.appendChild(card);
                });

                if (matchCount === 0) {
                    list.innerHTML = `<p style="grid-column: 1/-1; text-align: center; opacity: 0.6; padding: 40px;">Geen boeking gevonden voor de status: <strong>${status}</strong></p>`;
                }

            } catch (err) {
                console.error("Fout bij laden boekingen:", err);
                loader.style.display = 'none';
                list.innerHTML = '<p style="color: #ff6b6b; grid-column: 1/-1; text-align: center;">Fout bij laden van gegevens.</p>';
            }
        }

        function switchCommHubTab(tabId) {
            // Update tabs
            document.querySelectorAll('.hub-tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-btn-' + tabId).classList.add('active');

            // Update panes
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');
        }

        function openPreloadedComposer(templateId) {
            switchCommHubTab('editor');
            const select = document.getElementById('composer-template-select');
            if (select) {
                select.value = templateId;
                loadSelectedTemplateIntoComposer();
            }
        }

        function closeCommHub() {
            document.getElementById('comm-hub-modal').classList.remove('active');
            document.body.style.overflow = '';
        }

        function renderHubSteps(data) {
            const mc = data.mailChain || {};
            const isPending = data.status === 'pending';

            const list = document.getElementById('hub-step-list-container');
            if (!list) return;

            const steps = [
                { key: 'received', title: '1. Boeking ontvangen', tmpl: '', done: true },
                { key: 'accepted', title: '2. Accepteren / Weigeren', tmpl: 'acceptance', done: !isPending },
                { key: 'depositReminder', title: '3. Aanbetaling Herinnering', tmpl: 'deposit_request', done: !!mc.depositReminder },
                { key: 'depositReceived', title: '4. Aanbetaling Ontvangen', tmpl: 'deposit_received', done: !!mc.depositReceived },
                { key: 'balanceReminder', title: '5. Restbetaling Herinnering', tmpl: 'balance_reminder', done: !!mc.balanceReminder },
                { key: 'balanceReceived', title: '6. Restbetaling Ontvangen', tmpl: 'balance_received', done: !!mc.balanceReceived },
                { key: 'preStayInfo', title: '7. Regels & Wachtwoorden', tmpl: 'rules_info', done: !!mc.preStayInfo },
                { key: 'postStay', title: '8. Bedankje & Review', tmpl: 'post_stay', done: !!mc.postStay }
            ];

            // Recommendation Logic
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dIn = new Date(data.checkIn);
            dIn.setHours(0, 0, 0, 0);
            const dOut = new Date(data.checkOut);
            dOut.setHours(0, 0, 0, 0);

            const diffIn = Math.ceil((dIn - today) / (1000 * 60 * 60 * 24));
            const diffOut = Math.ceil((today - dOut) / (1000 * 60 * 60 * 24));

            let recStep = 0;
            if (isPending) {
                recStep = 2;
            } else if (data.status === 'confirmed') {
                if (!data.depositPaid && !mc.depositReminder) recStep = 3;
                else if (data.depositPaid && !mc.depositReceived) recStep = 4;
                else if (!data.balancePaid && diffIn <= 45 && diffIn > 0 && !mc.balanceReminder) recStep = 5;
                else if (data.balancePaid && !mc.balanceReceived) recStep = 6;
                else if (diffIn <= 7 && diffIn >= -1 && !mc.preStayInfo) recStep = 7;
                else if (diffOut >= 0 && diffOut <= 7 && !mc.postStay) recStep = 8;
            }

            // Find first uncompleted step (next step)
            let nextStepIndex = steps.findIndex(s => !s.done);

            let html = '';
            steps.forEach((s, idx) => {
                const isNext = (idx === nextStepIndex);
                const clickAttr = s.tmpl ? `onclick="openPreloadedComposer('${s.tmpl}')"` : '';
                const pointerStyle = s.tmpl ? 'cursor: pointer;' : '';

                let iconHtml = s.done
                    ? `<span class="hub-step-icon icon-check" style="color: #6b21a8; font-size: 1.2rem; font-weight: bold; cursor: pointer; padding: 4px;" onclick="toggleHubStepManual(event, '${data.id}', '${s.key}', false)">✓</span>`
                    : `<span class="hub-step-icon icon-wait" style="font-size: 1.2rem; cursor: pointer; padding: 4px;" onclick="toggleHubStepManual(event, '${data.id}', '${s.key}', true)">⏳</span>`;

                let badgeHtml = isNext ? `<span class="badge-next-step">VOLGENDE STAP</span>` : '';

                // Extra styling for "next step"
                let extraClasses = isNext ? 'hub-step-next' : '';
                if (s.done) extraClasses += ' completed';
                if (idx + 1 === recStep) extraClasses += ' recommended-step';

                html += `
                    <div class="hub-step ${extraClasses}" style="${pointerStyle}" ${clickAttr}>
                        <div class="hub-step-title" style="display: flex; align-items: center;">
                            <span class="hub-step-text">
                                ${s.title}
                            </span>
                            ${badgeHtml}
                        </div>
                        ${iconHtml}
                    </div>
                `;
            });

            list.innerHTML = html;
        }

        async function toggleHubStepManual(event, bookingId, stepKey, value) {
            if (event) event.stopPropagation(); // Don't trigger composer
            if (stepKey === 'received' || stepKey === 'accepted') {
                console.log("Stap 1 & 2 worden automatisch beheerd.");
                return;
            }

            try {
                // Call existing toggle function that syncs Firestore
                await toggleMailStep(bookingId, stepKey, value);

                // Re-fetch data and refresh Hub and Mail Chain
                const { db } = await import('../site_js/core/firebase.js');
                const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
                const snap = await getDoc(doc(db, "bookings", bookingId));
                if (snap.exists()) {
                    renderHubSteps({ id: snap.id, ...snap.data() });
                    // Also refresh the background mail chain page
                    loadMailChain();
                }
            } catch (e) {
                console.error("Fout bij handmatig afvinken:", e);
                alert("Kon status niet bijwerken.");
            }
        }

        function copyHubEmail() {
            const email = document.getElementById('hub-guest-email').innerText;
            if (email && email !== '-') {
                navigator.clipboard.writeText(email)
                    .then(() => {
                        const btn = document.querySelector('.btn-copy-email');
                        const origHtml = btn.innerHTML;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                        setTimeout(() => btn.innerHTML = origHtml, 2000);
                    })
                    .catch(err => console.error("Kopiëren mislukt", err));
            }
        }

        async function openCommunicationHub(bookingId) {
            try {
                const { db } = await import('../site_js/core/firebase.js');
                const { getDoc, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js');
                const snap = await getDoc(doc(db, "bookings", bookingId));

                if (!snap.exists()) {
                    alert('Boeking niet gevonden!');
                    return;
                }

                const data = { id: snap.id, ...snap.data() };

                // --- AUTO-HEALING: Ensure secretToken exists for old bookings ---
                if (!data.secretToken) {
                    console.log("Auto-healing: Generating missing secretToken for booking", bookingId);
                    const newToken = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
                    try {
                        await updateDoc(doc(db, "bookings", bookingId), {
                            secretToken: newToken,
                            updatedAt: new Date().toISOString()
                        });
                        data.secretToken = newToken; // Update local copy
                        logActivity('DATABASE_HEALED', 'Missende secretToken automatisch gegenereerd', bookingId);
                    } catch (healErr) {
                        console.error("Failed to heal booking with token:", healErr);
                    }
                }

                // Set Modal Labels
                document.getElementById('hub-guest-name').innerText = data.guestName || 'Gast';
                document.getElementById('hub-guest-email').innerText = data.guestEmail || '-';

                const statusBadge = document.getElementById('hub-guest-status');
                if (data.status === 'pending') {
                    statusBadge.innerText = 'WACHT OP ACTIE';
                    statusBadge.style.color = '#c47e09';
                    statusBadge.style.background = '#fdf8f0';
                    statusBadge.style.borderColor = '#fbebd0';
                } else if (data.status === 'declined') {
                    statusBadge.innerText = 'GEWEIGERD';
                    statusBadge.style.color = '#c62828';
                    statusBadge.style.background = 'rgba(211, 47, 47, 0.08)';
                    statusBadge.style.borderColor = 'rgba(211, 47, 47, 0.2)';
                } else {
                    statusBadge.innerText = 'BEVESTIGD';
                    statusBadge.style.color = '#2e7d32';
                    statusBadge.style.background = 'rgba(46, 125, 50, 0.1)';
                    statusBadge.style.borderColor = 'rgba(46, 125, 50, 0.2)';
                }

                // Landkaartje/Flag in Hub
                const country = getCountryData(data.guestPhone, data);
                const hubHeaderInfo = document.querySelector('.status-overview-header > div');
                // Check if already exists to avoid duplication if opened multiple times
                const existingCountry = hubHeaderInfo.querySelector('.country-badge');
                if (existingCountry) existingCountry.remove();

                if (country) {
                    const cb = document.createElement('div');
                    cb.className = 'country-badge';
                    cb.style.marginTop = '12px';
                    cb.innerHTML = `
                        <img src="https://flagcdn.com/w40/${country.code}.png" alt="${country.name}">
                        <span class="country-code-label">${country.code}</span>
                    `;
                    hubHeaderInfo.appendChild(cb);
                }

                renderHubSteps(data);

                // Setup the Email Editor state
                const dIn = new Date(data.checkIn);
                const dOut = new Date(data.checkOut);
                const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric' };

                const rawVal = data.totalAmount || data.total_amount || 0;
                const raw = (typeof rawVal === 'string') ? parseFloat(rawVal.replace(/[^0-9,.-]/g, '').replace(',', '.')) : rawVal;
                const fmt = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0);
                const tAmt = raw ? fmt(raw) : '€ [BEDRAG]';
                const dAmt = raw ? fmt(raw * 0.3) : '€ [BEDRAG]';
                const bAmt = raw ? fmt(raw * 0.7) : '€ [BEDRAG]';

                const phone = data.guestPhone || '';
                currentLang = detectLanguage(phone);
                const labels = composerLabels[currentLang];

                let guestsStr = data.totalGuests || '';
                if (data.adults !== undefined) {
                    const parts = [];
                    const ad = parseInt(data.adults) || 0;
                    const ch = parseInt(data.children) || 0;
                    const ba = parseInt(data.babies) || 0;
                    if (ad > 0) parts.push(`${ad} ${labels.adults}`);
                    if (ch > 0) parts.push(`${ch} ${labels.children}`);
                    if (ba > 0) parts.push(`${ba} ${labels.baby}`);
                    if (parts.length > 0) guestsStr = parts.join(' | ');
                }

                currentComposerData = {
                    id: data.id || '',
                    name: data.guestName || 'Gast',
                    email: data.guestEmail || '',
                    phone: phone,
                    in: dIn.toLocaleDateString('nl-NL', fmtOpts),
                    out: dOut.toLocaleDateString('nl-NL', fmtOpts),
                    guests: guestsStr,
                    tot: tAmt,
                    dep: dAmt,
                    bal: bAmt,
                    message: data.message || '',
                    status: data.status || 'pending',
                    mailChain: data.mailChain || {},
                    token: data.secretToken || ''
                };

                switchCommHubTab('status');

                document.getElementById('comm-hub-modal').classList.add('active');
                document.body.style.overflow = 'hidden';

                document.getElementById('composer-template-select').value = 'general';
                loadSelectedTemplateIntoComposer();

            } catch (e) {
                console.error("Error opening comm hub:", e);
                alert("Kon boeking niet openen in Hub.");
            }
        }

        async function loadMailChain() {
            const list = document.getElementById('mailchain-list');
            const loader = document.getElementById('mailchain-loader');
            const prioList = document.getElementById('prio-list');
            const prioSection = document.getElementById('prio-section');
            const prioCountBadge = document.getElementById('prio-count');

            list.innerHTML = '';
            prioList.innerHTML = '';
            loader.style.display = 'block';
            prioSection.style.display = 'none';

            let prioHtml = '';
            let prioCount = 0;

            try {
                const { db, collection, getDocs } = await import('../site_js/core/firebase.js');
                const querySnapshot = await getDocs(collection(db, "bookings"));

                loader.style.display = 'none';

                let matchCount = 0;
                const now = new Date();

                // Sort bookings by check-in date (closest first)
                const bookings = [];
                querySnapshot.forEach(doc => {
                    bookings.push({ id: doc.id, ...doc.data() });
                });
                bookings.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

                bookings.forEach(data => {
                    // Do NOT filter out unconfirmed, show all so we can send request/acceptance mails

                    matchCount++;
                    const card = document.createElement('div');
                    card.className = 'booking-card';
                    card.id = `mc-card-${data.id}`; // Add ID to allow anchoring

                    const dIn = new Date(data.checkIn);
                    const dOut = new Date(data.checkOut);
                    const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric' };

                    const country = getCountryData(data.guestPhone, data);

                    // RECOMMENDATION LOGIC
                    const todayRef = new Date();
                    todayRef.setHours(0, 0, 0, 0);
                    const checkInRef = new Date(data.checkIn);
                    checkInRef.setHours(0, 0, 0, 0);
                    const checkOutRef = new Date(data.checkOut);
                    checkOutRef.setHours(0, 0, 0, 0);

                    const diffIn = Math.ceil((checkInRef - todayRef) / (1000 * 60 * 60 * 24));
                    const diffOut = Math.ceil((todayRef - checkOutRef) / (1000 * 60 * 60 * 24));

                    const mc = data.mailChain || {};
                    const isPending = data.status === 'pending';
                    const isDeclined = data.status === 'declined';
                    const isConfirmed = data.status === 'confirmed';
                    const s3_depRem = mc.depositReminder || false;
                    const s4_depRec = mc.depositReceived || false;
                    const s5_balRem = mc.balanceReminder || false;
                    const s6_balRec = mc.balanceReceived || false;
                    const s7_preStay = mc.preStayInfo || false;
                    const s8_postStay = mc.postStay || false;

                    // CURRENCY CALCULATIONS
                    const rawPVal = data.totalAmount || data.total_amount || 0;
                    const rawP = (typeof rawPVal === 'string') ? parseFloat(rawPVal.replace(/[^0-9,.-]/g, '').replace(',', '.')) : rawPVal;
                    const fmtP = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0);
                    const tAmt = rawP ? fmtP(rawP) : '€ [BEDRAG]';
                    const dAmt = rawP ? fmtP(rawP * 0.3) : '€ [BEDRAG]';
                    const bAmt = rawP ? fmtP(rawP * 0.7) : '€ [BEDRAG]';

                    let recStep = 0;
                    if (isPending) {
                        recStep = 2; // Accepteren / Weigeren
                    } else if (isConfirmed) {
                        if (!data.depositPaid && !mc.depositReminder) {
                            recStep = 3; // Aanbetaling herinnering
                        } else if (data.depositPaid && !mc.depositReceived) {
                            recStep = 4; // Aanbetaling ontvangen
                        } else if (!data.balancePaid && diffIn <= 45 && diffIn > 0 && !mc.balanceReminder) {
                            recStep = 5; // Restbetaling herinnering
                        } else if (data.balancePaid && !mc.balanceReceived) {
                            recStep = 6; // Restbetaling ontvangen
                        } else if (diffIn <= 7 && diffIn >= -1 && !mc.preStayInfo) {
                            recStep = 7; // Regels & Wachtwoorden
                        } else if (diffOut >= 0 && diffOut <= 7 && !mc.postStay) {
                            recStep = 8; // Bedankje & Review
                        }
                    }

                    // CHECK FOR PRIORITY TASK
                    if (recStep > 0) {
                        prioCount++;
                        const stepNames = {
                            2: "Accepteren / Weigeren",
                            3: "Aanbetaling Herinnering",
                            4: "Aanbetaling Ontvangen",
                            5: "Restbetaling Herinnering",
                            6: "Restbetaling Ontvangen",
                            7: "Regels & Wachtwoorden",
                            8: "Bedankje & Review"
                        };
                        const taskName = stepNames[recStep];

                        prioHtml += `
                            <div class="prio-item">
                                <div class="prio-item-main">
                                    <div class="prio-item-guest">
                                        ${data.guestName || 'Gast'}
                                    </div>
                                    <div class="prio-item-task">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-gold);"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        ${taskName}
                                    </div>
                                </div>
                                <button class="prio-item-btn" onclick="document.getElementById('mc-card-${data.id}').scrollIntoView({behavior:'smooth'}); setTimeout(()=>openCommunicationHub('${data.id}'), 500);">
                                    BEHANDELEN
                                </button>
                            </div>
                        `;
                    }

                    let statusHtml = '';
                    if (isPending) statusHtml = '<span class="status-badge status-pending">In Afwachting</span>';
                    else if (isDeclined) statusHtml = '<span class="status-badge status-declined">Geweigerd</span>';
                    else statusHtml = '<span class="status-badge status-confirmed">Bevestigd</span>';

                    card.innerHTML = `
                        <div class="booking-card-header">
                            <div>
                                <h3>${data.guestName || 'Gast'}</h3>
                                <p style="margin-bottom: 4px; font-weight: 600; color: var(--color-slate);">${data.guestEmail || '-'}</p>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${statusHtml}
                                </div>
                                ${country ? `
                                    <div class="country-badge" style="margin-top: 0;">
                                        <img src="https://flagcdn.com/w40/${country.code}.png" alt="${country.name}">
                                        <span class="country-code-label">${country.code}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="booking-card-body">
                            <div class="booking-info-row">
                                <span class="tile-section-label">Verblijf:</span>
                                <strong>${dIn.toLocaleDateString('nl-NL', fmtOpts)} – ${dOut.toLocaleDateString('nl-NL', fmtOpts)}</strong>
                            </div>
                            
                            <div class="payment-info" style="margin-top: 15px;">
                                <!-- Step 1 -->
                                <div class="payment-toggle" style="padding-bottom:10px;">
                                    <div>
                                        <span style="opacity: 0.6; display:block;">1. Boeking ontvangen</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="general" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <span style="color: var(--color-gold); font-size: 0.8rem; font-weight: bold;">✔ VOLTOOID</span>
                                </div>
                                
                                <!-- Step 2 -->
                                <div class="payment-toggle ${recStep === 2 ? 'recommended-step' : ''}" style="border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 15px; margin-bottom: 5px;">
                                    <div>
                                        <span style="opacity: ${isPending ? '1' : '0.6'}; display:block; font-size: 0.85rem;">2. Accepteren / Weigeren</span>
                                        <div style="display:flex; gap:8px; margin-top:8px;">
                                            <a href="javascript:void(0)" 
                                                data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" 
                                                data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                                data-guests="${data.totalGuests || '-'}" 
                                                data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                                data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                                data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="acceptance" 
                                                onclick="openEmailComposer(this)" 
                                                style="background: rgba(40, 167, 69, 0.05); border: 1px solid rgba(40, 167, 69, 0.2); color: #28a745; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 0.68rem; font-weight: 800; transition: all 0.2s;">✉ ACCEPTEER</a>
                                            <a href="javascript:void(0)" 
                                                data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" 
                                                data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                                data-guests="${data.totalGuests || '-'}" 
                                                data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                                data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                                data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="rejection" 
                                                onclick="openEmailComposer(this)" 
                                                style="background: rgba(220, 53, 69, 0.04); border: 1px solid rgba(220, 53, 69, 0.15); color: #dc3545; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 0.68rem; font-weight: 800; transition: all 0.2s;">✉ WEIGER</a>
                                        </div>
                                    </div>
                                    <span style="color: var(--color-gold); font-size: 0.8rem; font-weight: bold;">${!isPending ? '✔ VOLTOOID' : 'ACTIE VEREIST'}</span>
                                </div>
                                
                                <!-- Step 3 -->
                                <div class="payment-toggle ${recStep === 3 ? 'recommended-step' : ''}">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>3. Betalingsherinnering (Aanbetaling)</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="deposit_request" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" data-step="depositReminder" ${s3_depRem ? 'checked' : ''} onchange="toggleMailStep('${data.id}', 'depositReminder', this.checked)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Step 4 -->
                                <div class="payment-toggle ${recStep === 4 ? 'recommended-step' : ''}">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>4. Aanbetaling ontvangen mail</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="deposit_received" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" data-step="depositReceived" ${s4_depRec ? 'checked' : ''} onchange="toggleMailStep('${data.id}', 'depositReceived', this.checked)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Step 5 -->
                                <div class="payment-toggle ${recStep === 5 ? 'recommended-step' : ''}">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>5. Restbetaling herinnering mail</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="balance_reminder" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" data-step="balanceReminder" ${s5_balRem ? 'checked' : ''} onchange="toggleMailStep('${data.id}', 'balanceReminder', this.checked)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Step 6 -->
                                <div class="payment-toggle ${recStep === 6 ? 'recommended-step' : ''}">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>6. Restbetaling ontvangen mail</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="balance_received" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" data-step="balanceReceived" ${s6_balRec ? 'checked' : ''} onchange="toggleMailStep('${data.id}', 'balanceReceived', this.checked)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Step 7 -->
                                <div class="payment-toggle ${recStep === 7 ? 'recommended-step' : ''}">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>7. Regels & wachtwoorden</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="rules_info" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" data-step="preStayInfo" ${s7_preStay ? 'checked' : ''} onchange="toggleMailStep('${data.id}', 'preStayInfo', this.checked)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Step 8 -->
                                <div class="payment-toggle ${recStep === 8 ? 'recommended-step' : ''}">
                                    <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>8. Bedankje & Review (Na verblijf)</span>
                                        <a href="javascript:void(0)" 
                                            data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                            data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                            data-guests="${data.totalGuests || '-'}" 
                                            data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                            data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                            data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="post_stay" 
                                            onclick="openEmailComposer(this)" 
                                            style="font-size: 0.75rem; color: var(--color-gold); text-decoration: none; font-weight:700;">✉ BEWERK & KOPIEER</a>
                                    </div>
                                    <div class="payment-toggle-controls">
                                        <label class="switch">
                                            <input type="checkbox" data-step="postStay" ${s8_postStay ? 'checked' : ''} onchange="toggleMailStep('${data.id}', 'postStay', this.checked)">
                                            <span class="slider" data-off="Nee"><span class="slider-on-label">Ja</span></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Overige Acties -->
                            <div style="margin-top:20px; padding-top:15px; border-top: 1px solid rgba(0,0,0,0.05);">
                                <span style="font-size:0.75rem; font-weight:bold; color:var(--color-slate); text-transform:uppercase; margin-bottom:10px; display:block;">Overige Communicatie</span>
                                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                    <button 
                                        data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                        data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                        data-guests="${data.totalGuests || '-'}" 
                                        data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                        data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                        data-message="${data.message || ''}" data-token="${data.secretToken || ''}" data-type="general" 
                                        onclick="openEmailComposer(this)" 
                                        class="btn btn-secondary action-btn" style="padding: 6px 12px; font-size: 0.75rem; border: 1px solid var(--color-slate); color: var(--color-slate); text-decoration: none; border-radius: 4px; font-weight: bold; background: #fff;">✉ ALGEMEEN BERICHT</button>
                                    <button 
                                        data-id="${data.id}" data-name="${data.guestName || ''}" data-email="${data.guestEmail || ''}" data-phone="${data.guestPhone || ''}"
                                        data-in="${dIn.toLocaleDateString('nl-NL', fmtOpts)}" data-out="${dOut.toLocaleDateString('nl-NL', fmtOpts)}" 
                                        data-guests="${data.totalGuests || '-'}" 
                                        data-adults="${data.adults || 0}" data-children="${data.children || 0}" data-babies="${data.babies || 0}"
                                        data-tot="${tAmt}" data-dep="${dAmt}" data-bal="${bAmt}" 
                                        data-message="${data.message || ''}" data-type="rejection" 
                                        onclick="openEmailComposer(this)" 
                                        class="btn btn-secondary action-btn" style="padding: 6px 12px; font-size: 0.75rem; border: 1px solid #dc3545; color: #dc3545; text-decoration: none; border-radius: 4px; font-weight: bold; background: #fff;">✕ ANNULERING / WEIGERING</button>
                                </div>
                            </div>
                        </div>
                    `;
                    list.appendChild(card);
                });

                // RENDER PRIO SECTION IF TASKS EXIST
                if (prioCount > 0) {
                    prioList.innerHTML = prioHtml;
                    prioCountBadge.innerText = prioCount;
                    prioSection.style.display = 'block';
                } else {
                    prioSection.style.display = 'none';
                }

                if (matchCount === 0) {
                    list.innerHTML = `<p style="grid-column: 1/-1; text-align: center; opacity: 0.6; padding: 40px;">Geen boekingen of aanvragen gevonden voor de mail-chain.</p>`;
                }

            } catch (err) {
                console.error("Fout bij laden mail-chain:", err);
                loader.style.display = 'none';
                list.innerHTML = '<p style="color: #ff6b6b; grid-column: 1/-1; text-align: center;">Fout bij laden van gegevens.</p>';
            }
        }

        async function toggleMailStep(bookingId, stepKey, value) {
            try {
                const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');

                // 1. Sync Logic (UI -> DB is already handled by checkbox)
                // 2. Sync Logic (Tester -> DB calls this function, so we need DB -> UI)
                const card = document.getElementById(`mc-card-${bookingId}`);
                if (card) {
                    const checkbox = card.querySelector(`input[data-step="${stepKey}"]`);
                    if (checkbox) checkbox.checked = value;
                }

                // Nested update in Firestore object
                await updateDoc(doc(db, "bookings", bookingId), {
                    [`mailChain.${stepKey}`]: value,
                    updatedAt: new Date().toISOString()
                });

                // LOG ACTIVITY
                const actionName = value ? 'EMAIL_STEP_COMPLETED' : 'EMAIL_STEP_REVERTED';
                logActivity(actionName, `Stap '${stepKey}' gewijzigd naar ${value ? 'voltooid' : 'openstaand'}`, bookingId);

                // 3. Live-update Status Overview (Hub Modal)
                if (currentComposerData && currentComposerData.id === bookingId) {
                    if (!currentComposerData.mailChain) currentComposerData.mailChain = {};
                    currentComposerData.mailChain[stepKey] = value;
                    renderHubSteps(currentComposerData);
                }

            } catch (err) {
                console.error(`Fout bij updaten mail-chain stap ${stepKey}:`, err);
                alert("Kon de status niet opslaan in Database.");
            }
        }

        async function togglePayment(bookingId, field, value, checkboxEl) {
            try {
                const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                await updateDoc(doc(db, "bookings", bookingId), {
                    [field]: value,
                    updatedAt: new Date().toISOString()
                });

                // LOG ACTIVITY
                logActivity('PAYMENT_STATUS_UPDATED', `Betalingsveld '${field}' gewijzigd naar ${value}`, bookingId);

                // Update only the adjacent status label — no page reload needed
                const label = checkboxEl.closest('.payment-toggle-controls').querySelector('.status-label');
                if (label) {
                    if (field === 'depositPaid') {
                        label.textContent = value ? 'Voltooid' : 'Nog niet voltooid';
                    } else {
                        label.textContent = value ? 'Voltooid' : 'Nog niet gedaan';
                    }
                }
            } catch (err) {
                console.error("Fout bij bijwerken betalingsstatus:", err);
                // Revert the checkbox on failure
                checkboxEl.checked = !value;
                alert("Kon de status niet bijwerken in de database.");
            }
        }

        let _declineTimer = null;
        async function declineBooking(bookingId, btnEl) {
            if (!btnEl.classList.contains('confirming')) {
                // --- Step 1: Ask for confirmation ---
                btnEl.classList.add('confirming');
                btnEl.textContent = '⚠ Zeker weten? Klik opnieuw om te weigeren';

                // Auto-reset after 4 seconds if user doesn't confirm
                clearTimeout(_declineTimer);
                _declineTimer = setTimeout(() => {
                    if (btnEl.classList.contains('confirming')) {
                        btnEl.classList.remove('confirming');
                        btnEl.textContent = '✕ Boeking Weigeren';
                    }
                }, 4000);
            } else {
                // --- Step 2: Execute decline ---
                clearTimeout(_declineTimer);
                btnEl.textContent = 'Bezig...';
                btnEl.disabled = true;

                try {
                    const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                    await updateDoc(doc(db, "bookings", bookingId), {
                        status: 'declined',
                        declinedAt: new Date().toISOString()
                    });

                    // LOG ACTIVITY
                    logActivity('BOOKING_DECLINED', 'Boeking gemarkeerd als GEWEIGERD via snelle actie', bookingId);

                    // Fade out the card
                    const card = btnEl.closest('.booking-card');
                    card.style.transition = 'opacity 0.4s, transform 0.4s';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.97)';
                    setTimeout(() => card.remove(), 400);
                } catch (err) {
                    console.error("Fout bij weigeren boeking:", err);
                    btnEl.classList.remove('confirming');
                    btnEl.disabled = false;
                    btnEl.textContent = '✕ Boeking Weigeren';
                    alert("Kon de boeking niet weigeren. Probeer opnieuw.");
                }
            }
        }

        async function undeclineBooking(bookingId, btnEl) {
            btnEl.textContent = 'Bezig met herstellen...';
            btnEl.disabled = true;

            try {
                const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                await updateDoc(doc(db, "bookings", bookingId), {
                    status: 'pending',
                    updatedAt: new Date().toISOString()
                });

                // LOG ACTIVITY
                logActivity('BOOKING_UNDECLINED', 'Weigering van boeking ongedaan gemaakt', bookingId);

                // Fade out the card from the declined view
                const card = btnEl.closest('.booking-card');
                card.style.transition = 'opacity 0.4s, transform 0.4s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.97)';
                setTimeout(() => card.remove(), 400);

            } catch (err) {
                console.error("Fout bij herstellen boeking:", err);
                btnEl.disabled = false;
                btnEl.textContent = '↩ Weigering ongedaan maken';
                alert("Kon de boeking niet herstellen. Probeer opnieuw.");
            }
        }

        function confirmBookingFromList(el) {
            const ds = el.dataset;
            // Fill the form
            document.getElementById('guest-name').value = ds.name;
            document.getElementById('guest-email').value = ds.email;
            document.getElementById('check-in').value = ds.inRaw;
            document.getElementById('check-out').value = ds.outRaw;
            document.getElementById('guest-count').value = ds.guests;

            // Switch view
            switchView('confirm-view', document.querySelector('.nav-item:first-child'));
        }

        async function copyRichTextEmail(btn) {
            const ds = btn.dataset;
            const originalText = btn.innerHTML;

            btn.innerHTML = 'Kopiëren...';
            btn.disabled = true;

            const name = ds.name || 'Gast';
            const dateIn = ds.in || '';
            const dateOut = ds.out || '';
            const guests = ds.guests || '';

            // This is the HTML from owner-notification-template.html with variables injected
            // Dit inlines de CSS volledig voor e-mailclients die <style> tags strippen
            const htmlString = `
            \x3C!DOCTYPE html>
            \x3Chtml lang="nl">
            \x3Chead>
                \x3Cmeta charset="UTF-8">
            \x3C/head>
            \x3Cbody style="margin: 0; padding: 0; background-color: #1a2830; font-family: 'Inter', Arial, sans-serif; color: #20303D; line-height: 1.6;">
                \x3Ctable width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed; background-color: #1a2830; padding: 30px 0 50px; border-collapse: collapse;">
                    \x3Ctr>
                        \x3Ctd>
                            \x3Ctable width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; border-collapse: collapse;">
                                \x3Ctr>
                                    \x3Ctd style="background-color: #20303D; padding: 30px 30px 25px; text-align: center;">
                                        \x3Ch1 style="color: #C5A059; font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; letter-spacing: 0.05em; margin: 0; text-transform: uppercase;">Gipfel Lodge\x3C/h1>
                                        \x3Ch2 style="color: #ffffff; font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; margin: 15px 0 6px;">Uw Verblijf in Oostenrijk\x3C/h2>
                                        \x3Cp style="color: #C5A059; font-size: 13px; margin: 0; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">Bericht over uw boeking\x3C/p>
                                    \x3C/td>
                                \x3C/tr>
                                \x3Ctr>
                                    \x3Ctd style="padding: 35px 30px;">
                                        \x3Cp style="font-size: 16px; margin-bottom: 30px; color: #20303D;">
                                            Hallo \x3Cstrong>${name}\x3C/strong>,\x3Cbr>\x3Cbr>
                                            [ PLAATS HIER JE EIGEN BERICHT - Typ hier de reden van je bericht en wat je wilt vertellen aan de gast. ]
                                        \x3C/p>
                                        
                                        \x3Cp style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #C5A059; margin: 0 0 12px;">Verblijfsperiode\x3C/p>
                                        \x3Cdiv style="background-color: #20303D; border-radius: 6px; padding: 20px 25px; margin-bottom: 25px;">
                                            \x3Ctable width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                \x3Ctr>
                                                    \x3Ctd style="width: 45%; vertical-align: top; padding-bottom: 4px;">
                                                        \x3Cdiv style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #78868A; margin-bottom: 5px;">Check-in\x3C/div>
                                                        \x3Cdiv style="font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #ffffff; font-weight: 600;">${dateIn}\x3C/div>
                                                    \x3C/td>
                                                    \x3Ctd style="width: 10%; text-align: center; vertical-align: middle; color: #C5A059; font-size: 20px; font-weight: 300;">&rarr;\x3C/td>
                                                    \x3Ctd style="width: 45%; vertical-align: top; padding-bottom: 4px;">
                                                        \x3Cdiv style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #78868A; margin-bottom: 5px;">Check-out\x3C/div>
                                                        \x3Cdiv style="font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #ffffff; font-weight: 600;">${dateOut}\x3C/div>
                                                    \x3C/td>
                                                \x3C/tr>
                                            \x3C/table>
                                        \x3C/div>

                                        \x3Cp style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #C5A059; margin: 0 0 12px;">Reisgezelschap\x3C/p>
                                        \x3Ctable width="100%" cellpadding="8" cellspacing="0" style="border-collapse: separate; border-spacing: 6px; margin-bottom: 25px;">
                                            \x3Ctr>
                                                \x3Ctd style="background-color: #fcfbf8; border: 1px solid #e8e2d0; border-radius: 6px; padding: 12px 8px; text-align: center; width: 100%;">
                                                    \x3Cdiv style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #20303D; font-weight: 600; line-height: 1;">${guests}\x3C/div>
                                                    \x3Cdiv style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #78868A; margin-top: 4px;">Personen Totaal\x3C/div>
                                                \x3C/td>
                                            \x3C/tr>
                                        \x3C/table>

                                        \x3Cp style="font-size: 16px; margin-bottom: 30px; color: #20303D;">
                                            Mocht u verdere vragen hebben, aarzel dan niet om contact met ons op te nemen. Wij kijken er ontzettend naar uit om u te mogen verwelkomen in de bergen!
                                        \x3C/p>
                                        
                                        \x3Cdiv style="text-align: center; margin-top: 30px;">
                                            \x3Ca href="https://gipfellodge.at" style="background-color: #C5A059; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block; text-transform: uppercase; letter-spacing: 0.06em; font-size: 13px;">Kijk op de Website\x3C/a>
                                        \x3C/div>
                                    \x3C/td>
                                \x3C/tr>
                                \x3Ctr>
                                    \x3Ctd style="background-color: #20303D; padding: 25px 30px; text-align: center; font-size: 12px; color: #78868A;">
                                        \x3Cp style="margin: 0 0 6px;">
                                            \x3Cstrong style="color: #ffffff;">Gipfel Lodge\x3C/strong> &mdash; Alpiner Luxus & Raum\x3Cbr>
                                            Eben im Pongau, Austria &nbsp;|&nbsp; hello@gipfellodge.at
                                        \x3C/p>
                                    \x3C/td>
                                \x3C/tr>
                            \x3C/table>
                        \x3C/td>
                    \x3C/tr>
                \x3C/table>
            \x3C/body>
            \x3C/html>
            `;

            try {
                if (!navigator.clipboard) {
                    throw new Error("Clipboard API niet ondersteund.");
                }

                await navigator.clipboard.writeText(htmlString);

                btn.innerHTML = '✔ HTML-Code Gekopieerd!';
                btn.style.color = '#2ecc71';
            } catch (err) {
                console.error("Kopiëren mislukt:", err);
                alert("Kopiëren van broncode mislukt in deze browser. Probeer handmatig.");
                btn.innerHTML = 'Kopiëren mislukt';
                btn.style.color = 'red';
            }

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                btn.style.color = '';
            }, 3000);
        }

        async function testFirebaseConnection() {
            const statusTag = document.getElementById('db-status-tag');
            const resultDiv = document.getElementById('db-test-result');
            const dot = statusTag.querySelector('span');

            resultDiv.style.display = 'none';
            dot.style.background = '#f1c40f'; // geel: bezig
            statusTag.innerHTML = '\x3Cspan style="width: 8px; height: 8px; border-radius: 50%; background: #f1c40f;">\x3C/span> Verbinding testen...';

            try {
                const { db, collection, addDoc, serverTimestamp } = await import('../site_js/core/firebase.js');

                // Probeer een tijdelijk test-document te schrijven
                await addDoc(collection(db, "system_checks"), {
                    timestamp: serverTimestamp(),
                    check: "Manual Health Check"
                });

                dot.style.background = '#2ecc71'; // groen: succes
                statusTag.innerHTML = '\x3Cspan style="width: 8px; height: 8px; border-radius: 50%; background: #2ecc71;">\x3C/span> Firebase: Verbonden';
                resultDiv.style.color = '#2ecc71';
                resultDiv.innerText = "Succes! De verbinding met de database werkt.";
                resultDiv.style.display = 'block';

            } catch (err) {
                console.error("Firebase Test Error:", err);
                dot.style.background = '#e74c3c'; // rood: fout
                statusTag.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: #e74c3c;"></span> Firebase: Fout`;

                let msg = "Fout: " + err.message;
                if (err.message.includes("permission-denied")) {
                    msg = "Permissions Error: Controleer je 'Security Rules' in de Firebase Console.";
                } else if (err.message.includes("network")) {
                    msg = "Netwerk Fout: Ben je online? Of blokkeert de browser de import?";
                }

                resultDiv.style.color = '#ff6b6b';
                resultDiv.innerText = msg;
                resultDiv.style.display = 'block';
            }
        }

        /* ============================================================
         * INVOICE GENERATION — opent de branded factuur in nieuw venster
         * ============================================================ */
        async function openInvoice(bookingId, event) {
            if (event) event.stopPropagation(); // Voorkom dat de kaart weer flipt
            
            console.log("Factuur genereren voor:", bookingId);
            const btn = event ? event.currentTarget : null;
            const originalText = btn ? btn.innerHTML : "";
            
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bezig...';
            }

            try {
                const { db, doc, getDoc, updateDoc } = await import('../site_js/core/firebase.js');
                const { InvoiceGenerator } = await import('../utils/invoiceGenerator.js');

                // 1. Data ophalen uit Firestore
                const docSnap = await getDoc(doc(db, "bookings", bookingId));

                if (!docSnap.exists()) {
                    throw new Error("Boeking niet gevonden in de database.");
                }

                let bookingData = { id: docSnap.id, ...docSnap.data() };

                // --- AUTO-HEALING: Ensure secretToken exists for old bookings ---
                if (!bookingData.secretToken) {
                    console.log("Auto-healing: Generating missing secretToken for booking", bookingId);
                    const newToken = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
                    try {
                        await updateDoc(doc(db, "bookings", bookingId), {
                            secretToken: newToken,
                            updatedAt: new Date().toISOString()
                        });
                        bookingData.secretToken = newToken; // Update local data
                    } catch (healErr) {
                        console.error("Failed to heal booking with token:", healErr);
                    }
                }

                // 2. Factuur template ophalen
                const response = await fetch('templates/invoice_template.html');
                const template = await response.text();

                // 3. HTML genereren
                const finalHTML = InvoiceGenerator.generateHTML(bookingData, template);

                // 4. In nieuw venster openen
                const win = window.open('', '_blank');
                win.document.write(finalHTML);
                win.document.close();

            } catch (err) {
                console.error("Factuur genereren mislukt:", err);
                alert("Fout bij het genereren van de factuur: " + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        }

        /* ============================================================
         * BOOKING CARDS CAROUSEL — laadt Firebase data en rendert kaarten
         * ============================================================ */

        async function loadCarouselView() {
            const loader = document.getElementById('carousel-loader');
            const wrap = document.getElementById('adm-carousel-wrap');
            const empty = document.getElementById('adm-carousel-empty');
            const track = document.getElementById('adm-carousel-track');

            if (!track) return;

            // Reset state
            loader.style.display = 'block';
            wrap.style.display = 'none';
            empty.style.display = 'none';
            track.innerHTML = '';

            try {
                const { db, collection, getDocs, query, orderBy } =
                    await import('../site_js/core/firebase.js');

                const q = query(collection(db, 'bookings'), orderBy('checkIn', 'asc'));
                const snap = await getDocs(q);

                const bookings = [];
                snap.forEach(d => bookings.push({ id: d.id, ...d.data() }));

                loader.style.display = 'none';

                if (!bookings.length) {
                    empty.style.display = 'flex';
                    return;
                }

                renderAdminBookingCarousel(bookings);

            } catch (err) {
                console.error('Carousel load error:', err);
                loader.style.display = 'none';
                empty.style.display = 'flex';
                empty.querySelector('p').textContent = 'Fout bij laden: ' + err.message;
            }
        }

        function renderAdminBookingCarousel(bookings) {
            const carousel = document.getElementById('adm-booking-carousel');
            const track = document.getElementById('adm-carousel-track');
            const wrap = document.getElementById('adm-carousel-wrap');
            const knob = document.getElementById('adm-knob');
            const ticksWrap = document.getElementById('adm-ticks');
            const counter = document.getElementById('adm-carousel-counter');

            if (!carousel || !track) return;

            // ── Helpers ──────────────────────────────────────────────
            const parseDate = (v) => {
                if (!v) return null;
                if (v instanceof Date) return v;
                // "YYYY-MM-DD"
                const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                const d = new Date(v);
                return isNaN(d.getTime()) ? null : d;
            };

            const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

            const fmtDate = (d) => d
                ? d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                : '—';

            const fmtRange = (a, b) => {
                const aStr = a.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
                const bStr = b.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                return `${aStr} → ${bStr}`;
            };

            const fmtEUR = (n) => Number(n || 0).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });

            const fmtSettle = (n) => Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // ── Normalize rows ────────────────────────────────────────
            const rows = bookings
                .map(b => ({
                    checkIn: parseDate(b.checkIn),
                    checkOut: parseDate(b.checkOut),
                    nights: Number(b.nights) || 0,
                    guest: b.guestName || 'Onbekende gast',
                    isOwner: (b.type === 'owner'),
                    platform: b.platform || '',
                    bookingId: b.bookingId || b.id || '',
                    adults: Number(b.adults) || 0,
                    children: Number(b.children) || 0,
                    babies: Number(b.babies) || 0,
                    totalGuests: Number(b.totalGuests) || 0,
                    phone: b.guestPhone || '',
                    email: b.guestEmail || '',
                    country: (b.country || '').trim().toUpperCase(),
                    totalAmount: Number(b.totalAmount) || 0,
                    status: b.status || 'pending',
                    // Official amounts from Database
                    rent: Number(b.rent) || 0,
                    cleaning: Number(b.cleaning) || 0,
                    bedLinen: Number(b.bedLinen) || 0,
                    touristTax: Number(b.touristTax) || 0,
                    mobilityFee: Number(b.mobilityFee) || 0
                }))
                .filter(r => r.checkIn && r.checkOut)
                .sort((a, b) => a.checkIn - b.checkIn);

            if (!rows.length) {
                document.getElementById('adm-carousel-empty').style.display = 'flex';
                return;
            }

            // ── Start index (voorkeur: NU → VOLGENDE → 0) ────────────
            const now = startOfDay(new Date());
            const currentIdx = rows.findIndex(r => r.checkIn <= now && now < r.checkOut);
            const nextIdx = rows.findIndex(r => r.checkIn > now);
            const startIndex = currentIdx !== -1 ? currentIdx : (nextIdx !== -1 ? nextIdx : 0);

            // ── Pager helpers ─────────────────────────────────────────
            const updateActiveSlideClasses = (activeIdx) => {
                const slides = track.querySelectorAll('.adm-booking-slide');
                slides.forEach((s, i) => {
                    if (i === activeIdx) s.classList.add('is-active');
                    else s.classList.remove('is-active');
                });
            };

            const updateKnob = (idx) => {
                if (!knob) return;
                updateActiveSlideClasses(idx);
                const rail = knob.closest('.adm-scrollbar__rail');
                if (!rail) return;
                const rect = rail.getBoundingClientRect();
                const padding = 14;
                const usable = Math.max(0, rect.width - padding * 2);
                const t = idx / Math.max(1, rows.length - 1);
                knob.style.left = `${padding + usable * t}px`;
            };

            const getStep = () => track.querySelector('.adm-booking-slide')?.offsetWidth || 350;

            const scrollToIndex = (idx, smooth = true) => {
                const step = getStep();
                carousel.scrollTo({ left: step * idx, behavior: smooth ? 'smooth' : 'instant' });
                updateKnob(idx);
                if (counter) counter.textContent = `${idx + 1} / ${rows.length}`;
            };

            const getClosestIndex = () => {
                if (!carousel || !carousel.children.length) return 0;
                const step = getStep();
                return Math.max(0, Math.min(rows.length - 1, Math.round(carousel.scrollLeft / step)));
            };

            // ── Build ticks ───────────────────────────────────────────
            track.innerHTML = '';
            if (ticksWrap) {
                ticksWrap.innerHTML = '';
                rows.forEach(() => {
                    const t = document.createElement('div');
                    t.className = 'adm-tick';
                    ticksWrap.appendChild(t);
                });
            }

            // ── Render slides ─────────────────────────────────────────
            rows.forEach((b, idx) => {
                const isNow = b.checkIn <= now && now < b.checkOut;
                const isNext = !isNow && b.checkIn > now;

                // Timeline badge
                const timelineClass = isNow ? 'adm-badge--now' : (isNext ? 'adm-badge--next' : 'adm-badge--past');
                const timelineText = isNow ? 'NU' : (isNext ? 'VOLGENDE' : 'VERLEDEN');

                // Status badge
                const statusMap = {
                    confirmed: 'adm-badge--confirmed',
                    pending: 'adm-badge--pending',
                    declined: 'adm-badge--declined',
                    completed: 'adm-badge--completed',
                };
                const statusClass = statusMap[b.status] || 'adm-badge--pending';
                const statusLabel = {
                    confirmed: 'Bevestigd', pending: 'In afwachting',
                    declined: 'Geweigerd', completed: 'Voltooid',
                }[b.status] || b.status;

                // Guest breakdown
                const parts = [];
                if (b.adults > 0) parts.push(`${b.adults} volw.`);
                if (b.children > 0) parts.push(`${b.children} kind.`);
                if (b.babies > 0) parts.push(`${b.babies} baby`);
                const breakdown = parts.length ? `(${parts.join(', ')})` : '';

                const guests = b.totalGuests || (b.adults + b.children + b.babies);
                const cc = b.country;
                const flag = cc ? `<img class="adm-bc__flag" src="https://flagcdn.com/w40/${cc.toLowerCase()}.png" alt="${cc}" />` : '';

                // Settlement calc (estimate based on totalAmount as base rent)
                const rent = b.totalAmount;
                const cleaning = b.isOwner ? 0 : 350.00;
                const bedLinen = b.isOwner ? 0 : (guests * 20.95);
                const touristTax = guests * b.nights * 2.50;
                const mobilityFee = guests * b.nights * 0.50;
                const commission = rent * 0.24;
                const totalSettlement = rent + cleaning + bedLinen + touristTax + mobilityFee - commission;

                // Platform tag
                const platformBadge = b.isOwner
                    ? `<span class="adm-badge adm-badge--owner">Huiseigenaar</span>`
                    : (b.platform ? `<span class="adm-badge adm-badge--platform">${b.platform}</span>` : '');

                const slide = document.createElement('div');
                slide.className = 'adm-booking-slide';
                slide.innerHTML = `
                    <div class="adm-flip-container" onclick="this.classList.toggle('is-flipped')">
                        <div class="adm-flipper">

                            <!-- FRONT -->
                            <div class="adm-card--front adm-booking-card--v2">
                                <div class="adm-bc__header">
                                    <h3 class="adm-bc__title">Boeking</h3>
                                    <div class="adm-bc__badges">
                                        <span class="adm-badge ${timelineClass}">${timelineText}</span>
                                        <span class="adm-badge ${statusClass}">${statusLabel}</span>
                                        ${platformBadge}
                                    </div>
                                </div>

                                <div class="adm-bc__divider"></div>

                                <div class="adm-bc__top">
                                    <div>
                                        <div class="adm-bc__guest">${b.guest}</div>
                                        <div class="adm-bc__row adm-bc__row--strong">
                                            <i class="fa-solid fa-user"></i>
                                            <span><strong>${guests || '—'}</strong> gasten</span>
                                        </div>
                                        ${breakdown ? `<div class="adm-bc__sub">${breakdown}</div>` : ''}
                                    </div>
                                    <div class="adm-bc__country">
                                        ${flag}
                                        <div class="adm-bc__country-code">${cc || '—'}</div>
                                    </div>
                                </div>

                                <div class="adm-bc__rows">
                                    <div class="adm-bc__row">
                                        <i class="fa-regular fa-calendar"></i>
                                        <span>${fmtRange(b.checkIn, b.checkOut)}</span>
                                    </div>
                                    <div class="adm-bc__row">
                                        <i class="fa-regular fa-moon"></i>
                                        <span>${b.nights} nachten</span>
                                    </div>
                                    ${b.bookingId ? `<div class="adm-bc__row">
                                        <i class="fa-solid fa-hashtag"></i>
                                        <span>${b.bookingId}</span>
                                    </div>` : ''}
                                    ${b.phone ? `<div class="adm-bc__row">
                                        <i class="fa-solid fa-phone" onclick="event.stopPropagation()"></i>
                                        <a class="adm-bc__link" href="tel:${b.phone}" onclick="event.stopPropagation()">${b.phone}</a>
                                    </div>` : ''}
                                    ${b.email ? `<div class="adm-bc__row">
                                        <i class="fa-regular fa-envelope" onclick="event.stopPropagation()"></i>
                                        <a class="adm-bc__link" href="mailto:${b.email}" onclick="event.stopPropagation()">${b.email}</a>
                                    </div>` : ''}
                                </div>

                                <div class="adm-bc__divider adm-bc__divider--bottom"></div>
                                <div class="adm-bc__price">${fmtEUR(b.totalAmount)}</div>
                            </div>

                            <!-- BACK (factuurspecificatie) -->
                            <div class="adm-card--back adm-booking-card--v2">
                                <div class="adm-bc__header">
                                    <h3 class="adm-bc__title">Factuur specificatie</h3>
                                </div>
                                <div class="adm-bc__divider"></div>
                                <div class="adm-bc__sub" style="margin-bottom:8px;">${b.guest} · ${b.nights} nachten · ${guests} gasten</div>

                                <div class="adm-settlement-table">
                                    <div class="adm-settle-row">
                                        <span class="adm-settle-label">Huur</span>
                                        <span class="adm-settle-val">€ ${fmtSettle(b.rent || b.totalAmount - (b.cleaning + b.bedLinen + b.touristTax + b.mobilityFee))}</span>
                                    </div>
                                    <div class="adm-settle-row">
                                        <span class="adm-settle-label">Schoonmaak</span>
                                        <span class="adm-settle-val">€ ${fmtSettle(b.cleaning)}</span>
                                    </div>
                                    <div class="adm-settle-row">
                                        <span class="adm-settle-label">Bedlinnen</span>
                                        <span class="adm-settle-val">€ ${fmtSettle(b.bedLinen)}</span>
                                    </div>
                                    <div class="adm-settle-row">
                                        <span class="adm-settle-label">Toeristenbelasting</span>
                                        <span class="adm-settle-val">€ ${fmtSettle(b.touristTax)}</span>
                                    </div>
                                    <div class="adm-settle-row">
                                        <span class="adm-settle-label">Mobiliteitsheffing</span>
                                        <span class="adm-settle-val">€ ${fmtSettle(b.mobilityFee)}</span>
                                    </div>
                                    <div class="adm-bc__divider" style="margin: 10px 0;"></div>
                                    <div class="adm-settle-row adm-settle-row--total">
                                        <span class="adm-settle-label">Totaal (incl. BTW)</span>
                                        <span class="adm-settle-val">€ ${fmtSettle(b.totalAmount)}</span>
                                    </div>
                                </div>

                                <div class="adm-bc__footer" style="margin-top: auto; padding-top: 20px;">
                                    <button class="action-btn" onclick="openInvoice('${b.bookingId}', event)" style="background: var(--color-gold); color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <i class="fa-solid fa-file-invoice"></i> 🗒 OPEN FACTUUR
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                `;
                track.appendChild(slide);
            });

            // ── Show + scroll to start ────────────────────────────────
            wrap.style.display = 'block';
            if (counter) counter.textContent = `${startIndex + 1} / ${rows.length}`;

            requestAnimationFrame(() => {
                scrollToIndex(startIndex, false);
            });

            // ── Scroll → update pager ─────────────────────────────────
            let raf = null;
            carousel.addEventListener('scroll', () => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => {
                    const idx = getClosestIndex();
                    updateKnob(idx);
                    if (counter) counter.textContent = `${idx + 1} / ${rows.length}`;
                });
            }, { passive: true });

            // ── Draggable knob ────────────────────────────────────────
            const rail = knob ? knob.closest('.adm-scrollbar__rail') : null;
            const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

            const idxFromX = (clientX) => {
                if (!rail) return 0;
                const rect = rail.getBoundingClientRect();
                const padding = 14;
                const usable = Math.max(1, rect.width - padding * 2);
                const x = clamp(clientX - rect.left - padding, 0, usable);
                return Math.round((x / usable) * Math.max(1, rows.length - 1));
            };

            if (knob && rail) {
                let dragging = false;

                knob.addEventListener('pointerdown', (e) => {
                    dragging = true;
                    knob.setPointerCapture(e.pointerId);
                    e.preventDefault();
                }, { passive: false });

                knob.addEventListener('pointermove', (e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    const idx = idxFromX(e.clientX);
                    updateKnob(idx);
                    const step = getStep();
                    carousel.scrollTo({ left: step * idx, behavior: 'instant' });
                    if (counter) counter.textContent = `${idx + 1} / ${rows.length}`;
                }, { passive: false });

                const stopDrag = (e) => {
                    if (!dragging) return;
                    dragging = false;
                    try { knob.releasePointerCapture(e.pointerId); } catch (_) { }
                    scrollToIndex(idxFromX(e.clientX), true);
                };

                knob.addEventListener('pointerup', stopDrag, { passive: false });
                knob.addEventListener('pointercancel', stopDrag, { passive: false });

                rail.addEventListener('pointerdown', (e) => {
                    if (e.target === knob || knob.contains(e.target)) return;
                    scrollToIndex(idxFromX(e.clientX), true);
                }, { passive: true });
            }
        }
        let currentComposerData = {};
        let currentLang = 'nl'; // Detected language: nl, de, en

        // Detect language from phone country code
        function detectLanguage(phone) {
            if (!phone) return 'nl'; // default
            const cleaned = phone.replace(/[\s\-\(\)]/g, '');
            if (cleaned.startsWith('+31') || cleaned.startsWith('0031')) return 'nl';
            if (cleaned.startsWith('+49') || cleaned.startsWith('0049')) return 'de';
            if (cleaned.startsWith('+43') || cleaned.startsWith('0043')) return 'de'; // Oostenrijk = Duits
            return 'en'; // Alle andere landen = Engels
        }

        // Multi-language labels used in details & extra content
        const composerLabels = {
            nl: {
                greeting: 'Beste', arrivalDeparture: 'Aankomst & Vertrek', travelGroup: 'Reisgezelschap',
                totalPrice: 'Totaalprijs', deposit30: 'Aanbetaling (30%)', checkIn: 'Inchecken',
                checkOut: 'Uitchecken', from15: 'Vanaf 15:00 uur', until10: 'Uiterlijk 10:00 uur',
                importantInfo: 'Belangrijke informatie voor uw verblijf:',
                payment: '1. Betaling', paymentDesc: 'Om uw reservering definitief te maken, vragen wij een aanbetaling van 30%. Het restbedrag dient uiterlijk 6 weken voor aankomst te worden voldaan.',
                depositLabel: 'Aanbetaling:', ibanLabel: 'IBAN:', bicLabel: 'BIC/SWIFT:', refLabel: 'Omschrijving:',
                arrivalDepartureTitle: '2. Aankomst & Vertrek',
                arrivalDepartureDesc: 'Inchecken is mogelijk vanaf <strong>15:00 uur</strong> op de dag van aankomst. Op de dag van vertrek vragen we u de lodge uiterlijk om <strong>10:00 uur</strong> vrij te maken.',
                houseRulesTitle: '3. Huisregels',
                houseRulesDesc: 'Gipfel Lodge is een rookvrij verblijf en huisdieren zijn in overleg toegestaan. Voor aankomst ontvangt u van ons de toegangscode en uitgebreide huisinformatie.',
                invoiceTitle: '4. Factuur & Betaling',
                invoiceDesc: 'U kunt uw officiële factuur online inzien en downloaden via onderstaande link:',
                invoiceLink: 'Bekijk uw Factuur Online',
                rulesHeading: 'Onze Huisregels',
                ruleShoes: '<strong>Schoeisel:</strong> In de lodge dragen we graag pantoffels. Skischoenen graag in de skiruimte.',
                ruleSmoke: '<strong>Rookvrij:</strong> De lodge is strikt rookvrij. Roken kan buiten op het terras.',
                adults: 'Volw.', children: 'Kind', baby: 'Baby'
            },
            de: {
                greeting: 'Liebe/r', arrivalDeparture: 'Anreise & Abreise', travelGroup: 'Reisegruppe',
                totalPrice: 'Gesamtpreis', deposit30: 'Anzahlung (30%)', checkIn: 'Check-in',
                checkOut: 'Check-out', from15: 'Ab 15:00 Uhr', until10: 'Spätestens 10:00 Uhr',
                importantInfo: 'Wichtige Informationen für Ihren Aufenthalt:',
                payment: '1. Zahlung', paymentDesc: 'Um Ihre Reservierung zu bestätigen, bitten wir um eine Anzahlung von 30%. Der Restbetrag ist spätestens 6 Wochen vor Anreise fällig.',
                depositLabel: 'Anzahlung:', ibanLabel: 'IBAN:', bicLabel: 'BIC/SWIFT:', refLabel: 'Verwendungszweck:',
                arrivalDepartureTitle: '2. Anreise & Abreise',
                arrivalDepartureDesc: 'Check-in ist möglich ab <strong>15:00 Uhr</strong> am Anreisetag. Am Abreisetag bitten wir Sie, die Lodge bis spätestens <strong>10:00 Uhr</strong> freizumachen.',
                houseRulesTitle: '3. Hausregeln',
                houseRulesDesc: 'Die Gipfel Lodge ist rauchfrei und Haustiere sind nach Absprache willkommen. Vor Ihrer Anreise erhalten Sie den Zugangscode und weitere Informationen.',
                invoiceTitle: '4. Rechnung & Zahlung',
                invoiceDesc: 'Sie können Ihre offizielle Rechnung online über de folgenden Link einsehen und herunterladen:',
                invoiceLink: 'Rechnung Online ansehen',
                rulesHeading: 'Unsere Hausregeln',
                ruleShoes: '<strong>Schuhwerk:</strong> In der Lodge tragen wir gerne Hausschuhe. Skischuhe bitte im Skiraum abstellen.',
                ruleSmoke: '<strong>Rauchfrei:</strong> Die Lodge ist strikt rauchfrei. Rauchen ist nur auf der Terrasse gestattet.',
                adults: 'Erw.', children: 'Kind', baby: 'Baby'
            },
            en: {
                greeting: 'Dear', arrivalDeparture: 'Arrival & Departure', travelGroup: 'Travel Party',
                totalPrice: 'Total Price', deposit30: 'Deposit (30%)', checkIn: 'Check-in',
                checkOut: 'Check-out', from15: 'From 3:00 PM', until10: 'By 10:00 AM',
                importantInfo: 'Important information for your stay:',
                payment: '1. Payment', paymentDesc: 'To confirm your reservation, we kindly ask for a 30% deposit. The remaining balance is due at least 6 weeks before arrival.',
                depositLabel: 'Deposit:', ibanLabel: 'IBAN:', bicLabel: 'BIC/SWIFT:', refLabel: 'Reference:',
                arrivalDepartureTitle: '2. Arrival & Departure',
                arrivalDepartureDesc: 'Check-in is possible from <strong>3:00 PM</strong> on the day of arrival. On departure day, we kindly ask you to vacate the lodge by <strong>10:00 AM</strong>.',
                houseRulesTitle: '3. House Rules',
                houseRulesDesc: 'Gipfel Lodge is a non-smoking property and pets are welcome by arrangement. Before arrival, you will receive the access code and detailed house information.',
                invoiceTitle: '4. Invoice & Payment',
                invoiceDesc: 'You can view and download your official invoice online via the following link:',
                invoiceLink: 'View your Invoice Online',
                rulesHeading: 'Our House Rules',
                ruleShoes: '<strong>Footwear:</strong> Inside the lodge, we kindly ask you to wear slippers. Ski boots should be left in the ski room.',
                ruleSmoke: '<strong>Non-smoking:</strong> The lodge is strictly non-smoking. Smoking is only allowed on the terrace.',
                adults: 'Adults', children: 'Children', baby: 'Baby'
            }
        };

        const composerTemplates = {
            nl: {
                general: {
                    tagline: 'Bericht van Gipfel Lodge', heading: 'Update rondom je verblijf',
                    intro: 'Bedankt voor je bericht. We voorzien je graag van de gevraagde informatie.',
                    closing: 'We hopen je hiermee voldoende te hebben geïnformeerd. Heb je nog andere vragen? Aarzel dan niet om contact op te nemen.\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#20303D', buttonText: 'Naar de website', format: 'standard'
                },
                acceptance: {
                    tagline: 'Alpiner Luxus & Raum', heading: 'Uw verblijf is gereserveerd',
                    intro: 'Goed nieuws! Uw boeking bij Gipfel Lodge Eben is geaccepteerd en staat voor u gereserveerd! We kijken ernaar uit om u te mogen verwelkomen in ons alpenverblijf.',
                    closing: 'Heeft u in de tussentijd nog vragen of speciale wensen? Reageer dan gerust op deze e-mail.\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Bereid uw reis voor', format: 'acceptance'
                },
                rejection: {
                    tagline: 'Update Boekingsaanvraag', heading: 'Helaas, geen beschikbaarheid',
                    intro: 'Bedankt voor je interesse in Gipfel Lodge. Helaas moeten we je mededelen dat we op de door jou geselecteerde data geen verblijf meer vrij hebben dat past bij jullie reisgezelschap.',
                    closing: 'Bekijk onze kalender op de website voor andere beschikbare periodes. We hopen je in de toekomst alsnog te mogen ontvangen.\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#E53935', buttonText: 'Zoek andere data', format: 'standard'
                },
                deposit_request: {
                    tagline: 'Actie Vereist', heading: 'Aanbetaling & Bevestiging',
                    intro: 'Bedankt voor uw boeking bij Gipfel Lodge. We hebben de details van jullie naderende reis in goede orde ontvangen voor de volgende verblijfsperiode:',
                    closing: 'Het restbedrag dient uiterlijk 6 weken voor aankomst te worden voldaan. Zodra de betaling goed en wel bij ons binnen is gekomen op de rekening sturen wij u een definitieve bevestiging met alle overige details.\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#F59E0B', buttonText: 'Naar Website', format: 'deposit_request'
                },
                deposit_received: {
                    tagline: 'Boeking Definitief Bevestigd', heading: 'Aanbetaling succesvol verwerkt',
                    intro: 'We hebben je aanbetaling in goede orde ontvangen! Hiermee is je boeking bij Gipfel Lodge officieel en definitief bevestigd voor onderstaande reisgegevens:',
                    closing: 'Mochten er tussentijds vragen zijn over je verblijf of de omgeving, laat het ons dan gerust weten door deze e-mail te beantwoorden. We helpen je graag!\n\nWe kijken ernaar uit je te mogen verwelkomen!\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Bekijk Gipfel Lodge', format: 'deposit_received'
                },
                balance_reminder: {
                    tagline: 'Restbetaling Verblijf', heading: 'Betalingsherinnering',
                    intro: 'We kijken ernaar uit je binnenkort te mogen verwelkomen in de Gipfel Lodge! Graag herinneren we je eraan dat er nog een openstaand saldo is voor je naderende reservering.',
                    closing: 'Heb je de betaling toevallig in de afgelopen dagen al voldaan? Dan heeft deze e-mail je betaling gekruist en mag je dit bericht als niet verzonden beschouwen. Bedankt!\n\nWe sturen de reisinformatie toe zodra de reis dichterbij komt.\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#F59E0B', buttonText: 'Naar Website', format: 'balance_reminder'
                },
                balance_received: {
                    tagline: 'Betaling Volledig Voldaan', heading: 'Uw restbetaling is binnen',
                    intro: 'Goed nieuws! We hebben de restbetaling zojuist in goede orde ontvangen. Hiermee is de volledige reissom voldaan en is financieel gezien alles definitief in orde voor je verblijf bij Gipfel Lodge.',
                    closing: 'Namens de hele familie en staf willen we je bedanken voor het vertrouwen en de vlotte afhandeling van de betaling.\n\nDe bergen roepen!\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Naar Website', format: 'balance_received'
                },
                rules_info: {
                    tagline: 'Voorbereiding op uw verblijf', heading: 'Tijd om in te pakken!',
                    intro: 'De aankomst in de Gipfel Lodge komt nu écht dichterbij! Om ervoor te zorgen dat je verblijf vanaf het eerste moment soepel en zorgeloos verloopt, delen we alvast de belangrijkste praktische informatie en huisregels met jullie.',
                    closing: 'Let op: op de dag (of vlak voor de dag) van aankomst ontvangt u van ons een kort bericht met de unieke pincode voor de sleutelkluis van uw appartement.\n\nWe wensen je alvast een veilige reis!\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Naar Website', format: 'rules_info'
                },
                post_stay: {
                    tagline: 'Alpine Memories', heading: 'Bedankt voor je verblijf',
                    intro: 'We hopen dat jullie een fantastisch verblijf hebben gehad in Gipfel Lodge en veilig zijn thuisgekomen! Het was een waar genoegen om jullie als gasten te mogen ontvangen.',
                    closing: 'Zou je zo vriendelijk willen zijn om een korte review achter te laten over je verblijf? Dit is erg waardevol voor ons. We hopen jullie in de toekomst nog eens te mogen verwelkomen!\n\nMet hartelijke groet,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Laat een review achter', format: 'standard'
                }
            },
            de: {
                general: {
                    tagline: 'Nachricht von Gipfel Lodge', heading: 'Update zu Ihrem Aufenthalt',
                    intro: 'Vielen Dank für Ihre Nachricht. Gerne informieren wir Sie über die gewünschten Details.',
                    closing: 'Wir hoffen, Ihnen damit weitergeholfen zu haben. Bei weiteren Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#20303D', buttonText: 'Zur Website', format: 'standard'
                },
                acceptance: {
                    tagline: 'Alpiner Luxus & Raum', heading: 'Ihr Aufenthalt ist reserviert',
                    intro: 'Gute Neuigkeiten! Ihre Buchung in der Gipfel Lodge Eben wurde angenommen und ist für Sie reserviert! Wir freuen uns darauf, Sie in unserem alpinen Refugium willkommen zu heißen.',
                    closing: 'Haben Sie in der Zwischenzeit Fragen oder besondere Wünsche? Antworten Sie gerne auf diese E-Mail.\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Bereiten Sie Ihre Reise vor', format: 'acceptance'
                },
                rejection: {
                    tagline: 'Update Buchungsanfrage', heading: 'Leider keine Verfügbarkeit',
                    intro: 'Vielen Dank für Ihr Interesse an der Gipfel Lodge. Leider müssen wir Ihnen mitteilen, dass für den gewählten Zeitraum keine passende Unterkunft mehr verfügbar ist.',
                    closing: 'Schauen Sie gerne in unseren Kalender auf der Website für alternative Zeiträume. Wir hoffen, Sie in Zukunft dennoch willkommen heißen zu dürfen.\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#E53935', buttonText: 'Andere Termine suchen', format: 'standard'
                },
                deposit_request: {
                    tagline: 'Aktion Erforderlich', heading: 'Anzahlung & Bestätigung',
                    intro: 'Vielen Dank für Ihre Buchung in der Gipfel Lodge. Wir haben die Details Ihrer bevorstehenden Reise erhalten für den folgenden Aufenthaltszeitraum:',
                    closing: 'Der Restbetrag ist spätestens 6 Wochen vor Anreise fällig. Sobald die Zahlung bei uns eingegangen ist, senden wir Ihnen eine endgültige Bestätigung mit allen weiteren Details.\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#F59E0B', buttonText: 'Zur Website', format: 'deposit_request'
                },
                deposit_received: {
                    tagline: 'Buchung Endgültig Bestätigt', heading: 'Anzahlung erfolgreich verarbeitet',
                    intro: 'Wir haben Ihre Anzahlung erhalten! Damit ist Ihre Buchung in der Gipfel Lodge offiziell und endgültig für den folgenden Zeitraum bestätigt:',
                    closing: 'Sollten Sie in der Zwischenzeit Fragen zu Ihrem Aufenthalt oder der Umgebung haben, antworten Sie gerne auf diese E-Mail. Wir helfen Ihnen gerne!\n\nWir freuen uns, Sie bald willkommen zu heißen!\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Gipfel Lodge entdecken', format: 'deposit_received'
                },
                balance_reminder: {
                    tagline: 'Restzahlung Aufenthalt', heading: 'Zahlungserinnerung',
                    intro: 'Wir freuen uns, Sie bald in der Gipfel Lodge willkommen zu heißen! Gerne erinnern wir Sie daran, dass noch ein offener Betrag für Ihre bevorstehende Reservierung besteht.',
                    closing: 'Haben Sie die Zahlung in den letzten Tagen bereits getätigt? Dann hat sich diese E-Mail mit Ihrer Zahlung gekreuzt und Sie können diese Nachricht ignorieren. Vielen Dank!\n\nDie Reiseinformationen senden wir Ihnen, sobald Ihre Reise näher rückt.\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#F59E0B', buttonText: 'Zur Website', format: 'balance_reminder'
                },
                balance_received: {
                    tagline: 'Zahlung Vollständig Beglichen', heading: 'Ihre Restzahlung ist eingegangen',
                    intro: 'Gute Neuigkeiten! Wir haben die Restzahlung erhalten. Damit ist der gesamte Reisepreis beglichen und alles ist bereit für Ihren Aufenthalt in der Gipfel Lodge.',
                    closing: 'Im Namen der gesamten Familie und unseres Teams möchten wir uns für Ihr Vertrauen und die reibungslose Abwicklung bedanken.\n\nDie Berge rufen!\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Zur Website', format: 'balance_received'
                },
                rules_info: {
                    tagline: 'Vorbereitung auf Ihren Aufenthalt', heading: 'Zeit zum Kofferpacken!',
                    intro: 'Die Anreise zur Gipfel Lodge rückt näher! Damit Ihr Aufenthalt von Anfang an reibungslos und sorgenfrei verläuft, teilen wir vorab die wichtigsten praktischen Informationen und Hausregeln mit Ihnen.',
                    closing: 'Bitte beachten Sie: Am Anreisetag (oder kurz davor) erhalten Sie von uns eine Nachricht mit dem einmaligen PIN-Code für den Schlüsseltresor Ihrer Wohnung.\n\nWir wünschen Ihnen eine sichere Anreise!\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Zur Website', format: 'rules_info'
                },
                post_stay: {
                    tagline: 'Alpine Erinnerungen', heading: 'Vielen Dank für Ihren Aufenthalt',
                    intro: 'Wir hoffen, dass Sie einen fantastischen Aufenthalt in der Gipfel Lodge hatten und sicher nach Hause gekommen sind! Es war uns eine große Freude, Sie als Gäste empfangen zu dürfen.',
                    closing: 'Würden Sie uns eine kurze Bewertung zu Ihrem Aufenthalt hinterlassen? Das wäre sehr wertvoll für uns. Wir hoffen, Sie in Zukunft wieder willkommen heißen zu dürfen!\n\nMit herzlichen Grüßen,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Bewertung hinterlassen', format: 'standard'
                }
            },
            en: {
                general: {
                    tagline: 'Message from Gipfel Lodge', heading: 'Update regarding your stay',
                    intro: 'Thank you for your message. We are happy to provide you with the requested information.',
                    closing: 'We hope this answers your questions. If you have any further enquiries, please don\'t hesitate to get in touch.\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#20303D', buttonText: 'Visit our website', format: 'standard'
                },
                acceptance: {
                    tagline: 'Alpine Luxury & Space', heading: 'Your stay is confirmed',
                    intro: 'Great news! Your booking at Gipfel Lodge Eben has been accepted and is reserved for you! We look forward to welcoming you to our alpine retreat.',
                    closing: 'If you have any questions or special requests in the meantime, feel free to reply to this email.\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Prepare your trip', format: 'acceptance'
                },
                rejection: {
                    tagline: 'Booking Request Update', heading: 'Unfortunately, no availability',
                    intro: 'Thank you for your interest in Gipfel Lodge. Unfortunately, we must inform you that the selected dates are no longer available for your travel party.',
                    closing: 'Please check our calendar on the website for alternative dates. We hope to welcome you in the future.\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#E53935', buttonText: 'Find other dates', format: 'standard'
                },
                deposit_request: {
                    tagline: 'Action Required', heading: 'Deposit & Confirmation',
                    intro: 'Thank you for your booking at Gipfel Lodge. We have received the details of your upcoming trip for the following stay period:',
                    closing: 'The remaining balance is due at least 6 weeks before arrival. Once the payment has been received, we will send you a final confirmation with all further details.\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#F59E0B', buttonText: 'Visit Website', format: 'deposit_request'
                },
                deposit_received: {
                    tagline: 'Booking Confirmed', heading: 'Deposit successfully processed',
                    intro: 'We have received your deposit! Your booking at Gipfel Lodge is now officially confirmed for the following period:',
                    closing: 'If you have any questions about your stay or the area, feel free to reply to this email. We\'re happy to help!\n\nWe look forward to welcoming you!\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Discover Gipfel Lodge', format: 'deposit_received'
                },
                balance_reminder: {
                    tagline: 'Remaining Balance', heading: 'Payment Reminder',
                    intro: 'We look forward to welcoming you to Gipfel Lodge soon! We would like to remind you that there is an outstanding balance for your upcoming reservation.',
                    closing: 'Have you already made the payment in the past few days? If so, this email has crossed with your payment and you can disregard this message. Thank you!\n\nWe will send you the travel information as your trip approaches.\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#F59E0B', buttonText: 'Visit Website', format: 'balance_reminder'
                },
                balance_received: {
                    tagline: 'Payment Fully Settled', heading: 'Your remaining balance has been received',
                    intro: 'Good news! We have received the remaining payment. The full amount has been settled and everything is in order for your stay at Gipfel Lodge.',
                    closing: 'On behalf of the entire family and team, we would like to thank you for your trust and the smooth transaction.\n\nThe mountains are calling!\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Visit Website', format: 'balance_received'
                },
                rules_info: {
                    tagline: 'Preparing for your stay', heading: 'Time to pack!',
                    intro: 'Your arrival at Gipfel Lodge is getting closer! To ensure your stay runs smoothly from the very first moment, we would like to share the most important practical information and house rules with you.',
                    closing: 'Please note: on the day of arrival (or shortly before), you will receive a message from us with the unique PIN code for the key safe of your apartment.\n\nWe wish you a safe journey!\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Visit Website', format: 'rules_info'
                },
                post_stay: {
                    tagline: 'Alpine Memories', heading: 'Thank you for your stay',
                    intro: 'We hope you had a wonderful stay at Gipfel Lodge and arrived home safely! It was a true pleasure to have you as our guests.',
                    closing: 'Would you be so kind as to leave a short review about your stay? This means a lot to us. We hope to welcome you again in the future!\n\nKind regards,\nTeam Gipfel Lodge',
                    themeColor: '#C5A059', buttonText: 'Leave a review', format: 'standard'
                }
            }
        };

        async function openEmailComposer(btn) {
            const ds = btn.dataset;
            const bookingId = ds.id;

            const originalText = btn.innerHTML;
            btn.innerHTML = 'Laden...';
            btn.disabled = true;

            await openCommunicationHub(bookingId);

            // After loading, switch to the requested template and tab
            const type = ds.type || 'general';
            document.getElementById('composer-template-select').value = type;
            loadSelectedTemplateIntoComposer();
            switchCommHubTab('editor');

            btn.innerHTML = originalText;
            btn.disabled = false;
        }

        function loadSelectedTemplateIntoComposer() {
            const type = document.getElementById('composer-template-select').value;
            const langTemplates = composerTemplates[currentLang] || composerTemplates.nl;
            const template = langTemplates[type] || langTemplates.general;
            const labels = composerLabels[currentLang];
            const previewArea = document.getElementById('composer-preview-area');

            // Re-map common fields
            const introHtml = (template.intro || '').replace(/\n/g, '<br>');
            const closingHtml = (template.closing || '').replace(/\n/g, '<br>');

            let detailsHtml = `
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #f0ecdf;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.arrivalDeparture}</div>
                            <div style="font-size: 15px; color: #20303D; font-weight: 500;">${currentComposerData.in} &mdash; ${currentComposerData.out}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #f0ecdf;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.travelGroup}</div>
                            <div style="font-size: 15px; color: #20303D; font-weight: 500;">${currentComposerData.guests}</div>
                        </td>
                    </tr>
                </table>
            `;

            if (template.format === 'deposit_request') {
                detailsHtml = `
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #f0ecdf;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.arrivalDeparture}</div>
                            <div style="font-size: 15px; color: #20303D; font-weight: 500;">${currentComposerData.in} &mdash; ${currentComposerData.out}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #f0ecdf;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.totalPrice}</div>
                            <div style="font-size: 15px; color: #20303D; font-weight: 500;">${currentComposerData.tot}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: none;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.deposit30}</div>
                            <div style="font-size: 15px; color: #c47e09; font-weight: 700;">${currentComposerData.dep}</div>
                        </td>
                    </tr>
                </table>`;
            } else if (template.format === 'rules_info') {
                detailsHtml = `
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #f0ecdf;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.checkIn}</div>
                            <div style="font-size: 15px; color: #20303D; font-weight: 500;">${labels.from15}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #f0ecdf;">
                            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #78868A;">${labels.checkOut}</div>
                            <div style="font-size: 15px; color: #20303D; font-weight: 500;">${labels.until10}</div>
                        </td>
                    </tr>
                </table>`;
            }

            let extraHtml = '';
            if (template.format === 'acceptance') {
                extraHtml = `
                    <p style="font-size: 15px; font-weight: 600; margin-bottom: 20px; color: #20303D;">${labels.importantInfo}</p>
                    <div style="border-left: 3px solid #C5A059; padding: 15px 20px; margin-bottom: 20px; background: #f9f9f9;">
                        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #20303D; margin-bottom: 5px;">${labels.payment}</div>
                        <p style="font-size: 14px; color: #56686d; margin: 0 0 12px 0;">${labels.paymentDesc}</p>
                        <div style="background: #ffffff; border: 1px solid #e0e4e8; padding: 15px; border-radius: 4px; font-size: 13px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="color: #20303D;">
                                <tr><td style="padding-bottom: 8px; font-weight: 600;">${labels.depositLabel}</td><td style="text-align: right; padding-bottom: 8px; font-weight: 700; color: #c47e09;">${currentComposerData.dep}</td></tr>
                                <tr><td style="padding-bottom: 5px; color: #78868A; font-size: 11px;">${labels.ibanLabel}</td><td style="text-align: right; padding-bottom: 5px; font-weight: 500;">[ NL00 BANK 0000 0000 00 ]</td></tr>
                                <tr><td style="padding-bottom: 5px; color: #78868A; font-size: 11px;">${labels.bicLabel}</td><td style="text-align: right; padding-bottom: 5px; font-weight: 500;">[ BIC CODE ]</td></tr>
                                <tr><td style="color: #78868A; font-size: 11px;">${labels.refLabel}</td><td style="text-align: right; font-weight: 500;">Boeking ${currentComposerData.id} - ${currentComposerData.name}</td></tr>
                            </table>
                        </div>
                    </div>
                    <div style="border-left: 3px solid #C5A059; padding: 15px 20px; margin-bottom: 20px; background: #f9f9f9;">
                        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #20303D; margin-bottom: 5px;">${labels.arrivalDepartureTitle}</div>
                        <p style="font-size: 14px; color: #56686d; margin: 0;">${labels.arrivalDepartureDesc}</p>
                    </div>
                    <div style="border-left: 3px solid #C5A059; padding: 15px 20px; margin-bottom: 20px; background: #f9f9f9;">
                        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #20303D; margin-bottom: 5px;">${labels.houseRulesTitle}</div>
                        <p style="font-size: 14px; color: #56686d; margin: 0;">${labels.houseRulesDesc}</p>
                    </div>
                    <div style="border-left: 3px solid #C5A059; padding: 15px 20px; margin-bottom: 20px; background: #fcfbf8;">
                        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #20303D; margin-bottom: 5px;">${labels.invoiceTitle}</div>
                        <p style="font-size: 14px; color: #56686d; margin: 0 0 10px 0;">${labels.invoiceDesc}</p>
                        <a href="https://wanderwerkhoven-afk.github.io/Gipfel-Lodge/invoice.html?id=${currentComposerData.id}&token=${currentComposerData.token}" 
                           style="color: #C5A059; font-weight: 700; text-decoration: underline; font-size: 14px;">${labels.invoiceLink}</a>
                    </div>
                `;
            } else if (template.format === 'rules_info') {
                extraHtml = `
                    <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 20px; color: #20303D; margin: 25px 0 15px;">${labels.rulesHeading}</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; font-size: 13px; line-height: 1.5; color: #20303D;">
                        <tr><td style="width: 25px; color: #C5A059; font-weight: bold; vertical-align: top;">&bull;</td><td style="padding-bottom: 10px;">${labels.ruleShoes}</td></tr>
                        <tr><td style="width: 25px; color: #C5A059; font-weight: bold; vertical-align: top;">&bull;</td><td style="padding-bottom: 10px;">${labels.ruleSmoke}</td></tr>
                    </table>
                `;
            }

            const alertHtml = type !== 'general' ? `
                <tr>
                    <td style="background-color: #f7f9fa; padding: 12px 30px; text-align: center; border-bottom: 1px solid #e0e4e8;">
                        <p style="margin: 0; color: #78868A; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${template.tagline}</p>
                    </td>
                </tr>
            ` : '';

            const fullHtml = `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6; margin: 0; padding: 20px 0 40px; font-family: 'Inter', Arial, sans-serif;">
                <tr>
                    <td align="center">
                        <table class="composer-main-table" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e0e4e8;">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #20303D; padding: 30px 20px; text-align: center;">
                                    <table align="center" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="vertical-align: middle; color: #C5A059; font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">GIPFEL</td>
                                            <td style="vertical-align: middle; padding: 0 10px;"><img src="https://wanderwerkhoven-afk.github.io/Gipfel-Lodge/assets/images/logo-Topbar.png" alt="Logo" style="height: 30px; display: block; border: 0;"></td>
                                            <td style="vertical-align: middle; color: #C5A059; font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">LODGE</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            ${alertHtml}
                            <!-- Body -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <p style="color: ${template.themeColor}; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.1em; margin-bottom: 10px;">${template.tagline}</p>
                                    <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #20303D; margin-bottom: 20px; font-weight: 600; line-height: 1.2;">${template.heading}</h2>
                                    
                                    <div id="editable-composer-content">
                                        <p style="font-size: 15px; margin-bottom: 25px; color: #20303D;">
                                            ${labels.greeting} <strong>${currentComposerData.name}</strong>,<br><br>
                                            ${introHtml}
                                        </p>
                                        
                                        <table width="100%" cellpadding="20" cellspacing="0" style="background-color: #fcfbf8; border: 1px solid #f0ecdf; border-radius: 8px; margin-bottom: 25px;">
                                            <tr>
                                                <td>
                                                    ${detailsHtml}
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        ${extraHtml}
                                        
                                        <p style="font-size: 15px; margin-top: 25px; margin-bottom: 30px; color: #20303D;">
                                            ${closingHtml}
                                        </p>
                                    </div>

                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center">
                                                <a href="https://gipfellodge.at" style="background-color: ${template.themeColor}; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; font-size: 13px;">${template.buttonText}</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f4f4f4; padding: 25px; text-align: center; font-size: 11px; color: #78868A;">
                                    <p style="margin: 0;">&copy; 2026 Gipfel Lodge &mdash; Alpiner Luxus & Raum<br>Eben im Pongau, Austria | hello@gipfellodge.at</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            `;

            previewArea.innerHTML = fullHtml;

            // Re-apply contenteditable only to the inner content area
            const editableArea = document.getElementById('editable-composer-content');
            if (editableArea) {
                editableArea.setAttribute('contenteditable', 'true');
                editableArea.style.outline = 'none';
            }
        }

        async function autoCheckMailStep(uiTemplateId) {
            if (!currentComposerData) return;
            const bookingId = currentComposerData.id;

            if (uiTemplateId === 'acceptance') {
                const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                await updateDoc(doc(db, "bookings", bookingId), {
                    status: 'confirmed',
                    updatedAt: new Date().toISOString()
                });

                logActivity('BOOKING_CONFIRMED', 'Boeking automatisch bevestigd via Hub', bookingId);

                currentComposerData.status = 'confirmed';
                renderHubSteps(currentComposerData);

                const sb = document.getElementById('hub-guest-status');
                if (sb) {
                    sb.innerText = 'BEVESTIGD';
                    sb.style.color = '#1e8e3e';
                    sb.style.background = '#e6f4ea';
                    sb.style.borderColor = '#ceead6';
                }
            } else if (uiTemplateId === 'rejection') {
                const { db, doc, updateDoc } = await import('../site_js/core/firebase.js');
                await updateDoc(doc(db, "bookings", bookingId), { status: 'declined' });
                currentComposerData.status = 'declined';
                renderHubSteps(currentComposerData);

                const sb = document.getElementById('hub-guest-status');
                if (sb) {
                    sb.innerText = 'GEWEIGERD';
                    sb.style.color = '#c62828';
                    sb.style.background = 'rgba(211, 47, 47, 0.08)';
                    sb.style.borderColor = 'rgba(211, 47, 47, 0.2)';
                }
            } else {
                const map = {
                    'deposit_request': 'depositReminder',
                    'deposit_received': 'depositReceived',
                    'balance_reminder': 'balanceReminder',
                    'balance_received': 'balanceReceived',
                    'rules_info': 'preStayInfo',
                    'post_stay': 'postStay'
                };
                const stepKey = map[uiTemplateId];
                if (stepKey) {
                    toggleMailStep(bookingId, stepKey, true);
                }
            }
        }

        async function sendComposerEmailDirectly() {
            const previewArea = document.getElementById('composer-preview-area');
            const btn = document.getElementById('btn-composer-send-email');
            const originalText = btn.innerHTML;

            // 1. Get the HTML content - Remove contenteditable first
            let html = previewArea.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const editable = tempDiv.querySelector('[contenteditable]');
            if (editable) editable.removeAttribute('contenteditable');

            // Wrap in a clean document structure for EmailJS
            const finalHtml = `\x3C!DOCTYPE html>
\x3Chtml lang="nl">
\x3Chead>
    \x3Cmeta charset="UTF-8">
\x3C/head>
\x3Cbody style="margin:0; padding:0; background-color: #FAF9F6;">
    ${tempDiv.innerHTML}
\x3C/body>
\x3C/html>`;

            // DEBUG: Show first bit of HTML to user
            console.log("FULL HTML TO SEND:", finalHtml);
            // alert("DEBUG - E-mail grootte: " + finalHtml.length + " tekens. Controleer console voor volledige HTML.");

            // 2. Prepare params
            const uiTemplateId = document.getElementById('composer-template-select').value;
            const subjectMap = {
                'acceptance': 'Boekingsbevestiging - Gipfel Lodge',
                'rejection': 'Uw aanvraag voor Gipfel Lodge',
                'deposit_request': 'Verzoek tot aanbetaling - Gipfel Lodge',
                'deposit_received': 'Aanbetaling in goede orde ontvangen - Gipfel Lodge',
                'balance_reminder': 'Herinnering openstaand saldo - Gipfel Lodge',
                'balance_received': 'Betaling volledig ontvangen - Gipfel Lodge',
                'rules_info': 'Belangrijke informatie voor uw verblijf - Gipfel Lodge',
                'post_stay': 'Bedankt voor uw verblijf bij Gipfel Lodge',
                'general': 'Bericht van Gipfel Lodge'
            };

            const mailSubject = subjectMap[uiTemplateId] || 'Bericht van Gipfel Lodge';

            const params = {
                to_email: currentComposerData.email,
                user_name: currentComposerData.name,
                email_html: finalHtml,
                subject: mailSubject,
                title: mailSubject
            };

            console.log("Email Payload Prepared:", params);

            if (!params.to_email) {
                alert("Geen e-mailadres bekend voor deze gast.");
                return;
            }

            try {
                btn.disabled = true;
                btn.innerHTML = '\x3Cdiv class="spinner" style="display:block; margin:0 auto; width:18px; height:18px; border-top-color:white;">\x3C/div>';

                // Use the configured EmailJS dynamic template or fallback
                const templateId = localStorage.getItem('emailjs_dynamic_template_id') || 'template_si14pan';
                const serviceId = localStorage.getItem('emailjs_service_id') || 'service_rl6qzmr';
                const publicKey = localStorage.getItem('emailjs_public_key') || 'WC62OFB5MXpryYO1u';

                console.log("Sending via EmailJS...", { serviceId, templateId });
                await emailjs.send(serviceId, templateId, params, publicKey);

                // LOG ACTIVITY
                logActivity('EMAIL_SENT_COMPOSER', `E-mail '${mailSubject}' verzonden via de Hub editor`, currentComposerData.id);

                // Auto-check step in the hub
                const uiTemplateId = document.getElementById('composer-template-select').value;
                autoCheckMailStep(uiTemplateId);

                btn.innerHTML = '✔ Verzonden!';
                btn.style.background = '#27ae60';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);

            } catch (err) {
                console.error("Sending failed:", err);
                alert("Verzenden mislukt: " + (err.text || err.message || "Onbekende fout"));
                btn.innerHTML = '❌ Fout';
                btn.style.background = '#e74c3c';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            }
        }

        // Handle escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('comm-hub-modal').classList.contains('active')) closeCommHub();
                if (document.getElementById('emailTesterModal').classList.contains('active')) closeEmailTester();
            }
        });

        let _xlsxLoaded = false;
        let _importParsed = [];
        let _importInitialized = false;

        async function initImportView() {
            if (_importInitialized) return;
            _importInitialized = true;

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

            const dropZone = document.getElementById('import-drop-zone');
            const fileInput = document.getElementById('import-file-input');
            const btnImport = document.getElementById('imp-btn-import');
            const btnReset = document.getElementById('imp-btn-reset');

            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.background = '#fdf8f0'; });
            dropZone.addEventListener('dragleave', () => { dropZone.style.background = '#fafcff'; });
            dropZone.addEventListener('drop', e => {
                e.preventDefault();
                dropZone.style.background = '#fafcff';
                if (e.dataTransfer.files[0]) importProcessFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', e => {
                if (e.target.files[0]) importProcessFile(e.target.files[0]);
            });

            btnReset.addEventListener('click', () => {
                _importParsed = [];
                fileInput.value = '';
                document.getElementById('import-preview-section').style.display = 'none';
                document.getElementById('import-log-section').style.display = 'none';
                document.getElementById('imp-log').innerHTML = '';
                document.getElementById('imp-progress-bar').style.width = '0%';
            });

            btnImport.addEventListener('click', importToFirebase);
        }

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

        async function importProcessFile(file) {
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
                const totalAmount = parseFloat(String(row[col['Inkomsten']] || '0').replace(',', '.')) || 0;
                
                if (!raw) continue;
                const parts = raw.split('|');
                const sourceId = parts[0].trim();
                const platform = (parts[1] || '').trim();
                const id = importBuildId(sourceId, platform);
                
                // Berekeningen
                const isOwner = id.startsWith('Owner-');
                const chargeableGuests = adults + children; // Babys gratis
                
                const cleaning = isOwner ? 0 : 350.00;
                const bedLinen = isOwner ? 0 : (chargeableGuests * 20.95);
                const touristTax = isOwner ? 0 : (chargeableGuests * nights * 2.50);
                const mobilityFee = isOwner ? 0 : (chargeableGuests * nights * 0.50);

                const checkIn = importParseDate(row[col['Aankomst']]);
                const checkOut = importParseDate(row[col['Vertrek']]);
                if (!checkIn || !checkOut) continue;

                _importParsed.push({
                    id, sourceId, platform,
                    type: id.startsWith('Owner-') ? 'owner' : 'guest',
                    guestName: String(row[col['Gast']] || '').trim(),
                    guestEmail: String(row[col['E-mailadres']] || '').trim(),
                    guestPhone: String(row[col['Telefoon']] || '').replace(/\D/g, ''),
                    guestCountry: String(row[col['Land']] || '').trim(),
                    guestAddress: '',
                    guestZipcode: '',
                    guestCity: '',
                    checkIn, checkOut,
                    nights: Number(row[col['Nachten']] || 0),
                    adults: adults,
                    children: children,
                    babies: babies,
                    totalAmount: totalAmount,
                    message: String(row[col['Opmerking']] || '').trim(),
                    // Berekende kostenposten
                    rent: id.startsWith('Owner-') ? 0 : totalAmount - (cleaning + bedLinen + touristTax + mobilityFee),
                    cleaning: cleaning,
                    bedLinen: bedLinen,
                    touristTax: touristTax,
                    mobilityFee: mobilityFee,
                    secretToken: Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8)
                });
            }

            await importRenderPreview();
        }

        async function importRenderPreview() {
            const { db, doc, getDoc } = await import('../site_js/core/firebase.js');
            const existingIds = new Set();
            for (const b of _importParsed) {
                const snap = await getDoc(doc(db, 'bookings', b.id));
                if (snap.exists()) existingIds.add(b.id);
            }

            const tbody = document.getElementById('import-preview-body');
            tbody.innerHTML = '';
            let newCount = 0, existsCount = 0;

            _importParsed.forEach(b => {
                const exists = existingIds.has(b.id);
                if (exists) existsCount++; else newCount++;
                const statusBadge = exists
                    ? `<span class="status-badge" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;">Bestaat</span>`
                    : `<span class="status-badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;">Nieuw</span>`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${statusBadge}</td>
                    <td style="font-family:monospace;font-size:0.75rem;">${b.id}</td>
                    <td style="font-size:0.75rem;color:#94a3b8;">${b.sourceId}</td>
                    <td>${b.guestName || '<em style="color:#94a3b8">Eigenaar</em>'}</td>
                    <td>${b.checkIn}</td>
                    <td>${b.checkOut}</td>
                    <td style="text-align:center;">${b.nights}</td>
                    <td style="color:var(--color-gold);">€${b.totalAmount.toFixed(2)}</td>
                    <td>${b.country}</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('imp-stat-total').textContent = _importParsed.length;
            document.getElementById('imp-stat-new').textContent = newCount;
            document.getElementById('imp-stat-exists').textContent = existsCount;
            document.getElementById('import-preview-section').style.display = '';
        }

        async function importToFirebase() {
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
                if (snap.exists() && !overwrite) {
                    skipped++;
                    impLog(`⏭ ${b.id} — overgeslagen (bestaat al)`);
                    document.getElementById('imp-progress-bar').style.width = Math.round(((i + 1) / _importParsed.length) * 100) + '%';
                    continue;
                }

                try {
                    await setDoc(doc(db, 'bookings', b.id), {
                        bookingId: b.id,
                        type: b.type,
                        status: b.type === 'owner' ? 'owner' : 'confirmed',
                        guestName: b.guestName,
                        guestEmail: b.guestEmail,
                        guestPhone: b.guestPhone,
                        guestAddress: b.guestAddress || '',
                        guestZipcode: b.guestZipcode || '',
                        guestCity: b.guestCity || '',
                        guestCountry: b.guestCountry || b.country || '',
                        country: b.guestCountry || b.country || '',
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
                    });
                    success++;
                    impLog(`✅ ${b.id} — ${b.guestName || 'Eigenaar'} (${b.checkIn} → ${b.checkOut})`, '#16a34a');
                    await logActivity('Excel Import', `Boeking geïmporteerd via Excel upload`, b.id);
                } catch (err) {
                    failed++;
                    impLog(`❌ ${b.id} — ${err.message}`, '#dc2626');
                }

                document.getElementById('imp-progress-bar').style.width = Math.round(((i + 1) / _importParsed.length) * 100) + '%';
            }

            const color = failed ? '#f59e0b' : '#16a34a';
            impLog(`📊 Klaar! ✅ ${success} geïmporteerd · ⏭ ${skipped} overgeslagen · ❌ ${failed} mislukt.`, color);
            btn.textContent = '✔ Import voltooid';
            btn.disabled = false;
        }

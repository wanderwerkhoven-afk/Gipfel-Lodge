/* MODULE: UI */
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
            const superUserViews = ['logs-view', 'import-view'];
            if (superUserViews.includes(viewId) && currentUserRole !== 'superuser') {
                console.warn('Access denied: ' + viewId + ' requires superuser role.');
                alert('Geen toegang: Deze pagina is alleen zichtbaar voor beheerders.');
                return;
            }

            // Update nav items active state
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            // If navEl is provided, use it, otherwise find the ones with matching onclick
            if (navEl) {
                navEl.classList.add('active');
            } else {
                document.querySelectorAll('.nav-item').forEach(item => {
                    if (item.getAttribute('onclick')?.includes(`'${viewId}'`)) {
                        item.classList.add('active');
                    }
                });
            }

            // Auto-close mobile menu if it was open
            const sidebar = document.getElementById('dashboard-sidebar');
            if (sidebar && sidebar.classList.contains('active')) {
                toggleMobileMenu();
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
            } else if (viewId === 'pricing-view') {
                initPricingView();
            } else if (viewId === 'carousel-view') {
                loadCarouselView();
            } else if (viewId === 'invoices-view') {
                loadInvoices();
            } else if (viewId === 'behavior-view') {
                loadBehaviorStats();
            }

            // Scroll to top when switching views on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Sub-navigation for Kostenposten (Cleaning, Mobility, Tourist Tax)
        function switchKostenpostenTab(tabId, el) {
            // Update active tab buttons
            const tabButtons = document.querySelectorAll('.kp-tab');
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = '#64748b';
                btn.style.boxShadow = 'none';
            });
            
            if (el) {
                el.classList.add('active');
                el.style.background = '#fff';
                el.style.color = 'var(--color-gold)';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            }

            // Update tab panes visibility
            const panes = document.querySelectorAll('.kp-pane');
            panes.forEach(pane => {
                pane.style.display = 'none';
                pane.classList.remove('active');
            });

            const targetPane = document.getElementById('kp-tab-' + tabId);
            if (targetPane) {
                targetPane.style.display = 'block';
                targetPane.classList.add('active');
            }
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
                    const card = renderBookingCardHTML(data, 'bookings', today);
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


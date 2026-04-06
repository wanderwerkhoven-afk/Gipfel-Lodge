import { db, collection, addDoc, serverTimestamp, runTransaction, doc, setDoc } from '../core/firebase.js';
import { countries } from '../data/countries.js';

const GipfelBooking = {
    currentDate: new Date(),
    selectedCheckIn: null,
    selectedCheckOut: null,
    
    // Real Pricing Data
    pricingData: {}, // Map of 'YYYY-MM-DD' to price object
    
    // Real Availability Data (fetched from Firestore)
    bookedDates: [],
    onRequestDates: [],
    
    // Split day tracking
    confirmedCheckIns: [],
    confirmedCheckOuts: [],
    pendingCheckIns: [],
    pendingCheckOuts: [],

    // Pricing Constants
    CLEANING_FEE: 350.00,
    BED_LINEN_FEE: 20.95,
    TOURIST_TAX_FEE: 2.50,
    MOBILITY_FEE: 0.50,
    
    formatDateLocal(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    currentStep: 1,

    init() {
        console.log("Initializing GipfelBooking...");
        this.cal1Title = document.getElementById('cal1-title');
        this.cal2Title = document.getElementById('cal2-title');
        this.cal1Grid = document.getElementById('cal1-grid');
        this.cal2Grid = document.getElementById('cal2-grid');
        this.monthNavTrack = document.getElementById('month-nav-track');
        this.continueBtn = document.getElementById('cal-continue-btn');
        this.slider = document.querySelector('.booking-slider');
        this.steps = document.querySelectorAll('.booking-steps .step');
        
        if (!this.cal1Grid) return; // Not on page
        
        this.updateLocalizationData();
        
        // Reset to current month, 1st day
        this.currentDate = new Date();
        this.currentDate.setDate(1);
        
        this.attachListeners();
        this.loadPricingData().then(() => {
            this.renderAll();
        }).catch(err => {
            console.error("Failed to load pricing data", err);
            this.renderAll(); // Render anyway without prices
        });

        // Initialize Phone Country Selector
        this.initCountrySelector();

        // Listen for language changes
        document.addEventListener('languageChanged', () => {
            this.updateLocalizationData();
            this.renderAll();
        });

        // Initialize EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.init({
                publicKey: "WC62OFB5MXpryYO1u",
            });
        }

        // Load dynamic availability
        this.loadAvailabilityData().then(() => {
            this.renderAll();
        });
    },

    async loadAvailabilityData() {
        try {
            const { getDocs, query, collection, where, db } = await import('../core/firebase.js');
            
            // Fetch ALL bookings (or filter by status if preferred)
            const q = query(collection(db, "bookings"));
            const querySnapshot = await getDocs(q);
            
            this.bookedDates = [];
            this.onRequestDates = [];
            this.confirmedCheckIns = [];
            this.confirmedCheckOuts = [];
            this.pendingCheckIns = [];
            this.pendingCheckOuts = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.checkIn || !data.checkOut) return;
                
                // ONLY process confirmed or pending bookings. 
                // Skip 'rejected', 'cancelled', etc.
                if (data.status !== 'confirmed' && data.status !== 'pending' && data.status) return;

                const startStr = data.checkIn;
                const endStr = data.checkOut;
                
                const start = new Date(startStr);
                start.setHours(12, 0, 0, 0);
                const end = new Date(endStr);
                end.setHours(12, 0, 0, 0);
                
                // Track start/end for confirmed vs pending bookings
                if (data.status === 'confirmed') {
                    if (!this.confirmedCheckIns.includes(startStr)) this.confirmedCheckIns.push(startStr);
                    if (!this.confirmedCheckOuts.includes(endStr)) this.confirmedCheckOuts.push(endStr);
                } else {
                    // This catches 'pending' or missing status
                    if (!this.pendingCheckIns.includes(startStr)) this.pendingCheckIns.push(startStr);
                    if (!this.pendingCheckOuts.includes(endStr)) this.pendingCheckOuts.push(endStr);
                }

                // Internal nights (nights actually stayed)
                let current = new Date(start);
                while (current < end) { 
                    const dateStr = this.formatDateLocal(current);
                    if (data.status === 'confirmed') {
                        if (!this.bookedDates.includes(dateStr)) this.bookedDates.push(dateStr);
                    } else {
                        // This catches 'pending' or missing status
                        if (!this.onRequestDates.includes(dateStr)) this.onRequestDates.push(dateStr);
                    }
                    current.setDate(current.getDate() + 1);
                }
            });
            console.log("Loaded live availability:", { booked: this.bookedDates.length, request: this.onRequestDates.length });
        } catch (e) {
            console.error("Error loading availability from Firebase:", e);
        }
    },

    updateLocalizationData() {
        const lang = document.documentElement.lang || 'de';
        
        // Use Intl for localized names
        const monthFormatter = new Intl.DateTimeFormat(lang, { month: 'long' });
        this.monthNames = Array.from({ length: 12 }, (_, i) => monthFormatter.format(new Date(2021, i, 1)));
        
        const dayFormatter = new Intl.DateTimeFormat(lang, { weekday: 'short' });
        // Start from a Monday (2021-11-01 was a Monday)
        this.dayNames = Array.from({ length: 7 }, (_, i) => dayFormatter.format(new Date(2021, 10, i + 1)));
    },

    async loadPricingData() {
        try {
            // Fetch both 2026 and 2027 data
            const [res26, res27] = await Promise.all([
                fetch('pricing_sources/pricing_2026.json'),
                fetch('pricing_sources/pricing_2027.json')
            ]);
            
            if (res26.ok) {
                const data = await res26.json();
                data.forEach(item => { this.pricingData[item.datum] = item; });
            }
            if (res27.ok) {
                const data = await res27.json();
                data.forEach(item => { this.pricingData[item.datum] = item; });
            }
        } catch(e) {
            console.error("Error fetching price JSON", e);
        }
    },

    attachListeners() {
        // Next month button (in calendar header)
        document.querySelectorAll('.cal-nav-next').forEach(btn => {
            btn.onclick = () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderAll();
            };
        });

        // Previous month button (in calendar header)
        document.querySelectorAll('.cal-nav-prev').forEach(btn => {
            btn.onclick = () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderAll();
            };
        });

        // Horizontal nav next button
        const nextNavBtn = document.querySelector('.month-nav-next');
        if (nextNavBtn) {
            nextNavBtn.onclick = () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderAll();
            };
        }

        // Horizontal nav prev button
        const prevNavBtn = document.querySelector('.month-nav-prev');
        if (prevNavBtn) {
            prevNavBtn.onclick = () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderAll();
            };
        }

        // Guest Counters
        document.querySelectorAll('.counter-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;
                
                let val = parseInt(input.value) || 0;
                const min = parseInt(input.getAttribute('min')) || 0;
                const max = parseInt(input.getAttribute('max')) || 10;
                
                const adultInput = document.getElementById('b-adults');
                const childrenInput = document.getElementById('b-children');
                const msgEl = document.getElementById('guest-limit-msg');
                const currentTotal = parseInt(adultInput.value) + parseInt(childrenInput.value);
                
                if (btn.classList.contains('plus')) {
                    // Check global limit for adults/children sum
                    if (targetId === 'b-adults' || targetId === 'b-children') {
                        if (currentTotal >= 10) {
                            if (msgEl) msgEl.style.display = 'block';
                            return;
                        }
                    }
                    if (val < max) val++;
                } else if (btn.classList.contains('minus')) {
                    if (val > min) val--;
                }
                
                input.value = val;
                
                // Check if we can hide the message now
                const newTotal = parseInt(adultInput.value) + parseInt(childrenInput.value);
                if (newTotal <= 10 && msgEl) {
                    msgEl.style.display = 'none';
                }
            };
        });

        // Continue button (Step 1 -> 2)
        if (this.continueBtn) {
            this.continueBtn.onclick = () => {
                if (this.selectedCheckIn && this.selectedCheckOut) {
                    // Populate form inputs
                    document.getElementById('b-checkin').value = this.selectedCheckIn;
                    document.getElementById('b-checkout').value = this.selectedCheckOut;
                    
                    this.goToStep(2);
                }
            };
        }

        // Form Submission (Step 2 -> 3)
        const form = document.getElementById('booking-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                this.renderSummary();
                this.goToStep(3);
            }
        }

        // Final Confirmation
        const finalBtn = document.getElementById('final-confirm-btn');
        if (finalBtn) {
            finalBtn.onclick = async () => {
                const originalText = finalBtn.innerText;
                finalBtn.innerText = "Senden..."; // Or use i18n
                finalBtn.classList.add('disabled');

                const t = (key) => window.i18n ? window.i18n.t(key) : key;
                let guestParams, ownerParams;

                // Calculate total amount safely — outside the critical try block
                // so a failure here never blocks email or Firebase submission
                let totalAmount = 0;
                let costs = null;
                try {
                    costs = this.calculateCosts();
                    totalAmount = costs ? costs.total : 0;
                } catch (e) {
                    console.warn('Could not calculate total amount:', e);
                }

                try {
                    // --- Gather raw form values ---
                    const userName   = document.getElementById('b-name').value;
                    const userEmail  = document.getElementById('b-email').value;
                    const phoneRaw   = document.getElementById('b-phone').value || '-';
                    const userPhone  = phoneRaw !== '-' ? `${this.selectedCountryPrefix} ${phoneRaw}` : '-';
                    
                    const userAddress = document.getElementById('b-address').value;
                    const userZipcode = document.getElementById('b-zipcode').value;
                    const userCity    = document.getElementById('b-city').value;
                    const userCountry = document.getElementById('b-country').value;

                    const checkIn    = document.getElementById('b-checkin').value;
                    const checkOut   = document.getElementById('b-checkout').value;
                    const adults     = document.getElementById('b-adults').value;
                    const children   = document.getElementById('b-children').value;
                    const babies     = document.getElementById('b-babies').value;
                    const message    = document.getElementById('b-message').value || '-';

                    // --- Calculate derived values ---
                    const msPerDay   = 1000 * 60 * 60 * 24;
                    const checkInDate = new Date(checkIn);
                    checkInDate.setHours(12, 0, 0, 0);
                    const checkOutDate = new Date(checkOut);
                    checkOutDate.setHours(12, 0, 0, 0);
                    const nights     = Math.round((checkOutDate - checkInDate) / msPerDay);
                    const totalGuests = parseInt(adults) + parseInt(children) + parseInt(babies);

                    const now         = new Date();
                    const receivedDate = now.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
                    const receivedTime = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

                    // --- Guest confirmation e-mail params ---
                    guestParams = {
                        user_name:           userName,
                        user_email:          userEmail,
                        user_phone:          userPhone,
                        user_address:        userAddress,
                        user_zipcode:        userZipcode,
                        user_city:           userCity,
                        user_country:        userCountry,
                        check_in:            checkIn,
                        check_out:           checkOut,
                        guests:              `${adults} ${t('form-adults')}, ${children} ${t('form-children')}, ${babies} ${t('form-babies')}`,
                        message:             message,

                        email_tagline:       "Alpine Elegance",
                        email_heading:       t('success-title'),
                        email_intro:         t('email-intro'),
                        label_travel_data:   t('email-travel-data'),
                        label_guests:        t('email-guests'),
                        label_message:       t('email-message'),
                        label_contact:       t('email-contact'),
                        email_closing:       t('email-closing'),
                        email_visit_website: t('email-visit-website'),

                        reply_to:            userEmail,
                        to_email:            userEmail,
                    };

                    // --- Owner notification e-mail params ---
                    ownerParams = {
                        user_name:      userName,
                        user_email:     userEmail,
                        user_phone:     userPhone,
                        user_address:   userAddress,
                        user_zipcode:   userZipcode,
                        user_city:      userCity,
                        user_country:   userCountry,
                        check_in:       checkIn,
                        check_out:      checkOut,
                        nights:         nights,
                        adults:         adults,
                        children:       children,
                        babies:         babies,
                        total_guests:   totalGuests,
                        message:        message,
                        received_date:  receivedDate,
                        received_time:  receivedTime,
                        total_amount:   new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totalAmount || 0),

                        reply_to:       userEmail,
                    };

                    console.log("Guest params:", guestParams);
                    console.log("Owner params:", ownerParams);

                } catch (paramError) {
                    console.error("Form Data Error:", paramError);
                    alert("Fout bij verzamelen gegevens: " + paramError.message);
                    finalBtn.innerText = originalText;
                    finalBtn.classList.remove('disabled');
                    return;
                }

                try {
                    if (typeof emailjs === 'undefined') {
                        throw new Error("EmailJS library (SDK) is niet geladen. Controleer je internetverbinding.");
                    }

                    // --- 1. Optimistic UI Transition ---
                    // We transition to the success page immediately to provide a fast user experience
                    this.goToStep(4);

                    // --- 2. Send emails in background ---
                    // Guest confirmation email
                    emailjs.send(
                        'service_rl6qzmr', 
                        'template_3029w4q',   // Guest confirmation
                        guestParams
                    ).then(response => {
                        console.log("Guest email sent:", response.status, response.text);
                    }).catch(err => {
                        console.error("Guest EmailJS Error:", err);
                    });

                    // Owner notification temporarily disabled
                    // emailjs.send('service_rl6qzmr', 'template_oy6c1fe', ownerParams, 'WC62OFB5MXpryYO1u');

                    // --- 3. Save to Firebase Database in background ---
                    // Using a small timeout to ensure UI transition finishes first
                    setTimeout(async () => {
                        try {
                            console.log("Attempting Firestore Archive with Sequential ID...");
                            const counterRef = doc(db, "metadata", "counters");

                            // 1. Get next sequential ID via transaction
                            const generateData = await runTransaction(db, async (transaction) => {
                                const counterDoc = await transaction.get(counterRef);
                                const bookingYear = new Date().getFullYear();
                                const invYearKey = `lastInvoiceNumber_${bookingYear}`;

                                // If counter doesn't exist, start high (e.g., from 615)
                                let currentNum = counterDoc.exists() ? (counterDoc.data().lastBookingNumber || 0) : 615;
                                let currentInv = counterDoc.exists() ? (counterDoc.data()[invYearKey] || 1000) : 1000;
                                
                                let uniqueFound = false;
                                let attemptNum = currentNum + 1;
                                
                                // Robust logic: skip any manually created IDs or prior collisions
                                while (!uniqueFound) {
                                    const candidateId = `Gipfel-${String(attemptNum).padStart(6, '0')}`;
                                    const checkDoc = await transaction.get(doc(db, "bookings", candidateId));
                                    if (!checkDoc.exists()) {
                                        uniqueFound = true;
                                    } else {
                                        console.log("Collision detected for ID: " + candidateId + ". Skipping...");
                                        attemptNum++;
                                    }
                                }
                                
                                const nextInv = currentInv + 1;

                                transaction.set(counterRef, { 
                                    lastBookingNumber: attemptNum,
                                    [invYearKey]: nextInv 
                                }, { merge: true });
                                
                                return { bookingNum: attemptNum, invoiceNum: nextInv, year: bookingYear };
                            });

                            const bookingId = `Gipfel-${String(generateData.bookingNum).padStart(6, '0')}`;
                            const invoiceId = `F${generateData.year}-${String(generateData.invoiceNum).padStart(4, '0')}`;
                            console.log("Generated Booking ID:", bookingId, "Invoice ID:", invoiceId);

                            // 2. Generate Secret Token for hosted invoice
                            const secretToken = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);

                            const rawCountry = ownerParams.user_country || '';
                            const mappedCountry = countries.find(c => c.name.toLowerCase() === rawCountry.toLowerCase());
                            const finalCountryCode = mappedCountry ? mappedCountry.code : '';
                            
                            console.log(`[Firebase Save] Resolving country ${rawCountry} to code: ${finalCountryCode}`);

                            // 3. Save booking with custom ID
                            await setDoc(doc(db, "bookings", bookingId), {
                                bookingId: bookingId,
                                invoiceId: invoiceId,
                                guestName: ownerParams.user_name || 'Anoniem',
                                guestEmail: ownerParams.user_email || '',
                                guestPhone: ownerParams.user_phone || '-',
                                guestAddress: ownerParams.user_address || '',
                                guestZipcode: ownerParams.user_zipcode || '',
                                guestCity: ownerParams.user_city || '',
                                guestCountry: ownerParams.user_country || '',
                                country: finalCountryCode,
                                checkIn: ownerParams.check_in || '',
                                checkOut: ownerParams.check_out || '',
                                nights: ownerParams.nights || 0,
                                totalGuests: ownerParams.total_guests || 0,
                                adults: ownerParams.adults || 0,
                                children: ownerParams.children || 0,
                                babies: ownerParams.babies || 0,
                                message: ownerParams.message || '-',
                                totalAmount: totalAmount,
                                // Breakdown
                                rent: costs ? costs.rent : 0,
                                cleaning: costs ? costs.cleaning : 0,
                                bedLinen: costs ? costs.bedLinen : 0,
                                touristTax: costs ? costs.touristTax : 0,
                                mobilityFee: costs ? costs.mobilityFee : 0,
                                
                                depositPaid: false,
                                balancePaid: false,
                                status: "pending", 
                                receivedDate: ownerParams.received_date || '',
                                receivedTime: ownerParams.received_time || '',
                                secretToken: secretToken,
                                createdAt: serverTimestamp() 
                            });
                            console.log("Booking successfully archived in Firestore with ID:", bookingId);
                        } catch (dbError) {
                            console.error("Firestore Archiving Error:", dbError);
                        }
                    }, 800);

                } catch (error) {
                    console.error("Critical Submission Error:", error);
                    alert("Er is een fout opgetreden bij het verwerken van je aanvraag: " + (error.message || "Onbekende fout"));
                    finalBtn.innerText = originalText;
                    finalBtn.classList.remove('disabled');
                }
            }
        }

        // Progress Step Clicks (Interactive Navigation)
        if (this.steps) {
            this.steps.forEach(step => {
                step.style.cursor = 'pointer';
                step.onclick = () => {
                    const targetStep = parseInt(step.getAttribute('data-step'));
                    if (targetStep < this.currentStep) {
                        // Always allow going back
                        this.goToStep(targetStep);
                    } else if (targetStep > this.currentStep) {
                        // Allow going forward only if conditions met
                        if (targetStep === 2 && this.selectedCheckIn && this.selectedCheckOut) {
                            this.goToStep(2);
                        } else if (targetStep === 3) {
                            // ...
                        } else if (targetStep === 4) {
                            // Don't allow jumping to success manually
                        }
                    }
                };
            });
        }
    },
    initCountrySelector() {
        const selector = document.getElementById('country-code-select');
        const dropdown = document.getElementById('code-dropdown');
        const countrySelect = document.getElementById('b-country');
        if (!selector || !dropdown) return;

        // --- 1. Populate b-country Dropdown ---
        if (countrySelect) {
            // Keep the initial "Kies een land" option
            const initialOption = countrySelect.options[0];
            countrySelect.innerHTML = '';
            countrySelect.appendChild(initialOption);
            
            countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.name;
                countrySelect.appendChild(opt);
            });
        }

        // --- 2. Render Phone Code Dropdown Structure with Search ---
        dropdown.innerHTML = `
            <div class="code-search-wrapper">
                <input type="text" id="code-search" placeholder="Search country..." autocomplete="off">
            </div>
            <div class="code-list-items" id="code-list-items"></div>
        `;

        const listContainer = document.getElementById('code-list-items');
        const searchInput = document.getElementById('code-search');

        const renderList = (filter = '') => {
            const filtered = countries.filter(c => 
                c.name.toLowerCase().includes(filter.toLowerCase()) || 
                c.dial.includes(filter)
            );

            listContainer.innerHTML = filtered.map(c => `
                <div class="code-item" data-prefix="${c.dial}" data-code="${c.code.toLowerCase()}" data-name="${c.name}">
                    <span class="fi fi-${c.code.toLowerCase()}"></span>
                    <span class="country-name">${c.name}</span>
                    <span class="country-prefix">${c.dial}</span>
                </div>
            `).join('');

            // Re-attach selection listeners
            listContainer.querySelectorAll('.code-item').forEach(item => {
                item.onclick = (e) => {
                    e.stopPropagation();
                    const prefix = item.getAttribute('data-prefix');
                    const code = item.getAttribute('data-code');
                    
                    this.selectedCountryPrefix = prefix;
                    selector.querySelector('.prefix').innerText = prefix;
                    selector.querySelector('.flag-container').innerHTML = `<span class="fi fi-${code}"></span>`;
                    
                    dropdown.classList.remove('is-open');
                };
            });
        };

        // Initial render
        renderList();

        // Search logic
        searchInput.oninput = (e) => {
            renderList(e.target.value);
        };

        // Prevent dropdown close when clicking search
        searchInput.onclick = (e) => e.stopPropagation();

        // Default selection (Netherlands)
        this.selectedCountryPrefix = '+31';
        if (selector.querySelector('.flag-container')) {
            selector.querySelector('.flag-container').innerHTML = `<span class="fi fi-nl"></span>`;
        }
        selector.querySelector('.prefix').innerText = '+31';

        // Toggle dropdown
        selector.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('is-open');
            if (dropdown.classList.contains('is-open')) {
                searchInput.value = '';
                renderList();
                setTimeout(() => searchInput.focus(), 100);
            }
        };

        // Close on outside click
        document.addEventListener('click', () => {
            dropdown.classList.remove('is-open');
        });
    },


    goToStep(n) {
        if (!this.slider) return;
        this.currentStep = n;
        
        // Slide the track
        const offset = (n - 1) * -25;
        this.slider.style.transform = `translateX(${offset}%)`;
        
        // Update Progress Bar
        if (this.steps) {
            this.steps.forEach(step => {
                const sNum = parseInt(step.getAttribute('data-step'));
                if (sNum <= n) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });
        }
        
        // Precise scroll to focus on the white booking card
        const card = document.querySelector('.booking-flow-card');
        if (card) {
            const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80;
            const targetY = card.getBoundingClientRect().top + window.pageYOffset - headerH;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        }

        // Always re-render summary when entering Step 3
        if (n === 3) {
            this.renderSummary();
        }
    },

    renderSummary() {
        const summaryGrid = document.getElementById('booking-summary-content');
        if (!summaryGrid) return;

        const name = document.getElementById('b-name').value;
        const email = document.getElementById('b-email').value;
        
        const phoneRaw = document.getElementById('b-phone').value || '';
        const phone = phoneRaw ? `${this.selectedCountryPrefix} ${phoneRaw}` : '-';

        const address = document.getElementById('b-address').value;
        const zipcode = document.getElementById('b-zipcode').value;
        const city = document.getElementById('b-city').value;
        const country = document.getElementById('b-country').value;

        const checkin = document.getElementById('b-checkin').value;
        const checkout = document.getElementById('b-checkout').value;
        const adults = document.getElementById('b-adults').value;
        const children = document.getElementById('b-children').value;
        const babies = document.getElementById('b-babies').value;
        const message = document.getElementById('b-message').value || '-';

        const t = (k) => window.i18n ? window.i18n.t(k) : k;

        summaryGrid.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">${t('form-name')}</span>
                <span class="summary-value">${name}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${t('form-email')} / ${t('form-phone')}</span>
                <span class="summary-value">${email} <br> ${phone}</span>
            </div>
            <div class="summary-item summary-full">
                <span class="summary-label">${t('form-address')} & ${t('form-country')}</span>
                <span class="summary-value">${address}, ${zipcode} ${city} — ${country}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${t('step-date')}</span>
                <span class="summary-value">${checkin} — ${checkout}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">${t('form-guests')}</span>
                <span class="summary-value">${adults} ${t('form-adults')}, ${children} ${t('form-children')}, ${babies} ${t('form-babies')}</span>
            </div>
            <div class="summary-item summary-full">
                <span class="summary-label">${t('form-message')}</span>
                <span class="summary-value">${message}</span>
            </div>
        `;

        const costs = this.calculateCosts();
        const priceContainer = document.getElementById('booking-price-breakdown');
        if (costs && priceContainer) {
            const t = (key) => window.i18n ? window.i18n.t(key) : key;
            priceContainer.innerHTML = `
                <h4 class="settlement-title">${t('settle-title')}</h4>
                <div class="settlement-table">
                    <div class="settlement-row">
                        <span class="settle-label">${t('settle-rent')} (${costs.nights} ${t('unit-nights')})</span>
                        <span class="settle-val">${this.fmtEUR(costs.rent)}</span>
                    </div>
                    <div class="settlement-row">
                        <span class="settle-label">${t('settle-cleaning')}</span>
                        <span class="settle-val">${this.fmtEUR(costs.cleaning)}</span>
                    </div>
                    <div class="settlement-row">
                        <span class="settle-label">${t('settle-linen')} (${costs.chargeableGuests}x)</span>
                        <span class="settle-val">${this.fmtEUR(costs.bedLinen)}</span>
                    </div>
                    <div class="settlement-row">
                        <span class="settle-label">${t('settle-tax')}</span>
                        <span class="settle-val">${this.fmtEUR(costs.touristTax)}</span>
                    </div>
                    <div class="settlement-row">
                        <span class="settle-label">${t('settle-mobility')}</span>
                        <span class="settle-val">${this.fmtEUR(costs.mobilityFee)}</span>
                    </div>
                    <div class="settlement-row settlement-row--total">
                        <span class="settle-label">${t('settle-total')}</span>
                        <span class="settle-val">${this.fmtEUR(costs.total)}</span>
                    </div>
                </div>
            `;
        }
    },

    renderAll() {
        this.renderMonthNav();
        
        // Render Left Calendar (Current Month)
        this.renderMonth(this.currentDate, this.cal1Title, this.cal1Grid);
        
        // Render Right Calendar (Next Month)
        const nextMonth = new Date(this.currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        this.renderMonth(nextMonth, this.cal2Title, this.cal2Grid);

        this.updateNavigationButtons();
        this.updateContinueButton();

        // If we are on the summary step, re-render it to update translations
        if (this.currentStep === 3) {
            this.renderSummary();
        }
    },

    calculateCosts() {
        if (!this.selectedCheckIn || !this.selectedCheckOut) return null;

        const checkIn = new Date(this.selectedCheckIn);
        checkIn.setHours(12, 0, 0, 0);
        const checkOut = new Date(this.selectedCheckOut);
        checkOut.setHours(12, 0, 0, 0);
        
        const adults = parseInt(document.getElementById('b-adults').value) || 0;
        const children = parseInt(document.getElementById('b-children').value) || 0;
        const babies = parseInt(document.getElementById('b-babies').value) || 0;
        const totalGuests = adults + children + babies;
        const chargeableGuests = adults + children;

        const diffTime = Math.abs(checkOut - checkIn);
        const nights = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let rent = 0;
        let tempDate = new Date(checkIn);
        for (let i = 0; i < nights; i++) {
            const dateStr = this.formatDateLocal(tempDate);
            const dayPrice = this.pricingData[dateStr]?.dagprijs || 0;
            rent += dayPrice;
            tempDate.setDate(tempDate.getDate() + 1);
        }

        const cleaning = this.CLEANING_FEE;
        const bedLinen = chargeableGuests * this.BED_LINEN_FEE;
        const touristTax = chargeableGuests * nights * this.TOURIST_TAX_FEE;
        const mobilityFee = chargeableGuests * nights * this.MOBILITY_FEE;
        
        const total = rent + cleaning + bedLinen + touristTax + mobilityFee;

        return {
            rent,
            cleaning,
            bedLinen,
            touristTax,
            mobilityFee,
            total,
            nights,
            totalGuests,
            chargeableGuests
        };
    },

    fmtEUR(val) {
        return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(val);
    },

    updateNavigationButtons() {
        // Check if currentDate is in the past (before current real month)
        const today = new Date();
        const isPast = this.currentDate.getFullYear() < today.getFullYear() || 
                       (this.currentDate.getFullYear() === today.getFullYear() && this.currentDate.getMonth() <= today.getMonth());
        
        const prevCalBtn = document.querySelector('.cal-nav-prev');
        if (prevCalBtn) prevCalBtn.disabled = isPast;

        const prevNavBtn = document.querySelector('.month-nav-prev');
        if (prevNavBtn) prevNavBtn.disabled = isPast;
    },

    renderMonthNav() {
        if (!this.monthNavTrack) return;
        this.monthNavTrack.innerHTML = '';

        // Render 6 upcoming months in the horizontal track
        const startMonth = new Date(this.currentDate);
        
        for (let i = 0; i < 6; i++) {
            const navItem = document.createElement('div');
            navItem.className = 'month-nav-item';
            if (i === 0) navItem.classList.add('active'); // Highlight first visible month

            const monthStr = this.monthNames[startMonth.getMonth()].substring(0,3); // e.g. "Mär"
            const yearStr = startMonth.getFullYear();

            navItem.innerHTML = `
                <span class="month-nav-month">${monthStr}</span>
                <span class="month-nav-year">${yearStr}</span>
            `;

            // Allow clicking to jump to that month
            const jumpTo = new Date(startMonth);
            navItem.onclick = () => {
                this.currentDate = new Date(jumpTo);
                this.renderAll();
            };

            this.monthNavTrack.appendChild(navItem);
            startMonth.setMonth(startMonth.getMonth() + 1);
        }
    },

    renderMonth(dateObj, titleEl, gridEl) {
        if (!titleEl || !gridEl) return;
        
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();

        // Set Title
        titleEl.innerHTML = `${this.monthNames[month]} <span class="cal-year">${year}</span>`;

        gridEl.innerHTML = '';

        // Day Headers
        this.dayNames.forEach(day => {
            const el = document.createElement('div');
            el.className = 'cal-day-header';
            el.textContent = day;
            gridEl.appendChild(el);
        });

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let firstDayIndex = new Date(year, month, 1).getDay() - 1; 
        if (firstDayIndex === -1) firstDayIndex = 6; 

        const today = new Date();
        today.setHours(0,0,0,0);

        // Empty slots
        for (let i = 0; i < firstDayIndex; i++) {
            const el = document.createElement('div');
            el.className = 'cal-day empty';
            gridEl.appendChild(el);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const el = document.createElement('div');
            el.className = 'cal-day';
            
            // Format YYYY-MM-DD
            const cellDate = new Date(year, month, i);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            // Basic Content
            el.innerHTML = `<span>${i}</span>`;
            
            // Structured content
            el.innerHTML = `<span class="cal-day-num">${i}</span>`;
            
            // Logic state
            const isConfirmedIn = (this.confirmedCheckIns || []).includes(dateStr);
            const isConfirmedOut = (this.confirmedCheckOuts || []).includes(dateStr);
            const isBooked = (this.bookedDates || []).includes(dateStr);
            
            const isPendingIn = (this.pendingCheckIns || []).includes(dateStr);
            const isPendingOut = (this.pendingCheckOuts || []).includes(dateStr);
            const isOnRequest = (this.onRequestDates || []).includes(dateStr);

            // Selection state
            if (cellDate < today) {
                el.classList.add('past');
            } else if (isConfirmedIn && isConfirmedOut) {
                el.classList.add('booked'); // Fully orange night
                // Overlap: can be checkout for someone else
            } else if (isConfirmedIn) {
                el.classList.add('is-check-in');
                el.classList.add('booked'); 
            } else if (isConfirmedOut) {
                el.classList.add('is-check-out');
                el.classList.add('available');
            } else if (isBooked) {
                el.classList.add('booked');
            } else if (isPendingIn && isPendingOut) {
                el.classList.add('on-request'); 
            } else if (isPendingIn) {
                el.classList.add('is-pending-in');
                el.classList.add('on-request');
            } else if (isPendingOut) {
                el.classList.add('is-pending-out');
                el.classList.add('available'); 
            } else if (isOnRequest) {
                el.classList.add('on-request');
            } else {
                el.classList.add('available');
            }

            // Selection state logic
            const isOverlap = (isConfirmedIn && isConfirmedOut) || (isPendingIn && isPendingOut);

            if (isOverlap) {
                el.style.cursor = 'not-allowed';
                el.onclick = null;
            } else if (isConfirmedIn || isPendingIn) {
                // Checkout day for existing booking: user can END their stay here
                el.onclick = () => {
                    if (this.selectedCheckIn) {
                        this.selectDate(dateStr);
                    }
                };
                el.style.cursor = 'pointer'; 
            } else if (isConfirmedOut || isPendingOut) {
                // Check-in day for existing booking: user can START their stay here
                el.onclick = () => {
                    this.selectDate(dateStr);
                };
                el.style.cursor = 'pointer';
            } else if (isBooked || isOnRequest || el.classList.contains('past')) {
                // Fully booked internal night: NO selection allowed
                el.style.cursor = 'not-allowed';
                el.onclick = null;
            } else {
                el.style.cursor = 'pointer';
                el.onclick = () => this.selectDate(dateStr);
            }

            if (this.selectedCheckIn === dateStr || this.selectedCheckOut === dateStr) {
                el.classList.add('selected');
            } else if (this.selectedCheckIn && this.selectedCheckOut && dateStr > this.selectedCheckIn && dateStr < this.selectedCheckOut) {
                el.classList.add('in-range');
            }

            gridEl.appendChild(el);
        }
    },

    selectDate(dateStr) {
        if (!this.selectedCheckIn) {
            this.selectedCheckIn = dateStr;
            this.selectedCheckOut = null;
        } else if (!this.selectedCheckOut && dateStr > this.selectedCheckIn) {
            if (this.isRangeValid(this.selectedCheckIn, dateStr)) {
                this.selectedCheckOut = dateStr;
            } else {
                // Invalid range
                this.selectedCheckIn = dateStr;
                this.selectedCheckOut = null;
            }
        } else {
            // Reset
            this.selectedCheckIn = dateStr;
            this.selectedCheckOut = null;
        }

        this.renderAll();
    },

    isRangeValid(startStr, endStr) {
        let current = new Date(startStr);
        current.setHours(12, 0, 0, 0);
        const end = new Date(endStr);
        end.setHours(12, 0, 0, 0);
        
        // Loop through all nights [start, end)
        while (current < end) {
            const str = this.formatDateLocal(current);
            if (this.bookedDates.includes(str) || this.onRequestDates.includes(str)) return false; 
            current.setDate(current.getDate() + 1);
        }
        return true;
    },

    updateContinueButton() {
        if (!this.continueBtn) return;
        
        const isValid = this.selectedCheckIn && 
                        this.selectedCheckOut && 
                        this.isRangeValid(this.selectedCheckIn, this.selectedCheckOut);

        const pricePreview = document.getElementById('step1-price-preview');

        if (isValid) {
            this.continueBtn.classList.remove('disabled');
            
            // Calculate base cost and show preview
            const costs = this.calculateCosts();
            if (costs && pricePreview) {
                const formattedPrice = this.fmtEUR(costs.total);
                pricePreview.innerHTML = `Vanaf <span style="font-size: 1.25rem;">${formattedPrice}</span><br><span style="font-size: 0.75rem; font-weight: 400; opacity: 0.8;">o.b.v. 2 personen</span>`;
                pricePreview.style.display = 'block';
            }
        } else {
            this.continueBtn.classList.add('disabled');
            if (pricePreview) {
                pricePreview.style.display = 'none';
            }
        }
    }
};

window.GipfelBooking = GipfelBooking;

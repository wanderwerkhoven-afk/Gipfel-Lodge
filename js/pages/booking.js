/**
 * Booking Page Calendar Logic (Redesign for Double Month View)
 */

const GipfelBooking = {
    currentDate: new Date(),
    selectedCheckIn: null,
    selectedCheckOut: null,
    
    // Real Pricing Data
    pricingData: {}, // Map of 'YYYY-MM-DD' to price object
    
    // Mock Availability Data
    bookedDates: ['2026-03-20', '2026-03-21', '2026-04-10', '2026-04-11'],
    onRequestDates: ['2026-03-25', '2026-03-26'],

    currentStep: 1,

    init() {
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

                try {
                    // --- Gather raw form values ---
                    const userName   = document.getElementById('b-name').value;
                    const userEmail  = document.getElementById('b-email').value;
                    const userPhone  = document.getElementById('b-phone').value || '-';
                    const checkIn    = document.getElementById('b-checkin').value;
                    const checkOut   = document.getElementById('b-checkout').value;
                    const adults     = document.getElementById('b-adults').value;
                    const children   = document.getElementById('b-children').value;
                    const babies     = document.getElementById('b-babies').value;
                    const message    = document.getElementById('b-message').value || '-';

                    // --- Calculate derived values ---
                    const msPerDay   = 1000 * 60 * 60 * 24;
                    const nights     = Math.round((new Date(checkOut) - new Date(checkIn)) / msPerDay);
                    const totalGuests = parseInt(adults) + parseInt(children) + parseInt(babies);

                    const now         = new Date();
                    const receivedDate = now.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
                    const receivedTime = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

                    // --- Guest confirmation e-mail params ---
                    guestParams = {
                        user_name:           userName,
                        user_email:          userEmail,
                        user_phone:          userPhone,
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

                    // Send both emails in parallel for speed
                    const [guestResponse, ownerResponse] = await Promise.all([
                        // 1. Confirmation e-mail to the guest
                        emailjs.send(
                            'service_rl6qzmr',
                            'template_3029w4q',   // <-- guest template ID
                            guestParams,
                            'WC62OFB5MXpryYO1u'
                        ),
                        // 2. Notification e-mail to the owner
                        emailjs.send(
                            'service_rl6qzmr',
                            'template_d5cqatd',
                            ownerParams,
                            'WC62OFB5MXpryYO1u'
                        ),
                    ]);

                    console.log("Guest email sent:", guestResponse.status);
                    console.log("Owner email sent:", ownerResponse.status);
                    this.goToStep(4);

                } catch (error) {
                    console.error("Detailed EmailJS Error:", error);

                    let errorMsg = "Fout bij verzenden:";
                    if (error.status === 400) errorMsg = "EmailJS Error 400: Controleer je Service of Template ID.";
                    else if (error.status === 401) errorMsg = "EmailJS Error 401: Public Key is ongeldig.";
                    else if (error.status === 403) errorMsg = "EmailJS Error 403: Domein niet toegestaan of limiet bereikt.";
                    else errorMsg += " " + (error.message || error.text || "Onbekende fout");

                    alert(errorMsg + "\n\nTip: Bekijk de Console (F12) voor de volledige foutcode.");
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
    },

    renderSummary() {
        const summaryGrid = document.getElementById('booking-summary-content');
        if (!summaryGrid) return;

        const name = document.getElementById('b-name').value;
        const email = document.getElementById('b-email').value;
        const phone = document.getElementById('b-phone').value || '-';
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
            
            // Render price if available
            let priceVal = 485; // Fallback
            if (this.pricingData[dateStr] && this.pricingData[dateStr].dagprijs) {
                priceVal = Math.round(this.pricingData[dateStr].dagprijs);
            }
            
            const fromText = window.i18n ? window.i18n.t('cal-price-from') : 'ab';
            const priceHtml = `<span class="cal-day-price"><span class="price-from">${fromText}</span> €${priceVal},-</span>`;
            
            // Structured content for all days to keep alignment
            el.innerHTML = `
                <span class="cal-day-num">${i}</span>
                ${priceHtml}
            `;
            
            // Logic state
            if (cellDate < today) {
                el.classList.add('booked');
                el.classList.add('past');
            } else if (this.bookedDates.includes(dateStr)) {
                el.classList.add('booked');
            } else if (this.onRequestDates.includes(dateStr)) {
                el.classList.add('on-request');
                el.onclick = () => this.selectDate(dateStr);
            } else {
                el.classList.add('available');
                el.onclick = () => this.selectDate(dateStr);
            }

            // Selection state
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
        const end = new Date(endStr);
        
        while (current <= end) {
            const str = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            if (this.bookedDates.includes(str)) return false; // Block range if a booked day is inside
            current.setDate(current.getDate() + 1);
        }
        return true;
    },

    updateContinueButton() {
        if (!this.continueBtn) return;
        if (this.selectedCheckIn && this.selectedCheckOut) {
            this.continueBtn.classList.remove('disabled');
        } else {
            this.continueBtn.classList.add('disabled');
        }
    }
};

window.GipfelBooking = GipfelBooking;

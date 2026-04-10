/* MODULE: Email */
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


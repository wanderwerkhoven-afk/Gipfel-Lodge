/**
 * Gipfel Lodge Invoice Generator
 * Utility to populate the branded HTML invoice template with dynamic booking data.
 */

export const InvoiceGenerator = {
    /**
     * Generates a fully populated HTML string for an invoice.
     * @param {Object} data - The booking/invoice data object.
     * @param {string} templateHTML - The raw HTML content of the invoice_template.html.
     * @returns {string} - The populated HTML string.
     */
    generateHTML(data, templateHTML) {
        if (!data || !templateHTML) {
            console.error("InvoiceGenerator: Missing data or template.");
            return "";
        }

        // Format Currency Helper
        const fmtEUR = (val) => {
            return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(val || 0);
        };

        // 1. Generate Rows for the Table
        let itemRows = "";
        
        // Rent Row
        itemRows += `
            <tr>
                <td>Rent (${data.nights || 0} nights)</td>
                <td class="amount-col">${fmtEUR(data.rent)}</td>
            </tr>
        `;
        
        // Discount Row
        if (data.discountAmount > 0) {
            itemRows += `
                <tr style="color: #2e7d32; font-weight: 500;">
                    <td>Korting -${data.discountPercentage}%</td>
                    <td class="amount-col">-${fmtEUR(data.discountAmount)}</td>
                </tr>
            `;
        }

        // Cleaning Row
        if (data.cleaning > 0) {
            itemRows += `
                <tr>
                    <td>Final cleaning</td>
                    <td class="amount-col">${fmtEUR(data.cleaning)}</td>
                </tr>
            `;
        }

        // Bed Linen Row
        if (data.bedLinen > 0) {
            itemRows += `
                <tr>
                    <td>Bed linen</td>
                    <td class="amount-col">${fmtEUR(data.bedLinen)}</td>
                </tr>
            `;
        }

        // Tourist Tax Row
        if (data.touristTax > 0) {
            itemRows += `
                <tr>
                    <td>Tourist tax</td>
                    <td class="amount-col">${fmtEUR(data.touristTax)}</td>
                </tr>
            `;
        }

        // Mobility Fee Row
        if (data.mobilityFee > 0) {
            itemRows += `
                <tr>
                    <td>Mobility fee</td>
                    <td class="amount-col">${fmtEUR(data.mobilityFee)}</td>
                </tr>
            `;
        }

        // 2. Calculate Deposit and Balance (30% / 70%)
        const total = data.totalAmount || 0;
        const deposit = total * 0.3;
        const balance = total - deposit;

        // 3. Dynamic Payment Options HTML (Last Minute vs Regular)
        const checkInDate = data.checkIn ? new Date(data.checkIn) : null;
        const bookingDate = data.receivedDate
            ? new Date(data.receivedDate)
            : (data.createdAt && data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date());

        let paymentOptionsHTML = "";
        
        if (checkInDate && bookingDate) {
            checkInDate.setHours(0,0,0,0);
            bookingDate.setHours(0,0,0,0);
            const stdBalance = new Date(checkInDate);
            stdBalance.setDate(stdBalance.getDate() - 42); // 6 weken grens
            
            if (stdBalance < bookingDate) {
                // Last minute booking (binnen 6 weken)
                paymentOptionsHTML = `
        <div class="payment-options">
            <h3>Payment Overview</h3>
            <div class="option-grid">
                <div class="option-card highlight" style="flex: 1 1 100%;">
                    <span class="option-title">Full Payment Required</span>
                    <span class="option-amount">${fmtEUR(total)}</span>
                    <p class="option-note">Because your arrival is within 6 weeks, the full amount must be paid immediately to confirm your booking.</p>
                </div>
            </div>
            <p class="payment-deadline">Please transfer the amount of <strong>${fmtEUR(total)}</strong> to our account within 3 days.</p>
        </div>`;
            } else {
                // Regular
                paymentOptionsHTML = `
        <div class="payment-options">
            <h3>Payment Overview</h3>
            <div class="option-grid">
                <div class="option-card">
                    <span class="option-title">Option 1: Down Payment (30%)</span>
                    <span class="option-amount">${fmtEUR(deposit)}</span>
                    <p class="option-note">To be paid immediately to confirm.</p>
                </div>
                <div class="option-card highlight">
                    <span class="option-title">Option 2: Full Amount</span>
                    <span class="option-amount">${fmtEUR(total)}</span>
                    <p class="option-note">Pay the full amount at once.</p>
                </div>
            </div>
            <p class="payment-deadline">If you choose the down payment, the remaining balance of <strong>${fmtEUR(balance)}</strong> must be paid at least 6 weeks prior to arrival.</p>
        </div>`;
            }
        } else {
            // Fallback (e.g. invalid dates)
            paymentOptionsHTML = `
        <div class="payment-options">
            <h3>Payment Overview</h3>
            <div class="option-grid">
                <div class="option-card highlight">
                    <span class="option-title">Full Amount</span>
                    <span class="option-amount">${fmtEUR(total)}</span>
                    <p class="option-note">Please see payment terms.</p>
                </div>
            </div>
        </div>`;
        }

        // 4. Perform Placeholder Replacements
        let html = templateHTML;

        // Helper to get formatted country name
        const getCountryName = (val) => {
            if (!val) return "—";
            const codes = {
                'nl': 'Nederland', 'be': 'België', 'de': 'Duitsland', 'at': 'Oostenrijk',
                'ch': 'Zwitserland', 'fr': 'Frankrijk', 'it': 'Italië', 'gb': 'UK', 'uk': 'UK',
                'es': 'Spanje', 'dk': 'Denemarken', 'se': 'Zweden', 'no': 'Noorwegen'
            };
            const clean = val.toLowerCase().trim();
            return codes[clean] || val;
        };

        // Exact mapping to match the Firestore document keys from booking.js and Excel Imports
        const mapping = {
            "{{invoiceId}}": data.invoiceId || data.bookingId || "—",
            "{{bookingId}}": data.bookingId || "—",
            "{{receivedDate}}": data.receivedDate || new Date().toLocaleDateString('nl-NL'),
            "{{guestName}}": data.guestName || "—",
            "{{guestEmail}}": data.guestEmail || "—",
            "{{guestAddress}}": data.guestAddress || "—",
            "{{guestZipcode}}": data.guestZipcode || "",
            "{{guestCity}}": data.guestCity || "—",
            "{{guestCountry}}": getCountryName(data.guestCountry || data.country),
            "{{checkIn}}": data.checkIn || "—",
            "{{checkOut}}": data.checkOut || "—",
            "{{nights}}": data.nights || 0,
            "{{adults}}": data.adults || 0,
            "{{children}}": data.children || 0,
            "{{babies}}": data.babies || 0,
            "{{itemRows}}": itemRows,
            "{{totalAmount}}": fmtEUR(total),
            "{{depositAmount}}": fmtEUR(deposit),
            "{{balanceAmount}}": fmtEUR(balance),
            "{{paymentOptionsHTML}}": paymentOptionsHTML
        };

        for (const [placeholder, value] of Object.entries(mapping)) {
            // Using split/join instead of replaceAll for broader compatibility if needed
            html = html.split(placeholder).join(value);
        }

        return html;
    }
};

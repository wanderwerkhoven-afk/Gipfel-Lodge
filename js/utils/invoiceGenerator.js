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
                <td>Huur (${data.nights || 0} nachten)</td>
                <td class="amount-col">${fmtEUR(data.rent)}</td>
            </tr>
        `;

        // Cleaning Row
        if (data.cleaning > 0) {
            itemRows += `
                <tr>
                    <td>Eindschoonmaak</td>
                    <td class="amount-col">${fmtEUR(data.cleaning)}</td>
                </tr>
            `;
        }

        // Bed Linen Row
        if (data.bedLinen > 0) {
            itemRows += `
                <tr>
                    <td>Bedlinnen</td>
                    <td class="amount-col">${fmtEUR(data.bedLinen)}</td>
                </tr>
            `;
        }

        // Tourist Tax Row
        if (data.touristTax > 0) {
            itemRows += `
                <tr>
                    <td>Toeristenbelasting</td>
                    <td class="amount-col">${fmtEUR(data.touristTax)}</td>
                </tr>
            `;
        }

        // Mobility Fee Row
        if (data.mobilityFee > 0) {
            itemRows += `
                <tr>
                    <td>Mobiliteitsheffing</td>
                    <td class="amount-col">${fmtEUR(data.mobilityFee)}</td>
                </tr>
            `;
        }

        // 2. Calculate Deposit and Balance (30% / 70%)
        const total = data.totalAmount || 0;
        const deposit = total * 0.3;
        const balance = total - deposit;

        // 3. Perform Placeholder Replacements
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
            "{{balanceAmount}}": fmtEUR(balance)
        };

        for (const [placeholder, value] of Object.entries(mapping)) {
            // Using split/join instead of replaceAll for broader compatibility if needed
            html = html.split(placeholder).join(value);
        }

        return html;
    }
};

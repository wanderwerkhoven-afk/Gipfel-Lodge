import { InvoiceGenerator } from './invoiceGenerator.js';

// --- Sample Data ---
const testBooking = {
    bookingId: "GPL-2026-0012",
    receivedDate: "05-04-2026",
    guestName: "Wander Werkhoven",
    guestAddress: "LuxeStraat 123",
    guestZipCity: "1082 MK Amsterdam",
    guestCountry: "Nederland",
    checkIn: "2026-12-20",
    checkOut: "2026-12-27",
    nights: 7,
    adults: 6,
    children: 2,
    babies: 1,
    rent: 2450.00,
    cleaning: 350.00,
    bedLinen: 167.60, // 8 * 20.95
    touristTax: 140.00, // 8 * 7 * 2.50
    mobilityFee: 28.00, // 8 * 7 * 0.50
    totalAmount: 3135.60
};

// --- Mocking template fetch ---
const mockTemplate = `
<!DOCTYPE html>
<html>
<body>
    <h1>Factuur #{{invoiceNumber}}</h1>
    <p>Gast: {{guestName}}</p>
    <table>{{itemRows}}</table>
    <p>Totaal: {{totalAmount}}</p>
</body>
</html>
`;

const result = InvoiceGenerator.generateHTML(testBooking, mockTemplate);
console.log("--- TEST INVOICE GENERATED ---");
console.log(result);

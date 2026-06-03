import { InvoiceGenerator } from './invoiceGenerator.js';

/**
 * Gipfel Lodge PDF Generator
 * Professional utility to generate A4 invoice PDFs from HTML templates.
 */
export const PDFGenerator = {
    /**
     * Generates a PDF Blob for a given booking.
     * @param {Object} bookingData - The booking document data.
     * @returns {Promise<Blob>} - A promise that resolves to a PDF Blob.
     */
    async generateInvoiceBlob(bookingData) {
        console.log("PDFGenerator: Starting generation for", bookingData.id);

        // 1. Fetch the invoice template
        const response = await fetch('templates/invoice_template.html');
        if (!response.ok) throw new Error("Could not load invoice template.");
        const templateHTML = await response.text();

        // 2. Populate the HTML
        const populatedHTML = InvoiceGenerator.generateHTML(bookingData, templateHTML);

        // 3. Create a high-fidelity rendering container
        const container = document.createElement('div');
        container.id = 'pdf-render-temp-container';
        
        // Hide it from the user but keep it in the DOM for rendering
        Object.assign(container.style, {
            position: 'absolute',
            left: '-10000px',
            top: '0',
            width: '210mm', // A4 Width
            background: 'white',
            padding: '20mm', // Standard margins
            boxSizing: 'border-box'
        });

        container.innerHTML = populatedHTML;
        document.body.appendChild(container);

        try {
            // 4. Capture with html2canvas
            // We use a high scale (3x) for crisp text and graphics
            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: container.offsetWidth
            });

            // 5. Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Add image to handle multi-page if necessary (though our template is optimized for 1 page)
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            // 6. Return as Blob
            return pdf.output('blob');

        } catch (error) {
            console.error("PDFGenerator Error:", error);
            throw error;
        } finally {
            // Clean up
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
    }
};

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your Firebase service account key
// WARNING: Do not upload this file to the public website
const serviceAccountPath = './serviceAccount.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error("Please place your Firebase serviceAccount.json in the same directory or update the path.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const EXPORT_DIR = path.join(__dirname, 'seo-export');

async function exportPages() {
    console.log("Exporting published SEO pages...");

    if (!fs.existsSync(EXPORT_DIR)) {
        fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }

    try {
        const snapshot = await db.collection('seo_pages')
            .where('status', '==', 'published')
            .get();

        const pages = [];
        snapshot.forEach(doc => {
            pages.push({ id: doc.id, ...doc.data() });
        });

        // Group by domain
        const byDomain = {};
        pages.forEach(p => {
            if (!byDomain[p.domain]) byDomain[p.domain] = [];
            byDomain[p.domain].push(p);
        });

        for (const [domain, domainPages] of Object.entries(byDomain)) {
            const filePath = path.join(EXPORT_DIR, `${domain}-seo-pages.json`);
            fs.writeFileSync(filePath, JSON.stringify(domainPages, null, 2));
            console.log(`Exported ${domainPages.length} pages for ${domain} to ${filePath}`);
        }

        const allPath = path.join(EXPORT_DIR, `all-seo-pages.json`);
        fs.writeFileSync(allPath, JSON.stringify(pages, null, 2));
        console.log(`Exported total ${pages.length} published pages to ${allPath}`);

        console.log("Export complete!");
        process.exit(0);
    } catch (err) {
        console.error("Export failed:", err);
        process.exit(1);
    }
}

exportPages();

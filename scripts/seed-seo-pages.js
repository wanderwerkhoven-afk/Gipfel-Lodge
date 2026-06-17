const admin = require('firebase-admin');
const fs = require('fs');

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

const seedPages = [
    // Nederlands
    { marketKey: 'nl', slug: 'luxe-chalet-oostenrijk' },
    { marketKey: 'nl', slug: 'vakantiehuis-flachau' },
    { marketKey: 'nl', slug: 'wintersport-ski-amade' },
    { marketKey: 'nl', slug: 'chalet-met-sauna-oostenrijk' },
    { marketKey: 'nl', slug: 'familievakantie-oostenrijk' },
    
    // Duits
    { marketKey: 'de', slug: 'luxus-chalet-oesterreich' },
    { marketKey: 'de', slug: 'ferienhaus-flachau' },
    { marketKey: 'de', slug: 'skiurlaub-ski-amade' },
    { marketKey: 'de', slug: 'chalet-mit-sauna-oesterreich' },
    { marketKey: 'de', slug: 'urlaub-salzburgerland' },
    
    // Oostenrijk
    { marketKey: 'at', slug: 'luxus-chalet-salzburgerland' },
    { marketKey: 'at', slug: 'urlaub-eben-im-pongau' },
    { marketKey: 'at', slug: 'chalet-nahe-flachau' },
    { marketKey: 'at', slug: 'skiurlaub-salzburger-sportwelt' },
    { marketKey: 'at', slug: 'ferienhaus-pongau' },
    
    // Internationaal / Engels
    { marketKey: 'eu', slug: 'luxury-chalet-austria' },
    { marketKey: 'eu', slug: 'ski-holiday-austria' },
    { marketKey: 'eu', slug: 'luxury-lodge-alps' },
    { marketKey: 'eu', slug: 'chalet-near-flachau' },
    { marketKey: 'eu', slug: 'mountain-retreat-austria' }
];

const domainMap = {
    'nl': 'gipfellodge.nl',
    'de': 'gipfellodge.de',
    'at': 'gipfellodge.at',
    'eu': 'gipfellodge.eu'
};

const localeMap = {
    'nl': 'nl-NL',
    'de': 'de-DE',
    'at': 'de-AT',
    'eu': 'en'
};

async function seed() {
    console.log("Seeding SEO pages as drafts...");
    
    let count = 0;
    
    for (const page of seedPages) {
        const docId = `${page.marketKey}__${page.slug}`;
        const docRef = db.collection('seo_pages').doc(docId);
        
        const existing = await docRef.get();
        if (!existing.exists) {
            await docRef.set({
                marketKey: page.marketKey,
                locale: localeMap[page.marketKey],
                domain: domainMap[page.marketKey],
                pageId: page.slug,
                type: 'landing',
                status: 'draft',
                path: `/${page.slug}`,
                slug: page.slug,
                title: `${page.slug.replace(/-/g, ' ')} | Gipfel Lodge`,
                metaDescription: '',
                h1: page.slug.replace(/-/g, ' ').toUpperCase(),
                intro: '',
                contentBlocks: [],
                faq: [],
                translations: {},
                noindex: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Created draft: ${docId}`);
            count++;
        } else {
            console.log(`Skipped existing: ${docId}`);
        }
    }
    
    console.log(`\nDone! Created ${count} new draft pages.`);
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});

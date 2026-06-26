const HOME_PAGE_GROUPS = [
    {
        title: 'Hero',
        fields: [
            { id: 'hero-eyebrow', label: 'Eyebrow' },
            { id: 'hero-description', label: 'Beschrijving' },
            [
                { id: 'hero-btn-explore', label: 'Knop - Ontdekken' },
                { id: 'hero-btn-availability', label: 'Knop - Beschikbaarheid' },
                { id: 'hero-btn-book', label: 'Knop - Boeken' }
            ]
        ]
    },
    {
        title: 'Intro',
        fields: [
            { id: 'intro-title', label: 'Titel' },
            { id: 'intro-description-1', label: 'Alinea 1' },
            { id: 'intro-description-2', label: 'Alinea 2' }
        ]
    },
    {
        title: 'Highlights',
        fields: [
            [
                { id: 'highlights-area', label: 'Oppervlakte (135m2)' },
                { id: 'highlights-capacity', label: 'Capaciteit (10 pers.)' }
            ],
            [
                { id: 'highlights-bedrooms', label: 'Slaapkamers/Badkamers' },
                { id: 'highlights-sauna', label: 'Sauna' }
            ],
            [
                { id: 'highlights-view', label: 'Uitzicht' },
                { id: 'highlights-location', label: 'Nabij Flachau' }
            ]
        ]
    },
    {
        title: 'Gallery',
        fields: [
            { id: 'gallery-living', label: 'Foto - Wonen' },
            { id: 'gallery-dining', label: 'Foto - Genieten' },
            { id: 'gallery-outdoor', label: 'Foto - Ontspannen' },
            { id: 'gallery-wellness', label: 'Foto - Buiten' },
            { id: 'gallery-details', label: 'Foto - Wellness' },
            { id: 'gallery-view', label: 'Foto - Details' }
        ]
    },
    {
        title: 'Zomer',
        fields: [
            { id: 'summer-title', label: 'Titel Zomer' },
            { id: 'summer-description', label: 'Beschrijving Zomer' },
            { id: 'summer-button', label: 'Knop - Zomer Ontdekken' }
        ]
    },
    {
        title: 'Winter',
        fields: [
            { id: 'winter-title', label: 'Titel Winter' },
            { id: 'winter-description', label: 'Beschrijving Winter' },
            { id: 'winter-button', label: 'Knop - Winter Ontdekken' }
        ]
    },
    {
        title: 'Experience',
        fields: [
            { id: 'experience-main-title', label: 'Hoofdtitel' },
            { id: 'experience-ski-title', label: 'Titel - Skiën' },
            { id: 'experience-ski-description', label: 'Beschrijving - Skiën' },
            { id: 'experience-hiking-title', label: 'Titel - Wandelen' },
            { id: 'experience-hiking-description', label: 'Beschrijving - Wandelen' },
            { id: 'experience-sauna-title', label: 'Titel - Sauna' },
            { id: 'experience-sauna-description', label: 'Beschrijving - Sauna' },
            { id: 'experience-nature-title', label: 'Titel - Natuur' },
            { id: 'experience-nature-description', label: 'Beschrijving - Natuur' },
            { id: 'experience-activities-title', label: 'Titel - Activiteiten' },
            { id: 'experience-activities-description', label: 'Beschrijving - Activiteiten' }
        ]
    },
    {
        title: 'Features',
        fields: [
            [
                { id: 'feature-kitchen', label: 'Keuken' },
                { id: 'feature-winecooler', label: 'Wijnklimaatkast' },
                { id: 'feature-sauna', label: 'Privé Sauna' },
                { id: 'feature-floorheating', label: 'Vloerverwarming' }
            ],
            [
                { id: 'feature-fireplace', label: 'Openhaard' },
                { id: 'feature-parking', label: 'Parkeerplekken' },
                { id: 'feature-balcony', label: 'Balkon' },
                { id: 'feature-breadservice', label: 'Broodjesservice' }
            ]
        ]
    },
    {
        title: 'Locatie',
        fields: [
            { id: 'location-label', label: 'Label' },
            { id: 'location-title', label: 'Titel' },
            { id: 'location-description', label: 'Beschrijving' },
            [
                { id: 'location-distance-ski-time', label: 'Tijd tot Ski' },
                { id: 'location-distance-ski-label', label: 'Label - Skigebied' }
            ],
            [
                { id: 'location-distance-flachau-time', label: 'Tijd tot Flachau' },
                { id: 'location-distance-flachau-label', label: 'Label - Flachau' }
            ],
            [
                { id: 'location-distance-airport-time', label: 'Tijd tot Vliegveld' },
                { id: 'location-distance-airport-label', label: 'Label - Vliegveld' }
            ]
        ]
    },
    {
        title: 'Reviews',
        fields: [
            { id: 'testi-v3-title', label: 'Titel Reviews' },
            { id: 'review-source', label: 'Platform (bijv. via Airbnb)' },
            { id: 'review-1-text', label: 'Review 1 - Tekst' },
            { id: 'review-1-name', label: 'Review 1 - Naam' },
            { id: 'review-1-flag', label: 'Review 1 - Vlag Emoji' },
            { id: 'review-2-text', label: 'Review 2 - Tekst' },
            { id: 'review-2-name', label: 'Review 2 - Naam' },
            { id: 'review-2-flag', label: 'Review 2 - Vlag Emoji' },
            { id: 'review-3-text', label: 'Review 3 - Tekst' },
            { id: 'review-3-name', label: 'Review 3 - Naam' },
            { id: 'review-3-flag', label: 'Review 3 - Vlag Emoji' },
            { id: 'review-4-text', label: 'Review 4 - Tekst' },
            { id: 'review-4-name', label: 'Review 4 - Naam' },
            { id: 'review-4-flag', label: 'Review 4 - Vlag Emoji' },
            { id: 'review-5-text', label: 'Review 5 - Tekst (laat "-" staan om te verbergen)' },
            { id: 'review-5-name', label: 'Review 5 - Naam' },
            { id: 'review-5-flag', label: 'Review 5 - Vlag Emoji' },
            { id: 'review-6-text', label: 'Review 6 - Tekst (laat "-" staan om te verbergen)' },
            { id: 'review-6-name', label: 'Review 6 - Naam' },
            { id: 'review-6-flag', label: 'Review 6 - Vlag Emoji' },
            { id: 'review-7-text', label: 'Review 7 - Tekst (laat "-" staan om te verbergen)' },
            { id: 'review-7-name', label: 'Review 7 - Naam' },
            { id: 'review-7-flag', label: 'Review 7 - Vlag Emoji' },
            { id: 'review-8-text', label: 'Review 8 - Tekst (laat "-" staan om te verbergen)' },
            { id: 'review-8-name', label: 'Review 8 - Naam' },
            { id: 'review-8-flag', label: 'Review 8 - Vlag Emoji' },
            { id: 'review-9-text', label: 'Review 9 - Tekst (laat "-" staan om te verbergen)' },
            { id: 'review-9-name', label: 'Review 9 - Naam' },
            { id: 'review-9-flag', label: 'Review 9 - Vlag Emoji' },
            { id: 'review-10-text', label: 'Review 10 - Tekst (laat "-" staan om te verbergen)' },
            { id: 'review-10-name', label: 'Review 10 - Naam' },
            { id: 'review-10-flag', label: 'Review 10 - Vlag Emoji' }
        ]
    },
    {
        title: 'FAQ',
        fields: [
            { id: 'faq-label', label: 'Label' },
            { id: 'faq-title', label: 'Titel' },
            { id: 'faq-1-question', label: 'Vraag 1' },
            { id: 'faq-1-answer', label: 'Antwoord 1' },
            { id: 'faq-2-question', label: 'Vraag 2' },
            { id: 'faq-2-answer', label: 'Antwoord 2' },
            { id: 'faq-3-question', label: 'Vraag 3' },
            { id: 'faq-3-answer', label: 'Antwoord 3' },
            { id: 'faq-4-question', label: 'Vraag 4' },
            { id: 'faq-4-answer', label: 'Antwoord 4' },
            { id: 'faq-5-question', label: 'Vraag 5' },
            { id: 'faq-5-answer', label: 'Antwoord 5' }
        ]
    },
    {
        title: 'Booking CTA',
        fields: [
            { id: 'booking-title', label: 'Titel' },
            { id: 'booking-description', label: 'Beschrijving' },
            [
                { id: 'booking-button-availability', label: 'Knop - Beschikbaarheid' },
                { id: 'booking-button-book', label: 'Knop - Boeken' }
            ]
        ]
    }
];



const LODGE_PAGE_GROUPS = [
    {
        title: 'Hero Gallery',
        fields: [
            [
                { id: 'gallery-btn-photos', label: "Knop - Foto's" },
                { id: 'gallery-btn-share', label: 'Knop - Delen' },
                { id: 'gallery-btn-favorite', label: 'Knop - Favorieten' }
            ]
        ]
    },
    {
        title: 'Eigenschappen Lint',
        fields: [
            [
                { id: 'lodge-max-guests', label: 'Gasten' },
                { id: 'lodge-bedrooms', label: 'Slaapkamers' },
                { id: 'lodge-bathrooms', label: 'Badkamers' },
                { id: 'lodge-area', label: 'Oppervlakte' }
            ]
        ]
    },
    {
        title: 'Intro Block',
        fields: [
            { id: 'lodge-highlights-title', label: 'Eyebrow (Alpine Luxury)' },
            { id: 'lodge-title', label: 'Titel' },
            { id: 'lodge-about-text', label: 'Beschrijving' }
        ]
    },
    {
        title: 'Wellness Block',
        fields: [
            { id: 'lodge-sauna-tag', label: 'Eyebrow (Wellness & Ontspanning)' },
            { id: 'lodge-sauna-title', label: 'Titel' },
            { id: 'lodge-sauna-text', label: 'Beschrijving' }
        ]
    },
    {
        title: 'Indeling',
        fields: [
            { id: 'lodge-indeling-tag', label: 'Eyebrow (Woonconcept)' },
            { id: 'lodge-indeling-title', label: 'Titel' },
            { id: 'lodge-indeling-subtitle', label: 'Ondertitel' },
            { id: 'lodge-ug', label: 'Verdieping 1 (Begane Grond) - Titel' },
            { id: 'lodge-ug-list-1', label: 'Verdieping 1 - Item 1' },
            { id: 'lodge-ug-list-2', label: 'Verdieping 1 - Item 2' },
            { id: 'lodge-ug-list-3', label: 'Verdieping 1 - Item 3' },
            { id: 'lodge-1og', label: 'Verdieping 2 (1e Etage) - Titel' },
            { id: 'lodge-1og-list-1', label: 'Verdieping 2 - Item 1' },
            { id: 'lodge-1og-list-2', label: 'Verdieping 2 - Item 2' },
            { id: 'lodge-1og-list-3', label: 'Verdieping 2 - Item 3' },
            { id: 'lodge-2og', label: 'Verdieping 3 (2e Etage) - Titel' },
            { id: 'lodge-2og-list-1', label: 'Verdieping 3 - Item 1' },
            { id: 'lodge-2og-list-2', label: 'Verdieping 3 - Item 2' },
            { id: 'lodge-2og-list-3', label: 'Verdieping 3 - Item 3' }
        ]
    },
    {
        title: 'Galerij Sectie',
        fields: [
            { id: 'gallery-tag', label: 'Eyebrow (Impressies)' },
            { id: 'gallery-title', label: 'Titel' }
        ]
    },
    {
        title: 'FAQ Lodge',
        fields: [
            { id: 'faq-lodge-label', label: 'Label' },
            { id: 'faq-lodge-title', label: 'Titel' },
            { id: 'faq-lodge-q1', label: 'Vraag 1' },
            { id: 'faq-lodge-a1', label: 'Antwoord 1' },
            { id: 'faq-lodge-q2', label: 'Vraag 2' },
            { id: 'faq-lodge-a2', label: 'Antwoord 2' },
            { id: 'faq-lodge-q3', label: 'Vraag 3' },
            { id: 'faq-lodge-a3', label: 'Antwoord 3' },
            { id: 'faq-lodge-q4', label: 'Vraag 4' },
            { id: 'faq-lodge-a4', label: 'Antwoord 4' },
            { id: 'faq-lodge-q5', label: 'Vraag 5' },
            { id: 'faq-lodge-a5', label: 'Antwoord 5' }
        ]
    },
    {
        title: 'Booking CTA',
        fields: [
            { id: 'lodge-cta-title', label: 'Titel' },
            { id: 'lodge-cta-subtitle', label: 'Beschrijving' },
            [
                { id: 'lodge-cta-b1', label: 'Knop - Beschikbaarheid' },
                { id: 'lodge-cta-b2', label: 'Knop - Boeken' }
            ]
        ]
    }
];

export { HOME_PAGE_GROUPS, LODGE_PAGE_GROUPS };

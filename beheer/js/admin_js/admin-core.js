        // --- HELPER FUNCTIONS ---
        function getCountryData(phone, bookingData = null) {
            // Priority 1: Use specific country code if available
            if (bookingData && bookingData.country) {
                const code = bookingData.country.toLowerCase();
                const names = {
                    'nl': 'Nederland', 'be': 'België', 'de': 'Duitsland', 'at': 'Oostenrijk',
                    'ch': 'Zwitserland', 'gb': 'UK', 'uk': 'UK', 'fr': 'Frankrijk',
                    'it': 'Italië', 'dk': 'Denemarken', 'se': 'Zweden', 'no': 'Noorwegen', 'es': 'Spanje'
                };
                if (names[code]) return { code: code, name: names[code] };
                return { code: code, name: bookingData.country }; // Fallback to raw code
            }

            // Priority 2: Use guestCountry name if available
            if (bookingData && bookingData.guestCountry) {
                const name = bookingData.guestCountry.toLowerCase();
                if (name.includes('nederland') || name === 'nl' || name.includes('netherlands')) return { code: 'nl', name: 'Nederland' };
                if (name.includes('belgi') || name === 'be') return { code: 'be', name: 'België' };
                if (name.includes('duits') || name === 'de' || name.includes('germany') || name === 'deutschland') return { code: 'de', name: 'Duitsland' };
                if (name.includes('oostenrijk') || name === 'at' || name.includes('austria')) return { code: 'at', name: 'Oostenrijk' };
                if (name.includes('zwitser') || name === 'ch' || name.includes('switzer')) return { code: 'ch', name: 'Zwitserland' };
                if (name.includes('frank') || name === 'fr' || name.includes('france')) return { code: 'fr', name: 'Frankrijk' };
                if (name.includes('itail') || name === 'it' || name.includes('italy')) return { code: 'it', name: 'Italië' };
                if (name.includes('uk') || name.includes('united kingdom') || name.includes('engeland') || name.includes('brit')) return { code: 'gb', name: 'UK' };
                if (name.includes('denemarken') || name === 'dk' || name.includes('denmark')) return { code: 'dk', name: 'Denemarken' };
                if (name.includes('zweden') || name === 'se' || name.includes('sweden')) return { code: 'se', name: 'Zweden' };
                if (name.includes('noorwegen') || name === 'no' || name.includes('norway')) return { code: 'no', name: 'Noorwegen' };
                if (name.includes('spanje') || name === 'es' || name.includes('spain')) return { code: 'es', name: 'Spanje' };
            }

            // Priority 3: Fallback to phone number detection
            if (!phone) return null;
            const p = phone.replace(/[^0-9+]/g, '');
            if (p.startsWith('+31')) return { code: 'nl', name: 'Nederland' };
            if (p.startsWith('+32')) return { code: 'be', name: 'België' };
            if (p.startsWith('+49')) return { code: 'de', name: 'Duitsland' };
            if (p.startsWith('+43')) return { code: 'at', name: 'Oostenrijk' };
            if (p.startsWith('+41')) return { code: 'ch', name: 'Zwitserland' };
            if (p.startsWith('+44')) return { code: 'gb', name: 'UK' };
            if (p.startsWith('+33')) return { code: 'fr', name: 'Frankrijk' };
            if (p.startsWith('+39')) return { code: 'it', name: 'Italië' };
            if (p.startsWith('+45')) return { code: 'dk', name: 'Denemarken' };
            if (p.startsWith('+46')) return { code: 'se', name: 'Zweden' };
            if (p.startsWith('+47')) return { code: 'no', name: 'Noorwegen' };
            if (p.startsWith('+34')) return { code: 'es', name: 'Spanje' };
            return null;
        }
        
        // --- PRICING DATA MANAGEMENT ---
        let adminPricingMaps = {
            old: {}, // From pricing_2026.json (before Feb 2nd 2026)
            new: {}  // From pricing_2027.json (after Feb 2nd 2026)
        };
        let adminPricingLoaded = false;

        function formatDateLocal(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        let activeDiscountPreset = null;

        async function loadAdminPricingData() {
            if (adminPricingLoaded) return;
            console.log("Loading Admin Pricing Data from Firebase...");
            try {
                const { db, collection, getDocs, getDoc, doc, query, orderBy } = await import('../site_js/core/firebase.js');
                const q = query(collection(db, 'pricing_versions'), orderBy('effectiveDate', 'asc'));
                const snap = await getDocs(q);
                
                const versions = [];
                snap.forEach(docSnap => {
                    versions.push({ id: docSnap.id, ...docSnap.data() });
                });

                if (versions.length === 0) {
                    console.warn("No pricing versions found in Firebase. Falling back to legacy JSONs.");
                    const [resOld, resNew] = await Promise.all([
                        fetch('pricing_sources/pricing_2026.json'),
                        fetch('pricing_sources/pricing_2027.json').catch(() => ({ ok: false }))
                    ]);
                    
                    if (resOld && resOld.ok) {
                        const data = await resOld.json();
                        data.forEach(item => { adminPricingMaps.old[item.datum] = item; });
                    }
                    if (resNew && resNew.ok) {
                        const data = await resNew.json();
                        data.forEach(item => { adminPricingMaps.new[item.datum] = item; });
                    }
                } else {
                    adminPricingMaps.versions = versions;
                    const today = new Date().toISOString().split('T')[0];
                    const activeVersion = [...versions].reverse().find(v => v.effectiveDate <= today) || versions[0];
                    
                    if (activeVersion) {
                        console.log("Active pricing version found:", activeVersion.effectiveDate);
                        adminPricingMaps.active = activeVersion.prices;
                        // Populate legacy maps to prevent breakage
                        adminPricingMaps.old = activeVersion.prices;
                        adminPricingMaps.new = activeVersion.prices;
                    }
                }

                // --- FETCH ACTIVE DISCOUNT PRESET ---
                try {
                    const settingsRef = doc(db, 'settings', 'pricing');
                    const settingsSnap = await getDoc(settingsRef);
                    if (settingsSnap.exists()) {
                        const activePresetId = settingsSnap.data().activePresetId;
                        if (activePresetId) {
                            const presetSnap = await getDoc(doc(db, 'discount_presets', activePresetId));
                            if (presetSnap.exists()) {
                                activeDiscountPreset = presetSnap.data();
                                console.log("Admin: Active discount preset loaded for import simulation:", activeDiscountPreset.name);
                            }
                        }
                    }
                } catch (discountErr) {
                    console.warn("Could not load discount settings for admin", discountErr);
                }

                adminPricingLoaded = true;
            } catch(e) {
                console.error("Error fetching admin pricing", e);
            }
        }

        function detectLanguage(phone, bookingData = null) {
            if (bookingData) {
                const countryData = getCountryData(phone, bookingData);
                if (countryData && countryData.code) {
                    const code = countryData.code.toLowerCase();
                    if (code === 'nl') return 'nl';
                    if (code === 'de' || code === 'at') return 'de';
                    return 'en';
                }
            }
            if (!phone) return 'en';
            const p = phone.replace(/[^0-9+]/g, '');
            if (p.startsWith('+49') || p.startsWith('+43') || p.startsWith('+41')) return 'de';
            if (p.startsWith('+31') || p.startsWith('+32')) return 'nl';
            return 'en';
        }

        // --- UI HELPERS ---
        function toggleMobileMenu() {
            const sidebar = document.getElementById('dashboard-sidebar');
            const overlay = document.getElementById('mobile-sidebar-overlay');
            const btnIcon = document.querySelector('#hamburger-btn i');
            
            if (!sidebar || !overlay) return;

            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            if (sidebar.classList.contains('active')) {
                btnIcon.className = 'ph ph-x';
                document.body.style.overflow = 'hidden';
            } else {
                btnIcon.className = 'ph ph-list';
                document.body.style.overflow = '';
            }
        }


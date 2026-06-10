// ./JS/core/dataManager.js
import { CONFIG, state, setState } from "./app.js";
import { db, collection, getDocs, query, orderBy } from "../../site_js/core/firebase.js";

/* ============================================================
 * 2) ROW HELPERS
 * ============================================================ */

export function getYears(rows = state.rawRows) {
  return [...new Set(rows.map(r => r.__aankomst.getFullYear()))]
    .sort((a, b) => a - b);
}

export function getRowsForYear(year, rows = state.rawRows) {
  return rows.filter(r => r.__aankomst.getFullYear() === year);
}

/* ============================================================
 * 3) PRICING (Firestore)
 * ============================================================ */

/**
 * Haalt de actieve pricing versie op uit Firebase
 */
export async function loadPricingYear(year) {
  try {
    const q = query(collection(db, 'pricing_versions'), orderBy('effectiveDate', 'asc'));
    const snap = await getDocs(q);
    const versions = [];
    
    snap.forEach(docSnap => {
        versions.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (versions.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        // Pak de laatst actieve versie, of de eerste als er geen in het verleden is
        const activeVersion = [...versions].reverse().find(v => v.effectiveDate <= today) || versions[0];
        
        // Converteer de map naar een array formaat of behoud het als een object.
        // Eerder verwachtte deze functie een array met { datum: '...', dagprijs: ... }
        if (activeVersion && activeVersion.prices) {
            return Object.keys(activeVersion.prices).map(dateKey => ({
                datum: dateKey,
                ...activeVersion.prices[dateKey]
            }));
        }
    }
    return [];
  } catch (err) {
      console.warn("Pricing data ophalen mislukt via Firebase.", err);
      return [];
  }
}

/**
 * Zorgt dat pricing geladen wordt en in state.pricingByDate gezet wordt
 */
export async function ensurePricingLoadedForYear(year) {
  if (
    state.pricingYearLoaded === year &&
    state.pricingByDate &&
    Object.keys(state.pricingByDate).length
  ) {
    return;
  }

  try {
    // We roepen loadPricingYear aan die in dit geval ALLE actieve pricing geeft
    const rows = await loadPricingYear(year);
    state.pricingByDate = Object.fromEntries(
      rows.map(r => [r.datum, r])
    );
    state.pricingYearLoaded = year;
  } catch (err) {
    console.warn(`Geen pricing voor jaar ${year}`, err);
    state.pricingByDate = {};
    state.pricingYearLoaded = year;
  }
}
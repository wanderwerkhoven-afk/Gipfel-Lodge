// ./JS/core/dataManager.js
import { CONFIG, state, setState } from "./app.js";

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
 * 3) PRICING (JSON per jaar)
 * ============================================================ */

/**
 * Laadt pricing JSON via een repo-safe pad
 */
export async function loadPricingYear(year) {
  // In de admin app staan de JSONs waarschijnlijk in /pricing_sources of dergelijke.
  // Aangezien dit lokaal werkte met ../../pricing_sources, moeten we het pad aanpassen.
  // In het admin paneel is er nog geen 'pricing_sources' map standaard gepubliceerd voor deze grafieken.
  // Voor nu simuleren we het met een leeg object als de fetch faalt, 
  // of we kunnen een hardcoded fallback maken om errors te vermijden als de backend al pricing levert.
  try {
      const url = `/pricing_sources/pricing_${year}.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Pricing file ontbreekt: ${url}`);
      }
      return res.json();
  } catch (err) {
      console.warn("Pricing file not found, defaulting to empty array.", err);
      return [];
  }
}

/**
 * Zorgt dat pricing één keer per jaar geladen wordt
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
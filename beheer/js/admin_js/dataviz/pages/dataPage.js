import { state } from "../core/app.js";
import { 
  euro, 
  fmtDateNL, 
  renderSimpleTable 
} from "../core/ui-helpers.js";

export const DataPage = {
  id: "data",
  title: "Data",
  template: () => `
    <div class="container slide-up">
      <div class="page-head">
        <div>
          <h2 class="page-title">Database Browser</h2>
          <p class="page-subtitle">Doorzoek en filter alle boekingen</p>
        </div>
      </div>

      <section class="content-section">
        <div class="search-panel" style="flex-wrap: wrap; gap: 15px;">
          <div class="search-box" style="flex: 1; min-width: 250px;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="dataSearchInput" placeholder="Zoek op gast, boeking of land..." />
          </div>
          
          <div class="filter-group" style="display: flex; gap: 10px;">
            <select id="dataFilterYear" class="form-control" style="width: auto; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel);">
              <option value="ALL">Alle jaren</option>
            </select>
            
            <select id="dataFilterType" class="form-control" style="width: auto; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel);">
              <option value="ALL">Alle Types</option>
              <option value="platform">Platform</option>
              <option value="owner">Eigenaar</option>
            </select>
            
            <select id="dataFilterChannel" class="form-control" style="width: auto; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel);">
              <option value="ALL">Alle Kanalen</option>
            </select>
          </div>

          <div id="dataCount" class="data-count" style="width: 100%; text-align: right; margin-top: 5px;"></div>
        </div>

        <div id="dataTableWrap" class="table-wrap"></div>
      </section>
    </div>
  `,
  init: async () => {
    renderDataTable();
    setupSearch();
  }
};

function setupSearch() {
  const input = document.getElementById("dataSearchInput");
  const yearSel = document.getElementById("dataFilterYear");
  const typeSel = document.getElementById("dataFilterType");
  const channelSel = document.getElementById("dataFilterChannel");

  if (!input || !yearSel || !typeSel || !channelSel) return;

  // Populate dynamic selects
  const raw = state.rawRows || [];
  
  // Years
  const years = new Set();
  const channels = new Set();
  
  raw.forEach(r => {
    if (r.__aankomst) years.add(new Date(r.__aankomst).getFullYear());
    const ch = (r.__bookingRaw || "").includes("|") ? r.__bookingRaw.split("|")[1].trim() : "";
    if (ch) channels.add(ch);
  });

  Array.from(years).sort((a,b)=>b-a).forEach(y => {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  });

  Array.from(channels).sort().forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    channelSel.appendChild(opt);
  });

  const update = () => {
    state.dataSearchQuery = input.value.toLowerCase();
    state.dataFilterYear = yearSel.value;
    state.dataFilterType = typeSel.value;
    state.dataFilterChannel = channelSel.value;
    renderDataTable();
  };

  input.addEventListener("input", update);
  yearSel.addEventListener("change", update);
  typeSel.addEventListener("change", update);
  channelSel.addEventListener("change", update);
}

/**
 * Renders the interactive data table
 */
export function renderDataTable() {
  const container = document.getElementById("dataTableWrap");
  const countEl = document.getElementById("dataCount");
  if (!container) return;

  if (!state.rawRows || state.rawRows.length === 0) {
    container.innerHTML = `<div class="empty-state">Geen data geladen. Gebruik de upload knop erboven.</div>`;
    if (countEl) countEl.textContent = "";
    return;
  }

  const query = state.dataSearchQuery || "";
  const filterYear = state.dataFilterYear || "ALL";
  const filterType = state.dataFilterType || "ALL";
  const filterChannel = state.dataFilterChannel || "ALL";

  const filtered = state.rawRows.filter(r => {
    // 1. Text Search
    const searchString = `${r.__guest} ${r.__bookingRaw} ${r.__countryCode} ${r.__email}`.toLowerCase();
    if (query && !searchString.includes(query)) return false;

    // 2. Year Filter
    if (filterYear !== "ALL") {
      const y = r.__aankomst ? new Date(r.__aankomst).getFullYear() : null;
      if (String(y) !== filterYear) return false;
    }

    // 3. Type Filter
    if (filterType !== "ALL") {
      const isOwner = !!r.__owner;
      if (filterType === "owner" && !isOwner) return false;
      if (filterType === "platform" && isOwner) return false;
    }

    // 4. Channel Filter
    if (filterChannel !== "ALL") {
      const ch = (r.__bookingRaw || "").includes("|") ? r.__bookingRaw.split("|")[1].trim() : "";
      if (ch !== filterChannel) return false;
    }

    return true;
  });

  if (countEl) countEl.textContent = `${filtered.length} boekingen gevonden`;

  const headers = [
    "Boeking", "Geboekt op", "Accommodatie", "Code",
    "Gast", "Email", "Telefoon", "Land",
    "Aankomst", "Vertrek", "Nachten",
    "Volw.", "Kind.", "Baby's", "Totaal", "Hsd.",
    "Bruto", "Netto", "Type", "Opmerking"
  ];

  const rows = filtered.map(r => [
    r.__bookingRaw        || "—",
    fmtDateNL(r.__bookedAt),
    r.__accomName         || "—",
    r.__accomCode         || "—",
    r.__guest             || "—",
    r.__email             || "—",
    r.__phone             || "—",
    r.__countryCode       || "—",
    fmtDateNL(r.__aankomst),
    fmtDateNL(r.__vertrek),
    r.__nights            ?? "—",
    r.__adults            ?? "—",
    r.__kids              ?? "—",
    r.__babies            ?? "—",
    r.__totalGuests       ?? "—",
    r.__pets              ?? "—",
    euro(r.__gross),
    euro(r.__net),
    r.__owner ? "🏠 Eigenaar" : "🌍 Platform",
    r.__note              || "—"
  ]);

  renderSimpleTable({
    container,
    headers,
    rows
  });
}

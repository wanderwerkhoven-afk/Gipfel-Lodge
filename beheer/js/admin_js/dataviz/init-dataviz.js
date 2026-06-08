import { fetchDatavizRows } from './admin-dataviz-adapter.js';
import { setState, state } from './core/app.js';
import { initGlobalUI } from './core/ui-helpers.js';
import { HomePage } from './pages/homePage.js';
import { OccupancyPage } from './pages/occupancyPage.js';
import { RevenuePage } from './pages/revenuePage.js';
import { BehaviorPage } from './pages/behaviorPage.js';
import { DataPage } from './pages/dataPage.js';
import { TodoPage } from './pages/todoPage.js';

let _isInitialized = false;

export async function initDataviz() {
    if (_isInitialized) return;
    _isInitialized = true;

    console.log("🚀 Init DataVisualisation...");

    // 1. Fetch live data from Firebase via the adapter
    const rows = await fetchDatavizRows();
    setState({ rawRows: rows });

    // 1b. Initialize global UI listeners (for dropdowns, etc)
    initGlobalUI();
    if (window.Chart) {
        window.Chart.defaults.color = "rgba(51, 65, 85, 0.7)";
    }

    // 2. Set default years
    const years = [...new Set(rows.map(r => r.__aankomst.getFullYear()))].sort((a, b) => b - a);
    if (years.length) {
        if (!state.currentYear || !years.includes(state.currentYear)) state.currentYear = years[0];
        if (!state.kpiYear || !years.includes(state.kpiYear)) state.kpiYear = years[0];
        if (!state.occupancyYear || !years.includes(state.occupancyYear)) state.occupancyYear = "ALL";
    }

    // 3. Inject Templates into DOM
    const views = [
        { id: 'dataviz-home-view', module: HomePage },
        { id: 'dataviz-occupancy-view', module: OccupancyPage },
        { id: 'dataviz-revenue-view', module: RevenuePage },
        { id: 'dataviz-behavior-view', module: BehaviorPage },
        { id: 'dataviz-data-view', module: DataPage },
        { id: 'dataviz-todo-view', module: TodoPage }
    ];

    views.forEach(v => {
        const el = document.getElementById(v.id);
        if (el) {
            el.innerHTML = v.module.template();
        }
    });

    console.log("✅ DataVisualisation HTML injected and ready.");
}

export async function initDatavizView(viewId) {
    // Zorg dat de basis is geladen
    await initDataviz();

    if (viewId === 'dataviz-home-view') await HomePage.init();
    else if (viewId === 'dataviz-occupancy-view') await OccupancyPage.init();
    else if (viewId === 'dataviz-revenue-view') await RevenuePage.init();
    else if (viewId === 'dataviz-behavior-view') await BehaviorPage.init();
    else if (viewId === 'dataviz-data-view') await DataPage.init();
    else if (viewId === 'dataviz-todo-view') await TodoPage.init();
}

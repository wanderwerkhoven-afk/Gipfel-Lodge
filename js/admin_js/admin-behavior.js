/**
 * MODULE: BEHAVIOR & ANALYTICS
 * Handles fetching and visualizing website traffic data.
 */

let behaviorChartDaily = null;
let behaviorChartPages = null;

async function loadBehaviorStats() {
    console.log("Loading Behavior Stats...");
    const recentList = document.getElementById('behavior-recent-list');
    
    try {
        const { db, collection, getDocs, query, orderBy, limit } = await import('../site_js/core/firebase.js');

        // Fetch last 1000 page views for analysis
        const q = query(collection(db, "page_views"), orderBy("timestamp", "desc"), limit(1000));
        const snap = await getDocs(q);

        const views = [];
        snap.forEach(doc => {
            const data = doc.data();
            views.push({ id: doc.id, ...data });
        });

        console.log(`Fetched ${views.length} views from Firebase.`);

        if (views.length === 0) {
            document.getElementById('stat-total-views').innerText = '0';
            document.getElementById('stat-unique-visitors').innerText = '0';
            document.getElementById('stat-top-page').innerText = '-';
            recentList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #94a3b8;">Nog geen gegevens beschikbaar.</td></tr>';
            return;
        }

        // --- 1. Process Stats ---
        const totalViews = views.length;
        document.getElementById('stat-total-views').innerText = totalViews;

        // Estimate unique visitors
        const uniqueSet = new Set();
        views.forEach(v => {
            const dateStr = v.timestamp && typeof v.timestamp.toDate === 'function' ? v.timestamp.toDate().toDateString() : 'no-date';
            const ua = v.userAgent || 'unknown-ua';
            uniqueSet.add(`${ua}-${dateStr}`);
        });
        document.getElementById('stat-unique-visitors').innerText = uniqueSet.size;

        // Top Page
        const pageCounts = {};
        views.forEach(v => {
            const pid = v.pageId || 'home';
            pageCounts[pid] = (pageCounts[pid] || 0) + 1;
        });
        const sortedPageEntries = Object.entries(pageCounts).sort((a,b) => b[1] - a[1]);
        const topPage = sortedPageEntries[0];
        document.getElementById('stat-top-page').innerText = topPage ? topPage[0] : '-';

        // --- 2. Render Charts ---
        renderBehaviorCharts(views);

        // --- 3. Render Table ---
        renderBehaviorTable(views.slice(0, 50)); 

    } catch (err) {
        console.error("Error loading behavior stats:", err);
        recentList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: #ff6b6b;">Fout bij laden van statistieken: ${err.message}</td></tr>`;
    }
}

function renderBehaviorCharts(views) {
    // --- DAILY TRAFFIC (Line Chart) ---
    const dailyData = {};
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
        last14Days.push(dateKey);
        dailyData[dateKey] = 0;
    }

    views.forEach(v => {
        if (!v.timestamp) return;
        const dateKey = v.timestamp.toDate().toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
        if (dailyData.hasOwnProperty(dateKey)) {
            dailyData[dateKey]++;
        }
    });

    const ctxDaily = document.getElementById('chart-traffic-daily').getContext('2d');
    if (behaviorChartDaily) behaviorChartDaily.destroy();
    
    behaviorChartDaily = new Chart(ctxDaily, {
        type: 'line',
        data: {
            labels: last14Days,
            datasets: [{
                label: 'Paginaweergaven',
                data: last14Days.map(label => dailyData[label]),
                borderColor: '#C5A059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#C5A059'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });

    // --- PAGE POPULARITY (Bar Chart) ---
    const pageCounts = {};
    views.forEach(v => {
        const pid = v.pageId || 'onbekend';
        pageCounts[pid] = (pageCounts[pid] || 0) + 1;
    });

    const ctxPages = document.getElementById('chart-pages-pie').getContext('2d');
    if (behaviorChartPages) behaviorChartPages.destroy();

    const sortedPages = Object.entries(pageCounts).sort((a,b) => b[1] - a[1]);

    behaviorChartPages = new Chart(ctxPages, {
        type: 'bar',
        data: {
            labels: sortedPages.map(p => p[0]),
            datasets: [{
                label: 'Aantal weergaven',
                data: sortedPages.map(p => p[1]),
                backgroundColor: '#C5A059',
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar chart looks better for page names
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderBehaviorTable(views) {
    const list = document.getElementById('behavior-recent-list');
    list.innerHTML = '';

    views.forEach(v => {
        const tr = document.createElement('tr');
        const date = v.timestamp && typeof v.timestamp.toDate === 'function' 
            ? v.timestamp.toDate().toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
            : 'Zojuist';
        
        // Format referrer to be readable
        let ref = v.referrer || 'direct';
        if (ref.length > 30) ref = ref.substring(0, 30) + '...';

        tr.innerHTML = `
            <td style="font-size: 0.8rem; color: #64748b;">${date}</td>
            <td><span class="status-badge" style="background: rgba(32, 48, 61, 0.05); color: #20303D; text-transform: capitalize;">${v.pageId || 'home'}</span></td>
            <td><span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${v.language || 'nl'}</span></td>
            <td style="font-size: 0.8rem; color: #94a3b8;" title="${v.referrer || ''}">${ref}</td>
        `;
        list.appendChild(tr);
    });
}

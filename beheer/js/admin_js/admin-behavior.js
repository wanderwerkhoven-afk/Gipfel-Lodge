/**
 * MODULE: BEHAVIOR & ANALYTICS
 * Handles fetching and visualizing website traffic data.
 */

let behaviorChartDaily = null;
let behaviorChartPages = null;

/** --- POPUP FILTER LOGIC --- **/
function toggleBehaviorFilterPopup() {
    const pop = document.getElementById('behavior-filter-popup');
    pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
}

function setBehaviorFilter(value, label) {
    document.getElementById('behavior-filter-type').value = value;
    document.getElementById('behavior-filter-label').innerText = label;
    document.getElementById('behavior-filter-popup').style.display = 'none';
    loadBehaviorStats();
}

// Close popup on outside click
document.addEventListener('click', (e) => {
    const pop = document.getElementById('behavior-filter-popup');
    const btn = document.querySelector('[onclick="toggleBehaviorFilterPopup()"]');
    if (pop && pop.style.display === 'block' && !pop.contains(e.target) && !btn.contains(e.target)) {
        pop.style.display = 'none';
    }
});

async function loadBehaviorStats() {
    console.log("Loading Behavior Stats...");
    const recentList = document.getElementById('behavior-recent-list');
    
    // UI feedback for refresh button
    const refreshBtn = document.querySelector('#behavior-view .eb2-add-btn');
    const originalBtnHtml = refreshBtn ? refreshBtn.innerHTML : '';
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Laden...';
        refreshBtn.disabled = true;
    }
    
    try {
        const { db, collection, getDocs, query, orderBy, limit, where, Timestamp } = await import('../site_js/core/firebase.js');

        // Check if date filters are set
        const startDateEl = document.getElementById('behavior-start-date');
        const endDateEl = document.getElementById('behavior-end-date');
        let q;
        
        if (startDateEl && endDateEl && startDateEl.value && endDateEl.value) {
            const startD = new Date(startDateEl.value);
            startD.setHours(0,0,0,0);
            const endD = new Date(endDateEl.value);
            endD.setHours(23,59,59,999);
            
            q = query(
                collection(db, "page_views"),
                where("timestamp", ">=", Timestamp.fromDate(startD)),
                where("timestamp", "<=", Timestamp.fromDate(endD)),
                orderBy("timestamp", "desc"),
                limit(1000)
            );
        } else {
            // Fetch last 1000 page views for analysis
            q = query(collection(db, "page_views"), orderBy("timestamp", "desc"), limit(1000));
        }
        
        const snap = await getDocs(q);

        const views = [];
        const filterType = document.getElementById('behavior-filter-type')?.value || 'all';

        snap.forEach(doc => {
            const data = doc.data();
            
            // Filter logic
            let include = true;
            if (filterType === 'site') {
                if (data.isLocal === true) include = false;
            } else if (filterType === 'local') {
                if (data.isLocal !== true) include = false;
            }
            
            if (include) {
                views.push({ id: doc.id, ...data });
            }
        });

        console.log(`Fetched ${views.length} views from Firebase (Filter: ${filterType}).`);

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
        renderBehaviorTable(views); 

    } catch (err) {
        console.error("Error loading behavior stats:", err);
        recentList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: #ff6b6b;">Fout bij laden van statistieken: ${err.message}</td></tr>`;
    } finally {
        if (refreshBtn) {
            refreshBtn.innerHTML = originalBtnHtml;
            refreshBtn.disabled = false;
        }
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

    // Grouping ALL views by IP and date
    const groupsMap = new Map();

    views.forEach(v => {
        const dateStr = v.timestamp && typeof v.timestamp.toDate === 'function' 
            ? v.timestamp.toDate().toLocaleDateString('nl-NL') 
            : 'Vandaag';
        
        const ip = v.ip || 'unknown';
        const groupKey = `${ip}-${dateStr}`;

        if (!groupsMap.has(groupKey)) {
            groupsMap.set(groupKey, {
                key: groupKey,
                dateStr: dateStr,
                ip: ip,
                deviceType: v.deviceType || 'Desktop',
                language: v.language || 'nl',
                domainBadge: formatDomainBadge(v),
                latestTimestamp: v.timestamp,
                views: []
            });
        }
        groupsMap.get(groupKey).views.push(v);
    });

    const groups = Array.from(groupsMap.values());

    groups.forEach((g, index) => {
        const latestTime = g.latestTimestamp && typeof g.latestTimestamp.toDate === 'function' 
            ? g.latestTimestamp.toDate().toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
            : 'Zojuist';

        if (g.views.length > 1) {
            // Group with multiple views
            const summaryTr = document.createElement('tr');
            summaryTr.style.cursor = 'pointer';
            summaryTr.style.transition = 'background-color 0.2s';
            summaryTr.innerHTML = `
                <td style="font-size: 0.8rem; color: #64748b; padding-left: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-caret-right" id="caret-${index}" style="transition: transform 0.2s; font-size: 1rem; color: #94a3b8;"></i>
                    ${latestTime}
                </td>
                <td><span class="status-badge" style="background: rgba(197, 160, 89, 0.1); color: var(--color-gold); font-weight: 700;">${g.views.length} Acties</span></td>
                <td style="font-size: 0.8rem; color: #64748b;">
                    <i class="ph ${g.deviceType === 'Mobiel' ? 'ph-smartphone' : 'ph-desktop'}"></i> ${g.deviceType}
                </td>
                <td><span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${g.language}</span></td>
                <td style="font-size: 0.8rem; font-family: monospace; color: #64748b;">${g.ip !== 'unknown' ? g.ip : '-'}</td>
                <td>${g.domainBadge}</td>
            `;

            const detailsTr = document.createElement('tr');
            detailsTr.id = `details-${index}`;
            detailsTr.style.display = 'none';
            detailsTr.style.backgroundColor = '#f8fafc';
            
            let detailsHtml = '<td colspan="6" style="padding: 16px 24px 16px 48px; border-bottom: 1px solid #e2e8f0;"><div style="display: flex; flex-direction: column; gap: 8px;">';
            g.views.forEach(v => {
                const time = v.timestamp && typeof v.timestamp.toDate === 'function' 
                    ? v.timestamp.toDate().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) 
                    : 'Zojuist';
                detailsHtml += `
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="font-size: 0.75rem; color: #94a3b8; width: 45px; font-variant-numeric: tabular-nums;">${time}</span>
                        <span class="status-badge" style="background: rgba(32, 48, 61, 0.05); color: #20303D; text-transform: capitalize; padding: 4px 10px; font-size: 0.75rem;">${v.pageId || 'home'}</span>
                    </div>
                `;
            });
            detailsHtml += '</div></td>';
            detailsTr.innerHTML = detailsHtml;

            summaryTr.onclick = () => {
                const isHidden = detailsTr.style.display === 'none';
                detailsTr.style.display = isHidden ? 'table-row' : 'none';
                document.getElementById(`caret-${index}`).style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                summaryTr.style.backgroundColor = isHidden ? '#f1f5f9' : '';
            };

            list.appendChild(summaryTr);
            list.appendChild(detailsTr);

        } else {
            // Single view
            const v = g.views[0];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size: 0.8rem; color: #64748b; padding-left: 36px;">${latestTime}</td>
                <td><span class="status-badge" style="background: rgba(32, 48, 61, 0.05); color: #20303D; text-transform: capitalize;">${v.pageId || 'home'}</span></td>
                <td style="font-size: 0.8rem; color: #64748b;">
                    <i class="ph ${g.deviceType === 'Mobiel' ? 'ph-smartphone' : 'ph-desktop'}"></i> ${g.deviceType}
                </td>
                <td><span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${g.language}</span></td>
                <td style="font-size: 0.8rem; font-family: monospace; color: #64748b;">${g.ip !== 'unknown' ? g.ip : '-'}</td>
                <td>${g.domainBadge}</td>
            `;
            list.appendChild(tr);
        }
    });
}

function formatDomainBadge(v) {
    // Use the new 'domain' field if available, otherwise try to parse from 'url' or 'referrer'
    let hostname = v.domain || '';
    if (!hostname && v.url) {
        try { hostname = new URL(v.url).hostname; } catch(e) { hostname = ''; }
    }
    
    const domainMap = [
        { match: 'gipfellodge.at',    label: '.at',    color: '#C5A059', bg: 'rgba(197,160,89,0.12)',  flag: '🇦🇹' },
        { match: 'gipfellodge.nl',    label: '.nl',    color: '#e85d04', bg: 'rgba(232,93,4,0.12)',    flag: '🇳🇱' },
        { match: 'gipfellodge.eu',    label: '.eu',    color: '#003399', bg: 'rgba(0,51,153,0.12)',    flag: '🇪🇺' },
        { match: 'gipfellodge.de',    label: '.de',    color: '#dd1c1a', bg: 'rgba(221,28,26,0.12)',   flag: '🇩🇪' },
        { match: 'gipfellodge.com',   label: '.com',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  flag: '🌐' },
        { match: 'github.io',         label: 'GitHub', color: '#6e40c9', bg: 'rgba(110,64,201,0.12)',  flag: '🐙' },
        { match: 'localhost',         label: 'Local',  color: '#64748b', bg: 'rgba(100,116,139,0.12)', flag: '💻' },
        { match: '127.0.0.1',         label: 'Local',  color: '#64748b', bg: 'rgba(100,116,139,0.12)', flag: '💻' },
    ];

    for (const d of domainMap) {
        if (hostname.includes(d.match)) {
            return `<span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: ${d.bg}; color: ${d.color}; white-space: nowrap;">${d.flag} ${d.label}</span>`;
        }
    }

    // Fallback: show hostname or 'direct'
    const fallback = hostname || 'direct';
    return `<span style="font-size: 0.75rem; color: #94a3b8;">${fallback}</span>`;
}


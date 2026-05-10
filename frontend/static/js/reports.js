// ── Auth Guard & Role Setup ────────────────────────────────
const token = localStorage.getItem("access_token");
const role = localStorage.getItem("user_role");
if (!token) window.location.href = "/";

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

// ── Global Chart Defaults ──────────────────────────────────
Chart.defaults.color = '#8a8a96';
Chart.defaults.font.family = "'DM Sans', sans-serif";
let globalInventoryData = [];
let distChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    const userRole = localStorage.getItem("user_role");
    // Admin Check: Hide financials and sales logs from staff
    if (userRole !== "admin") {
        // Hide Stat Cards
        const revCard = document.getElementById("repRevenue");
        const valCard = document.getElementById("repValue");
        const lossCard = document.getElementById("repLoss");
        
        if (revCard) revCard.closest('.stat-card').style.display = 'none';
        if (valCard) valCard.closest('.stat-card').style.display = 'none';
        if (lossCard) lossCard.closest('.stat-card').style.display = 'none';

        // Hide Recent Sales Panel
        const salesPanel = document.getElementById("repSalesBody");
        if (salesPanel) salesPanel.closest('.panel').style.display = 'none';
    }
    loadReportData();
});

// ── Fetch & Process Data ───────────────────────────────────
async function loadReportData() {
    try {
        // Fetch data concurrently using our existing API routes!
        // We pull the last 200 sales and up to 1000 inventory items to calculate our stats.
        const [summaryRes, salesRes, invRes, defectRes] = await Promise.all([
            fetch("/api/inventory/summary", { headers }),
            fetch("/api/sales/history?limit=200", { headers }), 
            fetch("/api/inventory?limit=1000", { headers }), 
            fetch("/api/inventory/defective?limit=10", { headers }) 
        ]);

        const summary = await summaryRes.json();
        const sales = await salesRes.json();
        const inventory = await invRes.json();
        const defects = await defectRes.json();

        // 1. Calculate Top KPIs from Sales Data
        let totalRevenue = 0;
        let totalSold = 0;
        
        sales.data.forEach(s => {
            totalRevenue += s.total;
            s.items.forEach(i => totalSold += i.qty);
        });

        // Format Currency
        const numFormat = new Intl.NumberFormat('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        
        // Populate KPI Cards
        document.getElementById("repRevenue").innerHTML = `<span class="peso-symbol">₱</span>${numFormat.format(totalRevenue)}`;
        document.getElementById("repSold").innerText = totalSold;
        document.getElementById("repValue").innerHTML = `<span class="peso-symbol">₱</span>${numFormat.format(summary.total_value || 0)}`;
        document.getElementById("repLoss").innerHTML = `<span class="peso-symbol">₱</span>${numFormat.format(summary.total_loss || 0)}`;

        // 2. Draw Charts
        globalInventoryData = inventory.data;
        switchDistTab('category');
        
        drawHealthChart(summary.total_stock, summary.total_defective);
        // 3. Populate Preview Tables (Show top 5 entries)
        renderSalesTable(sales.data.slice(0, 5));
        renderDefectTable(defects.data.slice(0, 5));

    } catch (err) {
        console.error("Error loading reports data:", err);
    }
}

// ── Interactive Distribution Chart ─────────────────────────
function switchDistTab(type) {
    // 1. Safely Update Tab UI
    const catTab = document.getElementById('tab-category');
    const brandTab = document.getElementById('tab-brand');
    const flavorTab = document.getElementById('tab-flavor');
    const targetTab = document.getElementById(`tab-${type}`);

    if (catTab) catTab.classList.remove('active');
    if (brandTab) brandTab.classList.remove('active');
    if (flavorTab) flavorTab.classList.remove('active');
    
    if (targetTab) targetTab.classList.add('active');

    // 2. Update the Chart
    updateDistributionChart(type);
}

function updateDistributionChart(type) {
    const counts = {};
    
    // Group and count the stock
    globalInventoryData.forEach(p => {
        let key = p[type];
        
        // Clean up empty data
        if (type === 'flavor') {
            // Skip items with no real flavor logged
            if (!key || key.toUpperCase() === 'N/A' || key.toUpperCase() === 'NONE' || key.trim() === '') return;
        } else {
            if (!key || key.trim() === '') key = 'Unknown';
        }

        counts[key] = (counts[key] || 0) + p.stock;
    });

    // Sort from highest stock to lowest so the chart looks organized
    const sortedKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const labels = sortedKeys;
    const data = sortedKeys.map(k => counts[k]);

    // An extended, beautiful color palette for when you have lots of flavors/brands
    const colors = [
        '#6c63ff', '#34d399', '#f04848', '#e0a81a', 
        '#0ea5e9', '#d946ef', '#f97316', '#8b5cf6', 
        '#10b981', '#f43f5e', '#8a8a96'
    ];

    // Map colors to the labels (repeating the palette if necessary)
    const backgroundColors = labels.map((_, i) => colors[i % colors.length]);

    // If the chart already exists, just smoothly animate the new data into it
    if (distChartInstance) {
        distChartInstance.data.labels = labels;
        distChartInstance.data.datasets[0].data = data;
        distChartInstance.data.datasets[0].backgroundColor = backgroundColors;
        distChartInstance.update();
    } else {
        // Otherwise, build it for the first time
        const ctx = document.getElementById('distributionChart').getContext('2d');
        distChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            // Format the hover tooltip nicely (e.g. "Mint: 45 units")
                            label: function(context) {
                                return ` ${context.label}: ${context.parsed} units`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

function drawHealthChart(totalStock, totalDefective) {
    const ctx = document.getElementById('healthChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Active Stock', 'Defective Log'],
            datasets: [{
                data: [totalStock, totalDefective],
                backgroundColor: ['#34d399', '#f04848'], // Green and Red
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

// ── Table Renderers ────────────────────────────────────────
function renderSalesTable(salesData) {
    const tbody = document.getElementById("repSalesBody");
    tbody.innerHTML = "";

    if (salesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-3); padding:20px;">No recent sales.</td></tr>`;
        return;
    }

    salesData.forEach(s => {
        const dateStr = new Date(s.date + "Z").toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Manila' });
        const totalItems = s.items.reduce((sum, i) => sum + i.qty, 0);
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold;">#${s.id}</td>
                <td style="font-size:12px; color:var(--text-2);">${dateStr}</td>
                <td>${totalItems} items</td>
                <td style="color:var(--green); font-weight:bold;">₱${s.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
}

function renderDefectTable(defectData) {
    const tbody = document.getElementById("repDefectBody");
    tbody.innerHTML = "";

    if (defectData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-3); padding:20px;">No recent defects.</td></tr>`;
        return;
    }

    defectData.forEach(d => {
        const dateStr = new Date(d.date + "Z").toLocaleString('en-US', { dateStyle: 'short', timeZone: 'Asia/Manila' });
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold;">${d.sku}</td>
                <td style="color:var(--red); font-weight:bold;">-${d.quantity}</td>
                <td>${d.reason}</td>
                <td style="font-size:12px; color:var(--text-2);">${dateStr}</td>
            </tr>
        `;
    });
}
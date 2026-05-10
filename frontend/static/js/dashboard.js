// ── Auth Guard & Role Setup ────────────────────────────────
const token = localStorage.getItem("access_token");
const role = localStorage.getItem("user_role");
const userName = localStorage.getItem("user_name");

if (!token) window.location.href = "/";

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

// Global Chart Defaults
Chart.defaults.color = '#8a8a96';
Chart.defaults.font.family = "'DM Sans', sans-serif";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Personalize the greeting
    const firstName = userName ? userName.split(' ')[0] : 'User';
    document.getElementById("welcomeName").innerText = firstName;

    // 2. Strict Role-Based Access Control (RBAC)
    if (role !== "admin") {
        document.getElementById("dashReportsBtn").style.display = "none";
        document.getElementById("adminRevenueCard").style.display = "none";
    }

    // 3. Load the data
    loadDashboardData();
});

// ── Fetch & Populate Data ──────────────────────────────────
async function loadDashboardData() {
    try {
        const [summaryRes, lowStockRes, salesRes] = await Promise.all([
            fetch("/api/inventory/summary", { headers }),
            fetch("/api/inventory?sort=stock_low&limit=5", { headers }),
            fetch("/api/sales/history?limit=100", { headers })
        ]);

        const summary = await summaryRes.json();
        const lowStock = await lowStockRes.json();
        const sales = await salesRes.json();

        // --- POPULATE KPIs ---
        document.getElementById("dashStock").innerText = summary.total_stock || 0;
        document.getElementById("dashLowStock").innerText = summary.low_stock || 0;
        
        let totalRevenue = 0;
        sales.data.forEach(s => totalRevenue += s.total);
        
        const numFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const revCard = document.getElementById("dashRevenue");
        if (revCard) revCard.innerHTML = `<span class="peso-symbol">₱</span>${numFormat.format(totalRevenue)}`;
        
        document.getElementById("dashSalesCount").innerText = sales.total || 0;

        // --- DRAW CHART & TABLES ---
        drawDashHealthChart(summary.total_stock, summary.total_defective);
        renderLowStockTable(lowStock.data);
        renderSalesTable(sales.data.slice(0, 5));

        // --- INITIALIZE FULL MINI-INVENTORY ---
        await loadDashCategories();
        await loadDashInventory();

    } catch (err) {
        console.error("Dashboard failed to load data:", err);
    }
}

// ── Draw Health Chart ──────────────────────────────────────
function drawDashHealthChart(totalStock, totalDefective) {
    const ctx = document.getElementById('dashHealthChart').getContext('2d');
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
                legend: { position: 'bottom' } 
            }
        }
    });
}

// ── Table Renderers ────────────────────────────────────────
function renderLowStockTable(items) {
    const tbody = document.getElementById("dashLowStockBody");
    tbody.innerHTML = "";

    // Filter out items that have high stock (just in case)
    const lowItems = items.filter(i => i.stock <= 10);

    if (lowItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 24px; color:var(--green); font-weight:600;">All stock levels are healthy!</td></tr>`;
        return;
    }

    lowItems.forEach(item => {
        const stockColor = item.stock === 0 ? 'var(--red)' : 'var(--amber)';
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600; font-size:12px;">${item.sku}</td>
                <td>
                    ${item.title}
                    <div style="font-size:11px; color:var(--text-2);">${item.brand} • ${item.flavor}</div>
                </td>
                <td style="color:${stockColor}; font-weight:bold;">${item.stock}</td>
            </tr>
        `;
    });
}

function renderSalesTable(salesData) {
    const tbody = document.getElementById("dashSalesBody");
    tbody.innerHTML = "";

    if (salesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 24px; color:var(--text-3);">No sales today.</td></tr>`;
        return;
    }

    salesData.forEach(s => {
        // Just grab the time portion for a cleaner dashboard look
        const dateObj = new Date(s.date + "Z");
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
        
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold; font-size:12px;">#${s.id}</td>
                <td style="font-size:12px; color:var(--text-2);">${timeStr}</td>
                <td style="color:var(--green); font-weight:bold;">₱${s.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
}

// ── Functional Mini Inventory ──────────────────────────────
let dashInvSearchTimeout;
let dashInvPage = 1;
let maxDashInvPages = 1;

// Load the dynamic categories into the dropdown
async function loadDashCategories() {
    try {
        const res = await fetch("/api/inventory/categories", { headers });
        const cats = await res.json();
        const sel = document.getElementById("dashInvCategory");
        if (sel) {
            sel.innerHTML = '<option value="">All Categories</option>';
            cats.forEach(c => {
                if (c) sel.innerHTML += `<option value="${c}">${c}</option>`;
            });
        }
    } catch(e) {}
}

// Triggered when typing or changing a dropdown
function delayDashInvSearch() {
    clearTimeout(dashInvSearchTimeout);
    dashInvSearchTimeout = setTimeout(() => {
        dashInvPage = 1; // Reset back to page 1 on a new search
        loadDashInventory();
    }, 350);
}

// Change pages
function changeDashInvPage(step) {
    const newPage = dashInvPage + step;
    if (newPage >= 1 && newPage <= maxDashInvPages) {
        dashInvPage = newPage;
        loadDashInventory();
    }
}

// Fetch the data from the server with all active filters
async function loadDashInventory() {
    const search = document.getElementById("dashInvSearch").value;
    const category = document.getElementById("dashInvCategory").value;
    const sort = document.getElementById("dashInvSort").value;
    
    // Construct the query with pagination (locked to 5 items max per page)
    const query = new URLSearchParams({ search, category, sort, page: dashInvPage, limit: 5 }).toString();
    
    try {
        const res = await fetch(`/api/inventory?${query}`, { headers });
        const json = await res.json();
        renderDashInvTable(json.data);
        
        // Update the pagination UI
        maxDashInvPages = json.pages || 1;
        document.getElementById("dashInvPageInfo").innerText = `Page ${json.page} of ${maxDashInvPages} (${json.total} items)`;
    } catch (err) {
        console.error("Mini inventory fetch error", err);
    }
}

// Draw the HTML table
function renderDashInvTable(items) {
    const search   = document.getElementById("dashInvSearch").value;
    const category = document.getElementById("dashInvCategory").value;
    const sort     = document.getElementById("dashInvSort").value;

    const tbody = document.getElementById("dashInvBody");
    tbody.innerHTML = "";

    if (items.length === 0) {
        // Check if the user is currently searching or filtering
        const isFiltering = search !== "" || category !== "" || sort !== "created_at";

        if (isFiltering) {
            // State A: No Search Results
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--text-3); display:inline-block;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">No matching products</p>
                            <p style="margin-bottom: 16px; color: var(--text-2);">We couldn't find any items matching your current filters.</p>
                            <button class="btn btn-secondary" onclick="clearDashInvFilters()">Clear Filters</button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            // State B: Completely Empty Database
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--text-3); display:inline-block;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                            </svg>
                            <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">Your inventory is empty</p>
                            <p style="color: var(--text-2);">No inventory found. Go to the Full Manager to add products.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Update dashboard-specific pagination variables
        document.getElementById("dashInvPageInfo").innerText = "Showing 0 items";
        maxDashInvPages = 1; 
        return;
    }

    items.forEach(p => {
        const badgeClass = p.status === "In Stock" ? "badge-green" : p.status === "Low Stock" ? "badge-amber" : "badge-red";
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600; font-size:12px;">${p.sku}</td>
                <td>
                    ${p.title}
                    <div style="font-size:11px; color:var(--text-2);">${p.brand} • ${p.flavor}</div>
                </td>
                <td>${p.category}</td>
                <td style="color:var(--green); font-weight:600;">₱${p.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td style="font-weight:bold;">${p.stock}</td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
            </tr>
        `;
    });
}

// Helper function to clear the filters on the Dashboard
function clearDashInvFilters() {
    document.getElementById("dashInvSearch").value = "";
    document.getElementById("dashInvCategory").value = "";
    document.getElementById("dashInvSort").value = "created_at";
    dashInvPage = 1;
    loadDashInventory();
}
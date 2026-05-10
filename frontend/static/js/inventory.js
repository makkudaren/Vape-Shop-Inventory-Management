// ── Auth Guard & Role Setup ────────────────────────────────
const token = localStorage.getItem("access_token");
const role = localStorage.getItem("user_role");
if (!token) window.location.href = "/";

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
};

// ── Server-Side Autocomplete Brain ─────────────────────────
let autocompleteCache = [];
let autocompleteTimer;

document.addEventListener("input", function (e) {
    if (e.target.hasAttribute("list") && e.target.getAttribute("list") === "skuList") {
        const val = e.target.value.trim();
        const matched = autocompleteCache.find(p => p.sku === val);
        
        if (matched) {
            if (e.target.classList.contains("ba-sku")) {
                const tr = e.target.closest("tr");
                tr.querySelector(".ba-title").value  = matched.title    || "";
                tr.querySelector(".ba-brand").value  = matched.brand    || "";
                tr.querySelector(".ba-flavor").value = matched.flavor   || "";
                tr.querySelector(".ba-cat").value    = matched.category || "";
                tr.querySelector(".ba-price").value  = matched.price    || "";
            } else if (e.target.id === "p_sku") {
                document.getElementById("p_title").value  = matched.title    || "";
                document.getElementById("p_brand").value  = matched.brand    || "";
                document.getElementById("p_flavor").value = matched.flavor   || "";
                document.getElementById("p_cat").value    = matched.category || "";
                document.getElementById("p_price").value  = matched.price    || "";
            }
            return; 
        }

        if (val.length < 2) return; 
        clearTimeout(autocompleteTimer);
        
        autocompleteTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/inventory/autocomplete?q=${val}`, { headers });
                autocompleteCache = await res.json();
                const datalist = document.getElementById("skuList");
                datalist.innerHTML = ""; 
                autocompleteCache.forEach(p => {
                    datalist.innerHTML += `<option value="${p.sku}">${p.title} (${p.brand})</option>`;
                });
            } catch (err) { console.error("Autocomplete failed:", err); }
        }, 300);
    }
});

// ── Utilities ──────────────────────────────────────────────
function formatTimeAgo(dateString) {
    if (!dateString) return "N/A";
    let safeDate = dateString;
    if (!safeDate.endsWith("Z")) safeDate += "Z"; 
    return new Date(safeDate).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Manila' });
}

function showSysMsg(msg, isError) {
    const el = document.getElementById("sysMsg");
    if (!el) return;
    
    let safeMsg = msg;
    if (Array.isArray(msg) && msg.length > 0) {
        const fieldName = msg[0].loc && msg[0].loc[1] ? msg[0].loc[1] : "Input";
        safeMsg = `${fieldName}: ${msg[0].msg}`;
    } else if (typeof msg === "object") {
        safeMsg = "An unexpected error occurred.";
    }
    
    el.className = `alert ${isError ? "error" : "success"} show`;
    el.style.display = "flex"; 
    
    const icon = isError 
        ? `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="width:16px;height:16px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
        : `<svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" style="width:16px;height:16px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
        
    el.innerHTML = `${icon} <span>${safeMsg}</span>`;
    
    if (window.sysMsgTimeout) clearTimeout(window.sysMsgTimeout);
    window.sysMsgTimeout = setTimeout(() => { 
        el.classList.remove("show"); 
        setTimeout(() => { if (!el.classList.contains("show")) el.style.display = "none"; }, 400); 
    }, 3000);
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "none";
    el.classList.remove("open");
}

function _openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "flex";
    el.classList.add("open");
}

// ── Category Icons ─────────────────────────────────────────
const catIcons = {
    "E-Liquid":    `<svg fill="none" stroke="currentColor" width="24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
    "Disposables": `<svg fill="none" stroke="currentColor" width="24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v8l9-11h-7z"></path></svg>`,
    "Hardware":    `<svg fill="none" stroke="currentColor" width="24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
    "Accessories": `<svg fill="none" stroke="currentColor" width="24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>`,
    "Default":     `<svg fill="none" stroke="currentColor" width="24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`
};

let currentPage = 1;
const itemsPerPage = 15;
let currentDefectPage = 1;
const defectsPerPage = 10;
let maxDefectPages = 1;
let defectSearchTimeout;
let searchTimeout;

function delaySearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadInventory();
    }, 350);
}

// ── DOMContentLoaded ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const userRole = localStorage.getItem("user_role");
    loadSummary();
    loadCategories();
    loadInventory();
    loadDefectives();
});

// ── 1. Summary ─────────────────────────────────────────────
async function loadSummary() {
    try {
        const res  = await fetch("/api/inventory/summary", { headers });
        const data = await res.json();
        document.getElementById("totStock").innerText  = data.total_stock;
        document.getElementById("totLow").innerText    = data.low_stock;
        document.getElementById("totDefect").innerText = data.total_defective;
    } catch {
        // silent — summary is non-critical
    }
}

// ── 2. Inventory Table ─────────────────────────────────────
async function loadInventory() {
    const search   = document.getElementById("searchInput").value;
    const category = document.getElementById("filterCategory").value;
    
    const brand    = document.getElementById("filterBrand") ? document.getElementById("filterBrand").value : "";
    const flavor   = document.getElementById("filterFlavor") ? document.getElementById("filterFlavor").value : "";
    const sort     = document.getElementById("sortBy").value;

    const clearInvBtn = document.getElementById("clearInvBtn");
    
    // Check if ANY filter is active to show the clear button
    if (search !== "" || category !== "" || brand !== "" || flavor !== "" || sort !== "created_at") {
        clearInvBtn.style.display = "inline-flex";
    } else {
        clearInvBtn.style.display = "none";
    }

    // Pass everything to the backend
    const query = new URLSearchParams({
        search, category, brand, flavor, sort, page: currentPage, limit: itemsPerPage
    }).toString();

    try {
        const res  = await fetch(`/api/inventory?${query}`, { headers });
        const json = await res.json();

        const tbody = document.getElementById("inventoryBody");
        tbody.innerHTML = "";

        if (json.data.length === 0) {
            // Check if the user is currently searching or filtering
            const isFiltering = search !== "" || category !== "" || brand !== "" || flavor !== "" || sort !== "created_at";

            if (isFiltering) {
                // State A: No Search Results
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-state" style="padding: 40px 20px;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--text-3);">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                                <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">No matching products</p>
                                <p style="margin-bottom: 16px;">We couldn't find any items matching your current filters.</p>
                                <button class="btn btn-secondary" onclick="clearInventoryFilters()">Clear Filters</button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                // State B: Completely Empty Database
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-state" style="padding: 40px 20px;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--text-3);">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                </svg>
                                <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">Your inventory is empty</p>
                                <p>No inventory found. Click "+ Product" or "Batch Add" to get started.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            document.getElementById("pageInfo").innerText = "Showing 0 items";
            window.maxPages = 1;
            return;
        }

        json.data.forEach(p => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.onclick = () => openProductModal(p);
            const badgeClass = p.status === "In Stock" ? "badge-green" : p.status === "Low Stock" ? "badge-amber" : "badge-red";
            tr.innerHTML = `
                <td style="color:var(--text-secondary)">${catIcons[p.category] || catIcons["Default"]}</td>
                <td><strong>${p.sku}</strong></td>
                <td>${p.title}<br><span style="font-size:12px;color:var(--text-secondary)">${p.brand} · ${p.flavor}</span></td>
                <td>${p.category}</td>
                <td>₱${p.price.toLocaleString()}</td>
                <td>${p.stock}</td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
                <td style="font-size:12px; color:var(--text-2); white-space:nowrap;">${formatTimeAgo(p.updated_at)}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("pageInfo").innerText =
            `Page ${json.page} of ${json.pages} (${json.total} items)`;
        window.maxPages = json.pages;
    } catch {
        showSysMsg("Failed to load inventory.", true);
    }
}

function changePage(step) {
    const newPage = currentPage + step;
    if (newPage >= 1 && newPage <= (window.maxPages || 1)) {
        currentPage = newPage;
        loadInventory();
    }
}

function clearInventoryFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("filterCategory").value = "";
    if (document.getElementById("filterBrand")) document.getElementById("filterBrand").value = "";
    if (document.getElementById("filterFlavor")) document.getElementById("filterFlavor").value = "";
    document.getElementById("sortBy").value = "created_at";
    currentPage = 1;
    loadInventory();
}
// ── 3. Defectives Table ────────────────────────────────────
async function loadDefectives() {
    const search = document.getElementById("searchDefectInput").value;
    const sort   = document.getElementById("sortDefect").value;

    const clearDefectBtn = document.getElementById("clearDefectBtn");
    if (search !== "" || sort !== "created_at") {
        clearDefectBtn.style.display = "inline-flex";
    } else {
        clearDefectBtn.style.display = "none";
    }

    const query = new URLSearchParams({
        search, sort, page: currentDefectPage, limit: defectsPerPage
    }).toString();

    try {
        const res  = await fetch(`/api/inventory/defective?${query}`, { headers });
        const json = await res.json();
        const tbody = document.getElementById("defectiveBody");
        tbody.innerHTML = "";

        if (json.data.length === 0) {
            // Check if the user is currently searching
            const isFilteringDefect = search !== "";

            if (isFilteringDefect) {
                // State A: No Search Results
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="empty-state" style="padding: 40px 20px;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--text-3);">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                                <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">No matching defects</p>
                                <p style="margin-bottom: 16px;">We couldn't find any defect records matching your search.</p>
                                <button class="btn btn-secondary" onclick="clearDefectFilters()">Clear Search</button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                // State B: Completely Empty Database)
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="empty-state" style="padding: 40px 20px;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--green);">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">Looking good!</p>
                                <p>You have zero defective products in your inventory right now.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            document.getElementById("defectPageInfo").innerText = "Showing 0 items";
            maxDefectPages = 1;
            return;
        }

        json.data.forEach(d => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.onclick = () => openDefectEditModal(d.id, d.sku, d.title, d.quantity);
            tr.innerHTML = `
                <td class="cell-main">${d.sku}</td>
                <td>${d.title} <span class="text-muted">(${d.brand})</span></td>
                <td style="color:var(--red); font-weight:bold;">-${d.quantity}</td>
                <td>${d.reason}</td>
                <td><span style="font-size:12px; color:var(--text-2)">${d.reporter}</span></td>
                <td style="font-size:12px; color:var(--text-2); white-space:nowrap;">${formatTimeAgo(d.updated_at)}</td>
            `;
            tbody.appendChild(tr);
        });

        maxDefectPages = json.pages || 1;
        document.getElementById("defectPageInfo").innerText = `Showing page ${json.page} of ${maxDefectPages} (${json.total} items)`;
    } catch {
        showSysMsg("Failed to load defective log.", true);
    }
}

function clearDefectFilters() {
    document.getElementById("searchDefectInput").value = "";
    document.getElementById("sortDefect").value = "created_at";
    currentDefectPage = 1;
    loadDefectives();
}

function changeDefectPage(step) {
    const newPage = currentDefectPage + step;
    if (newPage >= 1 && newPage <= maxDefectPages) {
        currentDefectPage = newPage;
        loadDefectives();
    }
}

function delayDefectSearch() {
    clearTimeout(defectSearchTimeout);
    defectSearchTimeout = setTimeout(() => {
        currentDefectPage = 1;
        loadDefectives();
    }, 350);
}

// ── 4. Product Modal ───────────────────────────────────────
function openProductModal(p = null) {
    document.getElementById("p_id").value     = p ? p.id       : "";
    document.getElementById("p_sku").value    = p ? p.sku      : "";
    document.getElementById("p_title").value  = p ? p.title    : "";
    document.getElementById("p_brand").value  = p ? p.brand    : "";
    document.getElementById("p_flavor").value = p ? p.flavor   : "";
    document.getElementById("p_cat").value    = p ? p.category : "E-Liquid";
    document.getElementById("p_price").value  = p ? p.price    : "";
    document.getElementById("p_stock").value  = p ? p.stock    : "";

    const deleteBtn = document.getElementById("deleteProductBtn");

    if (p) {
        document.getElementById("modalTitle").innerText             = `Edit: ${p.sku}`;
        document.getElementById("defectTabBtn").style.display       = "block";
        document.getElementById("historyTabBtn").style.display      = "block";
        deleteBtn.style.display                                     = "flex";
        loadHistory(p.id);
    } else {
        document.getElementById("modalTitle").innerText             = "Add New Product";
        document.getElementById("defectTabBtn").style.display       = "none";
        document.getElementById("historyTabBtn").style.display      = "none";
        deleteBtn.style.display                                     = "none";
    }

    switchTab("details");
    _openModal("productModal");
}

// ── 5. Tab Switching ───────────────────────────────────────
function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const tabs = document.querySelectorAll(".tab");
    const map  = { details: 0, defect: 1, history: 2 };
    if (tabs[map[tabId]]) tabs[map[tabId]].classList.add("active");

    const content = document.getElementById(`tab-${tabId}`);
    if (content) content.classList.add("active");
}

// ── 6. Save / Delete Product ───────────────────────────────
async function saveProduct() {
    const id = document.getElementById("p_id").value;

    const priceVal = parseFloat(document.getElementById("p_price").value) || 0;
    const stockVal = parseInt(document.getElementById("p_stock").value) || 0;

    // Reject negative values
    if (priceVal < 0) {
        return showSysMsg("Price cannot be negative.", true);
    }
    if (stockVal < 0) {
        return showSysMsg("Stock cannot be negative.", true);
    }

    const payload = {
        sku:      document.getElementById("p_sku").value,
        title:    document.getElementById("p_title").value,
        brand:    document.getElementById("p_brand").value,
        flavor:   document.getElementById("p_flavor").value,
        category: document.getElementById("p_cat").value,
        price:    parseFloat(document.getElementById("p_price").value),
        stock:    parseInt(document.getElementById("p_stock").value)
    };

    if (!payload.sku || !payload.title) {
        return showSysMsg("SKU and Title are required.", true);
    }

    const method = id ? "PUT"  : "POST";
    const url    = id ? `/api/inventory/${id}` : "/api/inventory";

    try {
        const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
        if (res.ok) {
            closeModal("productModal");
            showSysMsg("Product saved successfully.", false);
            loadInventory();
            loadSummary();
            loadCategories();
        } else {
            const err = await res.json();
            showSysMsg(err.detail || "Error saving product.", true);
        }
    } catch {
        showSysMsg("Network error saving product.", true);
    }
}

async function deleteProduct() {
    // Grab the hidden ID from the modal
    const id = document.getElementById("p_id").value;
    if (!id) return;

    // Trigger confirmation modal
    showConfirmModal(
        "Delete Product",
        "Are you sure you want to permanently delete this product? This will also wipe its history and defect logs. This cannot be undone.",
        "Permanently Delete",
        "btn-danger",
        async () => {
            // EVERYTHING IN HERE RUNS ONLY IF THEY CLICK YES
            try {
                const res = await fetch(`/api/inventory/${id}`, { method: "DELETE", headers });
                if (res.ok) {
                    closeModal("productModal");
                    showSysMsg("Product permanently deleted.", false);
                    loadInventory();
                    loadSummary();
                    loadCategories();
                    loadDefectives(); 
                } else {
                    const data = await res.json();
                    showSysMsg(data.detail || "Failed to delete product.", true);
                }
            } catch (error) {
                showSysMsg("Network error deleting product.", true);
            }
        }
    );
}

// ── 7. Report Defect (single product) ─────────────────────
async function submitDefect() {
    const id = document.getElementById("p_id").value;
    const qty = parseInt(document.getElementById("d_qty").value);

    // Prevent negative, zero, or blank values
    if (isNaN(qty) || qty <= 0) {
        return showSysMsg("Please enter a valid quantity greater than 0.", true);
    }

    const payload = {
        quantity: qty,
        reason:   document.getElementById("d_reason").value,
        note:     document.getElementById("d_note").value
    };

    try {
        const res = await fetch(`/api/inventory/${id}/defect`, {
            method: "POST", headers, body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            closeModal("productModal");
            showSysMsg("Defect reported. Stock adjusted.", false);
            document.getElementById("d_qty").value  = "";
            document.getElementById("d_note").value = "";
            loadInventory();
            loadDefectives();
            loadSummary();
        } else {
            showSysMsg(data.detail || "Error reporting defect.", true);
        }
    } catch {
        showSysMsg("Network error reporting defect.", true);
    }
}

// ── 8. Audit History ───────────────────────────────────────
async function loadHistory(id) {
    try {
        const res  = await fetch(`/api/inventory/${id}/history`, { headers });
        const data = await res.json();
        const ul   = document.getElementById("historyList");
        ul.innerHTML = "";

        if (data.length === 0) {
            ul.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-icon lucide-clock"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            <p>No audit history available.</p>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById("pageInfo").innerText = "Showing 0 items";
            window.maxPages = 1;
            return;
        }

        data.forEach(log => {
            const d = formatTimeAgo(log.date);
            
            const formattedAction = log.action.replace(/\n/g, '<br>');
            
            ul.innerHTML += `
                <li style="padding:12px 0; border-bottom:1px solid var(--border-color);">
                    <div style="color:var(--text-primary); font-size:13px; line-height:1.6; margin-bottom:4px;">
                        ${formattedAction}
                    </div>
                    <div style="color:var(--text-secondary); font-size:11px;">
                        By ${log.user} on ${d}
                    </div>
                </li>
            `;
        });
    } catch {
        // silent failure — tab will just be empty
    }
}

// ── 9. Batch Add ───────────────────────────────────────────
function openBatchAddModal() {
    document.getElementById("batchAddTableBody").innerHTML = "";
    addBatchAddRow();
    _openModal("batchAddModal");
}

function addBatchAddRow() {
    const tbody = document.getElementById("batchAddTableBody");
    const tr    = document.createElement("tr");
    tr.innerHTML = `
        <td style="padding:4px;"><input type="text"   class="ba-sku"   list="skuList"      placeholder="Search SKU…"  style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><input type="text"   class="ba-title" list="titleList"    placeholder="Title"        style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><input type="text"   class="ba-brand" list="brandList"    placeholder="Brand"        style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><input type="text"   class="ba-flavor"list="flavorList"   placeholder="Flavor"       style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><input type="text"   class="ba-cat"   list="categoryList" placeholder="Category"     style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><input type="number" class="ba-price"                     placeholder="0.00"         style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><input type="number" class="ba-stock"                     placeholder="Qty"          style="width:100%;padding:10px;"></td>
        <td style="padding:4px;"><button onclick="this.closest('tr').remove()" style="background:var(--red);color:white;border:none;padding:10px;border-radius:10px;cursor:pointer;">✕</button></td>
    `;

    tbody.appendChild(tr);
}

async function submitBatchAdd() {
    const rows  = document.querySelectorAll("#batchAddTableBody tr");
    const items = [];
    let hasError = false;

    rows.forEach(row => {
        const sku   = row.querySelector(".ba-sku").value.trim();
        const title = row.querySelector(".ba-title").value.trim();
        if (!sku || !title) return;

        const price = parseFloat(row.querySelector(".ba-price").value) || 0;
        const stock = parseInt(row.querySelector(".ba-stock").value)   || 0;

        // Reject negative values immediately
        if (price < 0) {
            return showSysMsg("Price cannot be negative.", true);
            hasError = true;
            return;
        }
        if (stock < 0) {
            return showSysMsg("Stock cannot be negative.", true);
            hasError = true;
            return;
        }

        items.push({
            sku,
            title,
            brand:    row.querySelector(".ba-brand").value.trim()  || "Unknown",
            flavor:   row.querySelector(".ba-flavor").value.trim() || "N/A",
            category: row.querySelector(".ba-cat").value,
            price:    parseFloat(row.querySelector(".ba-price").value) || 0,
            stock:    parseInt(row.querySelector(".ba-stock").value)   || 0
        });
    });

    if (hasError) return;
    if (items.length === 0) { showSysMsg("No valid rows to submit.", true); return; }

    try {
        const res  = await fetch("/api/inventory/batch-add", {
            method: "POST", headers, body: JSON.stringify({ items })
        });
        const data = await res.json();
        if (res.ok) {
            closeModal("batchAddModal");
            showSysMsg(data.message, false);
            loadInventory();
            loadSummary();
            loadCategories();
        } else {
            showSysMsg(data.detail || "Error submitting batch.", true);
        }
    } catch {
        showSysMsg("Network error submitting batch add.", true);
    }
}

// ── 10. Batch Defect ──────────────────────────────────────
function openBatchDefectModal() {
    document.getElementById("batchDefectTableBody").innerHTML = "";
    addBatchDefectRow();
    _openModal("batchDefectModal");
}

function addBatchDefectRow() {
    const tbody = document.getElementById("batchDefectTableBody");
    const tr    = document.createElement("tr");

    tr.innerHTML = `
        <td style="padding:4px;">
            <input type="text" class="bd-sku" list="skuList" placeholder="Search SKU..." style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-color);">
        </td>
        <td style="padding:4px;">
            <input type="number" class="bd-qty" placeholder="Qty" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-color);">
        </td>
        <td style="padding:4px;">
            <select class="bd-reason" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-color);">
                <option value="Leaking">Leaking</option>
                <option value="Auto-firing">Auto-firing</option>
                <option value="Dead Battery">Dead Battery</option>
                <option value="Burnt Taste">Burnt Taste</option>
                <option value="Other">Other</option>
            </select>
        </td>
        <td style="padding:4px;">
            <button onclick="this.closest('tr').remove()" style="background:var(--red);color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
}

async function submitBatchDefect() {
    const rows  = document.querySelectorAll("#batchDefectTableBody tr");
    const items = [];
    let hasError = false;

    rows.forEach(row => {
        if (hasError) return; 

        const skuInput = row.querySelector(".bd-sku").value.trim();
        const qty      = parseInt(row.querySelector(".bd-qty").value);
        
        if (!skuInput) return; // Skip totally blank rows

        // 1. Strict Validation: Check if the SKU exists
        const matchedProduct = autocompleteCache.find(p => p.sku === skuInput);
        if (!matchedProduct) {
            showSysMsg(`SKU "${skuInput}" not found in database.`, true);
            hasError = true;
            return;
        }

        if (isNaN(qty) || qty <= 0) {
            showSysMsg("All defect quantities must be greater than zero.", true);
            hasError = true;
            return;
        }

        items.push({
            product_id: matchedProduct.id, // Map the SKU back to the ID for the backend
            quantity:   qty,
            reason:     row.querySelector(".bd-reason").value,
            note:       "Batch Defect Report"
        });
    });

    if (hasError) return;
    if (items.length === 0) return showSysMsg("No valid entries to report.", true); 

    try {
        const res  = await fetch("/api/inventory/batch-defect", {
            method: "POST", headers, body: JSON.stringify({ items })
        });
        const data = await res.json();
        
        if (res.ok) {
            closeModal("batchDefectModal");
            showSysMsg(data.message, false);
            loadInventory();
            loadDefectives();
            loadSummary();
        } else {
            showSysMsg(data.detail || "Error reporting batch defects.", true);
        }
    } catch {
        showSysMsg("Network error reporting batch defects.", true);
    }
}

// ── 11. Defect Record Edit Modal ───────────────────────────
function openDefectEditModal(defectId, sku, title, currentQty) {
    document.getElementById("edit_defect_id").value = defectId;
    document.getElementById("edit_defect_title").innerText = `${sku} | ${title}`;
    document.getElementById("edit_defect_qty").value = currentQty;
    document.getElementById("resolve_defect_qty").value = currentQty; 
    
    _openModal("defectEditModal");
}
async function updateDefectRecord() {
    const id = document.getElementById("edit_defect_id").value;
    const qty = parseInt(document.getElementById("edit_defect_qty").value);
    
    if (isNaN(qty) || qty < 0) return showSysMsg("Invalid quantity.", true);

    try {
        const res = await fetch(`/api/inventory/defective/${id}`, {
            method: "PUT", headers, body: JSON.stringify({ quantity: qty })
        });
        const data = await res.json();
        
        if(res.ok) {
            closeModal('defectEditModal');
            showSysMsg(data.message, false);
            loadInventory();
            loadDefectives();
            loadSummary();
        } else {
            showSysMsg(data.detail, true);
        }
    } catch(e) { showSysMsg("Error updating record.", true); }
}

async function resolveDefectRecord(actionType) {
    const id = document.getElementById("edit_defect_id").value;
    const qtyToProcess = parseInt(document.getElementById("resolve_defect_qty").value);
    
    if (isNaN(qtyToProcess) || qtyToProcess <= 0) {
        return showSysMsg("Please enter a valid quantity to process.", true);
    }
    
    // Setup dynamic text and colors based on action
    const title = actionType === 'return' ? "Return to Stock" : "Write-off Inventory";
    const confirmMsg = actionType === 'return' 
        ? `Are you sure you want to RETURN ${qtyToProcess} item(s) back to active stock?` 
        : `Are you sure you want to permanently WRITE-OFF ${qtyToProcess} item(s) as a loss?`;
    const btnText = actionType === 'return' ? "Return Items" : "Write-off Loss";
    const btnClass = actionType === 'return' ? "btn-primary" : "btn-danger";

    // Trigger the beautiful UI Modal
    showConfirmModal(title, confirmMsg, btnText, btnClass, async () => {
        // RUNS ONLY IF THEY CLICK YES
        try {
            const res = await fetch(`/api/inventory/defective/${id}/resolve`, { 
                method: "POST", 
                headers,
                body: JSON.stringify({ action: actionType, quantity: qtyToProcess }) 
            });
            const data = await res.json();
            
            if(res.ok) {
                closeModal('defectEditModal');
                showSysMsg(data.message, false);
                loadInventory();
                loadDefectives();
                loadSummary();
            } else {
                showSysMsg(data.detail, true);
            }
        } catch(e) { showSysMsg("Error resolving defect.", true); }
    });
}

function openSingleDefectModal() {
    // Reset form and clear the searchable input
    document.getElementById("sd_product_sku").value = "";
    document.getElementById("sd_qty").value = "";
    document.getElementById("sd_reason").value = "Leaking";
    document.getElementById("sd_note").value = "";

    _openModal("singleDefectModal");
}

// ── 13. Single Defect Report Modal ─────────────────────────
async function submitSingleDefect() {
    const skuInput = document.getElementById("sd_product_sku").value.trim();
    const qty = parseInt(document.getElementById("sd_qty").value);

    // 1. Strict Validation: Check if the product exists in the database
    const matchedProduct = autocompleteCache.find(p => p.sku === skuInput);

    if (!matchedProduct) {
        return showSysMsg(`Product with SKU "${skuInput}" not found.`, true);
    }

    if (isNaN(qty) || qty <= 0) {
        return showSysMsg("Please enter a valid quantity greater than 0.", true);
    }

    const payload = {
        quantity: qty,
        reason: document.getElementById("sd_reason").value,
        note: document.getElementById("sd_note").value
    };

    try {
        // Send the matched product ID to the backend
        const res = await fetch(`/api/inventory/${matchedProduct.id}/defect`, {
            method: "POST", headers, body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            closeModal("singleDefectModal");
            showSysMsg("Defect reported and stock adjusted.", false);
            loadInventory();
            loadDefectives();
            loadSummary();
        } else {
            showSysMsg(data.detail || "Error reporting defect.", true);
        }
    } catch {
        showSysMsg("Network error reporting defect.", true);
    }
}

// ── 14. Dynamic Categories & Filters ──────────────────────────
async function loadCategories() {
    try {
        // Fetch all three lists concurrently
        const [catRes, brandRes, flavorRes] = await Promise.all([
            fetch("/api/inventory/categories", { headers }),
            fetch("/api/inventory/brands", { headers }),
            fetch("/api/inventory/flavors", { headers })
        ]);
        
        const categories = await catRes.json();
        const brands = await brandRes.json();
        const flavors = await flavorRes.json();

        // 1. Setup the Inventory Table Filters
        const filterCat = document.getElementById("filterCategory");
        const filterBrand = document.getElementById("filterBrand");
        const filterFlavor = document.getElementById("filterFlavor");

        if (filterCat) filterCat.innerHTML = '<option value="">All Categories</option>';
        if (filterBrand) filterBrand.innerHTML = '<option value="">All Brands</option>';
        if (filterFlavor) filterFlavor.innerHTML = '<option value="">All Flavors</option>';

        categories.forEach(c => { if(filterCat && c) filterCat.innerHTML += `<option value="${c}">${c}</option>` });
        brands.forEach(b => { if(filterBrand && b) filterBrand.innerHTML += `<option value="${b}">${b}</option>` });
        flavors.forEach(f => { if(filterFlavor && f) filterFlavor.innerHTML += `<option value="${f}">${f}</option>` });

        // 2. Setup the Product Modal Datalists (for adding/editing)
        const modalCat = document.getElementById("p_cat");
        const listCat = document.getElementById("categoryList");
        const listBrand = document.getElementById("brandList");
        const listFlavor = document.getElementById("flavorList");

        if (modalCat) modalCat.innerHTML = '';
        if (listCat) listCat.innerHTML = '';
        if (listBrand) listBrand.innerHTML = '';
        if (listFlavor) listFlavor.innerHTML = '';

        categories.forEach(c => {
            if (modalCat && c) modalCat.innerHTML += `<option value="${c}">${c}</option>`;
            if (listCat && c) listCat.innerHTML += `<option value="${c}">`;
        });
        brands.forEach(b => { if (listBrand && b) listBrand.innerHTML += `<option value="${b}">` });
        flavors.forEach(f => { if (listFlavor && f) listFlavor.innerHTML += `<option value="${f}">` });

    } catch (err) {
        console.error("Failed to load dynamic filters:", err);
    }
}
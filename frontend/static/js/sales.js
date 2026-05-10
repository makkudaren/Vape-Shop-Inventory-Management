// ── Auth Guard & Setup ─────────────────────────────────────
const token = localStorage.getItem("access_token");
const role = localStorage.getItem("user_role");
if (!token) window.location.href = "/";

const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

let cart = [];
let posSearchTimeout;

let currentDiscount = 0;
let currentTax = 0;
let currentService = 0;

document.addEventListener("DOMContentLoaded", async () => {
    const gearBtn = document.getElementById("cartOptionsBtn");

    gearBtn.style.display = "inline-flex";
    if (role !== "admin") {
        gearBtn.disabled = true;
        gearBtn.style.opacity = "0.4"; 
        gearBtn.style.cursor = "not-allowed";
        gearBtn.title = "Admin access required";
    }
    
    await loadStoreSettings();
    loadPosFilters(); 
    loadPosProducts();
});
async function loadStoreSettings() {
    try {
        const res = await fetch("/api/sales/settings", { headers });
        if (res.ok) {
            const data = await res.json();
            currentDiscount = data.discount || 0;
            currentTax = data.tax || 0;
            currentService = data.service_fee || 0;
            updateCartUI(); // Refresh the UI with the fetched values
        }
    } catch (err) {
        console.error("Failed to load store settings", err);
    }
}

// ── Order Options Modal ───────────────────────
function openCartOptions() {
    // 1. Fill the modal inputs with the current numbers
    document.getElementById("modalDiscount").value = currentDiscount;
    document.getElementById("modalTax").value = currentTax;
    document.getElementById("modalService").value = currentService;
    
    // 2. Physically open the modal on the screen
    const modal = document.getElementById('cartOptionsModal');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = "flex";
    }
}

// ── Database Syncing ───────────────────────────────────────
async function loadStoreSettings() {
    try {
        const res = await fetch("/api/sales/settings", { headers });
        if (res.ok) {
            const data = await res.json();
            currentDiscount = data.discount || 0;
            currentTax = data.tax || 0;
            currentService = data.service_fee || 0;
            updateCartUI(); // Refresh the Cart summary with the fetched values
        }
    } catch (err) {
        console.error("Failed to load store settings", err);
    }
}

async function saveCartOptions() {
    const newDiscount = parseFloat(document.getElementById("modalDiscount").value) || 0;
    const newTax = parseFloat(document.getElementById("modalTax").value) || 0;
    const newService = parseFloat(document.getElementById("modalService").value) || 0;
    
    // error handling for negative values
    if (newDiscount < 0 || newTax < 0 || newService < 0) {
        showSysMsg("Values cannot be negative.", true);
        return; 
    }

    try {
        // Save to the Database
        const res = await fetch("/api/sales/settings", {
            method: "PUT",
            headers: headers,
            body: JSON.stringify({
                global_discount: newDiscount,
                global_tax: newTax,
                service_fee: newService
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // If the database successfully saved it, update local variables
            currentDiscount = newDiscount;
            currentTax = newTax;
            currentService = newService;
            
            showSysMsg("Store options saved successfully.", false);
            closeModal('cartOptionsModal');
            updateCartUI();
        } else {
            showSysMsg(data.detail || "Failed to save options.", true);
        }
    } catch (err) {
        showSysMsg("Network error saving options.", true);
    }
}

// Reuse the sysMsg
function showSysMsg(msg, isError) {
    const el = document.getElementById("sysMsg");
    if (!el) return;
    el.className = `alert ${isError ? "error" : "success"} show`;
    el.style.display = "flex"; 
    el.innerHTML = `<span>${msg}</span>`;
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => { el.style.display="none"; },400); }, 3000);
}

// ── Modal Close Helper ─────────────────────────────────────
function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "none";
    el.classList.remove("open");
}

// ── Product Fetching (Reuses existing inventory API) ───────
function delayPosSearch() {
    clearTimeout(posSearchTimeout);
    posSearchTimeout = setTimeout(loadPosProducts, 300);
}

async function loadPosFilters() {
    try {
        const [catRes, brandRes, flavorRes] = await Promise.all([
            fetch("/api/inventory/categories", { headers }),
            fetch("/api/inventory/brands", { headers }),
            fetch("/api/inventory/flavors", { headers })
        ]);
        
        const categories = await catRes.json();
        const brands = await brandRes.json();
        const flavors = await flavorRes.json();

        const catSelect = document.getElementById("posCategory");
        catSelect.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(c => { if(c) catSelect.innerHTML += `<option value="${c}">${c}</option>` });

        const brandSelect = document.getElementById("posBrand");
        brandSelect.innerHTML = '<option value="">All Brands</option>';
        brands.forEach(b => { if(b) brandSelect.innerHTML += `<option value="${b}">${b}</option>` });

        const flavorSelect = document.getElementById("posFlavor");
        flavorSelect.innerHTML = '<option value="">All Flavors</option>';
        flavors.forEach(f => { if(f) flavorSelect.innerHTML += `<option value="${f}">${f}</option>` });
    } catch (err) {
        console.error("Failed to load POS filters", err);
    }
}

function clearPosFilters() {
    document.getElementById("posSearch").value = "";
    document.getElementById("posCategory").value = "";
    document.getElementById("posBrand").value = "";
    document.getElementById("posFlavor").value = "";
    document.getElementById("posSort").value = "stock_high";
    loadPosProducts();
}

async function loadPosProducts() {
    const search = document.getElementById("posSearch").value;
    const category = document.getElementById("posCategory").value;
    const brand = document.getElementById("posBrand").value;
    const flavor = document.getElementById("posFlavor").value;
    const sort = document.getElementById("posSort").value;

    // Show/hide the "Clear" button
    const clearBtn = document.getElementById("clearPosBtn");
    if (search !== "" || category !== "" || brand !== "" || flavor !== "" || sort !== "stock_high") {
        clearBtn.style.display = "inline-flex";
    } else {
        clearBtn.style.display = "none";
    }
    
    const query = new URLSearchParams({ search, category, brand, flavor, sort, limit: 40 }).toString();
    
    try {
        const res = await fetch(`/api/inventory?${query}`, { headers });
        const json = await res.json();
        const grid = document.getElementById("posProductGrid");
        grid.innerHTML = "";
        
        if (json.data.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--text-3);">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 16px;">No matching products</p>
                    <p style="margin-bottom: 16px; color: var(--text-2);">We couldn't find any items matching your search or filters.</p>
                    <button class="btn btn-secondary" onclick="clearPosFilters()">Clear Filters</button>
                </div>
            `;
            return;
        }

        json.data.forEach(p => {
            const isOOS = p.stock <= 0;
            
            // Combine Title, Brand, and Flavor for the Cart, and safely escape apostrophes!
            const cartTitle = `${p.title} - ${p.brand} (${p.flavor})`.replace(/'/g, "\\'");
            
            grid.innerHTML += `
                <div class="pos-product-card ${isOOS ? 'out-of-stock' : ''}" onclick="${isOOS ? '' : `addToCart(${p.id}, '${p.sku}', '${cartTitle}', ${p.price}, ${p.stock})`}">
                    <div style="font-size:12px; color:var(--text-3); font-weight:bold; margin-bottom:4px;">${p.sku}</div>
                    
                    <div style="font-size:14px; font-weight:600; color:var(--text-1); margin-bottom:2px; line-height: 1.2;">${p.title}</div>
                    
                    <div style="font-size:12px; color:var(--text-2); margin-bottom:12px;">${p.brand} • ${p.flavor}</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
                        <span style="color:var(--green); font-weight:800; font-size:16px;">₱${p.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        <span style="font-size:12px; color:var(--text-2); background:var(--surface-3); padding:2px 6px; border-radius:4px;">Stock: ${p.stock}</span>
                    </div>
                </div>
            `;
        });
    } catch(e) { console.error("Error loading POS products", e); }
}

// ── Cart Animation Trigger ─────────────────────────────────
function triggerCartItemPop(productId) {
    // Look for the specific item row in the cart
    const itemEl = document.getElementById(`cart-item-${productId}`);
    if (itemEl) {
        itemEl.classList.remove('cart-pop');
        void itemEl.offsetWidth;
        itemEl.classList.add('cart-pop');
    }
}

// ── Cart Logic ─────────────────────────────────────────────
function addToCart(id, sku, title, price, maxStock) {
    const existing = cart.find(i => i.product_id === id);
    if (existing) {
        if (existing.quantity < maxStock) {
            existing.quantity++;
        } else {
            return showSysMsg("Cannot add more than available stock.", true);
        }
    } else {
        cart.push({ product_id: id, sku, title, price, maxStock, quantity: 1 });
    }
    updateCartUI();
    triggerCartItemPop(id);
}

function changeQty(id, delta) {
    const item = cart.find(i => i.product_id === id);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity > item.maxStock) {
        item.quantity = item.maxStock;
        showSysMsg("Max stock reached.", true);
    }
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.product_id !== id);
    }

    updateCartUI();
    
    // 2. Animate the specific item ONLY if we clicked the [+] button (delta > 0) and the item still exists in the cart
    if (delta > 0 && item.quantity > 0) {
        triggerCartItemPop(id); 
    }
}

function clearCart() {
    cart = [];
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById("cartItemsContainer");
    let subtotal = 0;
    let itemCount = 0;
    
    container.innerHTML = "";
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:48px; height:48px; margin-bottom:12px; color:var(--border-hover);">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                <p style="font-weight: 600; color: var(--text-1); margin-bottom: 4px; font-size: 15px;">Cart is empty</p>
                <p style="font-size: 13px; color: var(--text-2); margin: 0;">Tap products on the right to start an order.</p>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const lineTotal = item.price * item.quantity;
            subtotal += lineTotal;
            itemCount += item.quantity;
            
            container.innerHTML += `
                <div class="cart-item" id="cart-item-${item.product_id}">
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:600; color:var(--text-1); line-height:1.2; margin-bottom:4px;">${item.title}</div>
                        <div style="font-size:12px; color:var(--green); font-weight:bold;">₱${item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                    <div class="cart-controls">
                        <button onclick="changeQty(${item.product_id}, -1)">-</button>
                        <span style="font-size:13px; font-weight:bold; width:20px; text-align:center;">${item.quantity}</span>
                        <button onclick="changeQty(${item.product_id}, 1)">+</button>
                    </div>
                </div>
            `;
        });
    }
    
    let taxableAmount = subtotal - currentDiscount;
    if (taxableAmount < 0) taxableAmount = 0; 
    
    // 2. Calculate the actual Peso amount of the tax percentage
    let calculatedTaxAmount = taxableAmount * (currentTax / 100);
    
    // 3. Calculate Final Total
    let total = subtotal - currentDiscount + calculatedTaxAmount + currentService;
    if (total < 0) total = 0;
    
    // Update the displays
    document.getElementById("cartSubtotal").innerText = `₱${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("cartDiscountDisplay").innerText = `- ₱${currentDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("cartTaxLabel").innerText = `Tax (${currentTax}%)`;
    document.getElementById("cartTaxDisplay").innerText = `+ ₱${calculatedTaxAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("cartServiceDisplay").innerText = `+ ₱${currentService.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("cartTotal").innerText = `₱${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById("cartItemCount").innerText = itemCount;
    
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        checkoutBtn.style.opacity = cart.length === 0 ? "0.5" : "1";
    }
}

// ── Checkout ───────────────────────────────────────────────
async function checkout() {
    if (cart.length === 0) return;
    
    // Recalculate the Peso tax amount for the backend
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let taxableAmount = subtotal - currentDiscount;
    if (taxableAmount < 0) taxableAmount = 0;
    let calculatedTaxAmount = taxableAmount * (currentTax / 100);
    
    const payload = {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        discount: currentDiscount,
        tax: calculatedTaxAmount,
        service_fee: currentService
    };
    
    showConfirmModal(
        "Confirm Checkout", 
        "Are you sure you want to finalize this transaction? Stock will be immediately deducted.", 
        "Charge", 
        "btn-primary", 
        async () => {
            try {
                const res = await fetch("/api/sales/checkout", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    // Show success
                    showSysMsg("Transaction successful!", false);
                    
                    // Clear the cart array
                    cart = [];
                    
                    // Redraw the UI
                    updateCartUI();
                    
                    // Fetch the latest stock numbers from the database
                    loadPosProducts();
                    
                } else {
                    showSysMsg(data.detail || "Error processing checkout.", true);
                }
            } catch (err) {
                console.error("Checkout crash:", err);
                showSysMsg("Network error processing checkout.", true);
            }
        }
    );
}

// ── Sales History ──────────────────────────────────────────
async function openSalesHistory() {
    try {
        const res = await fetch("/api/sales/history?limit=20", { headers });
        const json = await res.json();
        const tbody = document.getElementById("salesHistoryBody");
        tbody.innerHTML = "";
        
        json.data.forEach(s => {
            const dateStr = new Date(s.date + "Z").toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Manila' });
            
            // Format the items purchased as a neat list
            const itemList = s.items.map(i => `• ${i.title} (x${i.qty})`).join("<br>");
            
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight: 600; color: var(--text-1);">#${s.id}</td>
                    <td style="white-space:nowrap; font-size:12px; color:var(--text-2);">${dateStr}</td>
                    <td>${s.cashier}</td>
                    <td style="font-size:12px; line-height:1.4;">${itemList}</td>
                    <td style="color:var(--text-2);">₱${s.discount.toFixed(2)}</td>
                    <td style="color:var(--green); font-weight:bold;">₱${s.total.toFixed(2)}</td>
                </tr>
            `;
        });
        
        document.getElementById('salesHistoryModal').classList.add('open');
        document.getElementById('salesHistoryModal').style.display = "flex";
    } catch(e) { showSysMsg("Failed to load history.", true); }
}
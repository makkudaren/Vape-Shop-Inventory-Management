/* ============================================================
   KNE Vape Shop — layout.js
   Runtime behaviour for the app shell.
   Sidebar + header HTML is rendered server-side by Jinja2.
   This file only handles interactivity.
   ============================================================ */

// ── Theme ──────────────────────────────────────────────────
function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('kne_theme', next);
}

// ── Sidebar — desktop collapse ─────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn     = document.getElementById('desktopToggle');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    const collapsed = sidebar.classList.contains('collapsed');
    if (btn) btn.style.transform = collapsed ? 'rotate(180deg)' : '';
    localStorage.setItem('kne_sidebar', collapsed ? 'collapsed' : 'open');
}

// ── Sidebar — mobile drawer ────────────────────────────────
function openMobileSidebar() {
    document.getElementById('sidebar')?.classList.add('mobile-open');
    document.getElementById('sidebarBackdrop')?.classList.add('active');
}
function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
}

// ── Responsive ────────────────────────────────────────────
function checkMobile() {
    const mobile        = window.innerWidth <= 768;
    const mobileBtn     = document.getElementById('mobileMenuBtn');
    const desktopToggle = document.getElementById('desktopToggle');
    if (mobile) {
        if (mobileBtn)     mobileBtn.style.display    = 'flex';
        if (desktopToggle) desktopToggle.style.display = 'none';
    } else {
        if (mobileBtn)     mobileBtn.style.display    = 'none';
        if (desktopToggle) desktopToggle.style.display = 'flex';
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop')?.classList.remove('active');
    }
}

// ── User chip ──────────────────────────────────────────────
function populateUserChip() {
    const name     = localStorage.getItem('kne_user_name') || '';
    const initials = name
        ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';
    const avatarEl = document.getElementById('userAvatar');
    const nameEl   = document.getElementById('userName');
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = name || 'User';
}

// ── Modal helpers ──────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Global Confirmation Modal System ──────────────────────
let currentConfirmCallback = null;

function showConfirmModal(title, message, confirmText, confirmClass, callback) {
    // 1. Set the text
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalMessage').innerText = message;

    // 2. Style the confirm button dynamically (e.g., Red for Delete, Blue for Save)
    const actionBtn = document.getElementById('confirmModalActionBtn');
    actionBtn.innerText = confirmText || 'Confirm';
    actionBtn.className = `btn ${confirmClass || 'btn-danger'}`;

    // 3. Store the action we want to perform if they click yes
    currentConfirmCallback = callback;

    // 4. Open the modal
    const modal = document.getElementById('globalConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        // Tiny timeout to allow display:flex to apply before the opacity animation fires
        setTimeout(() => modal.classList.add('open'), 10);
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('globalConfirmModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 200); // Matches your CSS transition time
    }
    currentConfirmCallback = null; // Clear the memory
}

// Attach the listener to the Confirm button once
document.addEventListener('DOMContentLoaded', () => {
    const actionBtn = document.getElementById('confirmModalActionBtn');
    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (currentConfirmCallback) {
                currentConfirmCallback();
            }
            closeConfirmModal();
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {

    // Restore sidebar collapsed state from previous session
    if (localStorage.getItem('kne_sidebar') === 'collapsed') {
        const sidebar = document.getElementById('sidebar');
        const btn     = document.getElementById('desktopToggle');
        if (sidebar) sidebar.classList.add('collapsed');
        if (btn)     btn.style.transform = 'rotate(180deg)';
    }

    const sidebar = document.getElementById('sidebar');
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar && sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                const btn = document.getElementById('desktopToggle');
                if (btn) btn.style.transform = '';
                localStorage.setItem('kne_sidebar', 'open');
            }
        });
    });

    checkMobile();
    window.addEventListener('resize', checkMobile);
    populateUserChip();

    // Modal: close on backdrop click + shim for style.display toggling
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal(overlay.id);
        });
        new MutationObserver(function () {
            if (overlay.style.display === 'flex') overlay.classList.add('open');
            else if (overlay.style.display === 'none') overlay.classList.remove('open');
        }).observe(overlay, { attributes: true, attributeFilter: ['style'] });
    });
});

// ── Global Logout Function ─────────────────────────────────
async function logout() {
    showConfirmModal(
        "Sign Out",
        "Are you sure you want to sign out? You will need to log in again to access your inventory.",
        "Sign Out",
        "btn-danger",
        async () => {
            // EVERYTHING IN HERE RUNS ONLY IF THEY CLICK "SIGN OUT"
            const token = localStorage.getItem("access_token");

            // 1. Tell the backend to invalidate this specific token
            if (token) {
                try {
                    await fetch("/api/auth/logout", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });
                } catch (err) {
                    console.error("Backend logout network error:", err);
                }
            }

            // 2. Wipe the user's data from the browser's memory
            localStorage.removeItem("access_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_name");

            // 3. Kick them back to the login screen
            window.location.href = "/login";
        }
    );
}
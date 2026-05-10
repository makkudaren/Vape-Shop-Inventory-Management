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
    const mobile = window.innerWidth <= 768;
    if (!mobile) {
        document.getElementById('sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebarBackdrop')?.classList.remove('active');
    }
}

// ── User chip ──────────────────────────────────────────────
function populateUserChip() {
    const name = localStorage.getItem('user_name') || ''; 
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
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalMessage').innerText = message;

    const actionBtn = document.getElementById('confirmModalActionBtn');
    actionBtn.innerText = confirmText || 'Confirm';
    actionBtn.className = `btn ${confirmClass || 'btn-danger'}`;

    currentConfirmCallback = callback;

    const modal = document.getElementById('globalConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('globalConfirmModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.style.display = 'none', 200); 
    }
    currentConfirmCallback = null; 
}

// ── Global Logout Function ─────────────────────────────────
function logout() {
    showConfirmModal(
        "Sign Out",
        "Are you sure you want to sign out? You will need to log in again to access your inventory.",
        "Sign Out",
        "btn-danger",
        async () => {
            const token = localStorage.getItem("access_token");
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

            localStorage.removeItem("access_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_name");
            window.location.href = "/login";
        }
    );
}

// ── MASTER EVENT LISTENER (Runs once when page loads) ──────
document.addEventListener('DOMContentLoaded', function () {
    
    // 1. Setup mobile/desktop responsive tracking
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // 2. Populate the profile name in the top right
    populateUserChip();

    // 3. Attach the Global Confirm Modal Button logic
    const actionBtn = document.getElementById('confirmModalActionBtn');
    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            if (currentConfirmCallback) {
                currentConfirmCallback();
            }
            closeConfirmModal();
        });
    }

    // 4. Sidebar Link Logic (Highlighting & Mobile Close)
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-item');

    navLinks.forEach(link => {
        // Make the active page turn purple
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }

        // Only close the menu if clicking on a mobile device
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
        });
    });

    // 5. General Modal Logic (Click background to close)
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
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

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // Restore sidebar collapsed state
    if (localStorage.getItem('kne_sidebar') === 'collapsed') {
        const sidebar = document.getElementById('sidebar');
        const btn     = document.getElementById('desktopToggle');
        if (sidebar) sidebar.classList.add('collapsed');
        if (btn)     btn.style.transform = 'rotate(180deg)';
    }

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
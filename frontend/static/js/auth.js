function toggleAdminPasscode() {
    const role = document.getElementById("role").value;
    document.getElementById("adminCodeDiv").style.display = role === 'admin' ? 'block' : 'none';
}

function showMessage(msg, isError) {
    const box = document.getElementById("msgBox");
    box.className = 'alert';
    void box.offsetWidth; 
    box.className = `alert ${isError ? 'error' : 'success'}`;
    box.innerText = msg;
}
function parseApiError(data, fallback) {
    if (!data || !data.detail) return fallback;
    
    // If FastAPI sends an array of errors, grab the first one
    if (Array.isArray(data.detail) && data.detail.length > 0) {
        const field = data.detail[0].loc && data.detail[0].loc[1] ? data.detail[0].loc[1] : "Input";
        return `${field}: ${data.detail[0].msg}`;
    }
    
    // Otherwise, return the normal string error
    return typeof data.detail === "string" ? data.detail : fallback;
}

// ── Auth Functions ────────────────────────────────────────
async function handleRegister() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;
    const role = document.getElementById("role").value;
    const admin_passcode = document.getElementById("admin_passcode").value;

    toggleLoading(true);

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, confirm_password, role, admin_passcode })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(parseApiError(data, "Registration failed"));
        
        // Save email locally to pre-fill the verify page
        localStorage.setItem("verify_email", email);
        window.location.href = "/verify"; 
    } catch (err) {
        toggleLoading(false);
        showMessage(err.message, true); 
    }
}

async function handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("loginPassword").value; 

    toggleLoading(true);

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(parseApiError(data, "Login failed"));
        
        // Success: Store the JWT token and user info
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_name", data.name);
        
        // Redirect to page
        window.location.href = "/inventory"; 
        
    } catch (err) {
        toggleLoading(false);
        showMessage(err.message, true);
    }
}

async function handleVerify() {
    const email = document.getElementById("email").value;
    const code = document.getElementById("code").value;

    if (!code || code.length !== 6) {
        showMessage("Please enter the 6-digit verification code.", true);
        return;
    }

    try {
        const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(parseApiError(data, "Verification failed"));
        
        // Show success message and redirect to login after a short delay
        showMessage("Account verified successfully! Redirecting to login...", false);
        
        setTimeout(() => {
            window.location.href = "/";
        }, 2000);
        
    } catch (err) {
        toggleLoading(false);
        showMessage(err.message, true);
    }
}

// ── Loading Spinner Toggle ──────────────────────────────────
function toggleLoading(isLoading) {
    // Automatically finds the main submit button on whatever auth page you are on
    const btn = document.querySelector('.auth-card button.btn-primary');
    if (!btn) return;

    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML; // Save the original text
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
        // Swap to a spinning refresh icon and text
        btn.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Processing...`;
    } else {
        // Restore normal button if there is an error
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerHTML = btn.dataset.originalText;
    }
}

// ── 1. Password Visibility Toggle ─────────────────────────
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        btn.title = "Hide Password";
        // Swap to "Eye Off" icon
        btn.innerHTML = `
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>`;
    } else {
        input.type = "password";
        btn.title = "Show Password";
        // Swap back to "Eye On" icon
        btn.innerHTML = `
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>`;
    }
}

// ── 2. Enter Key Listeners ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    
    // Grab every single input field on the current page
    const inputs = document.querySelectorAll('input');
    
    inputs.forEach(input => {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Stop default browser reloading
                
                // Smart trigger: check the URL path to know which function to fire!
                const path = window.location.pathname;
                
                if (path === "/" || path === "/login") {
                    handleLogin();
                } else if (path === "/register") {
                    handleRegister();
                } else if (path === "/verify") {
                    handleVerify();
                }
            }
        });
    });
});
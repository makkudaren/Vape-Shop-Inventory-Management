function toggleAdminPasscode() {
    const role = document.getElementById("role").value;
    document.getElementById("adminCodeDiv").style.display = role === 'admin' ? 'block' : 'none';
}

function showMessage(msg, isError) {
    const box = document.getElementById("msgBox");
    box.className = `alert ${isError ? 'error' : 'success'}`;
    box.innerText = msg;
}

async function handleRegister() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;
    const role = document.getElementById("role").value;
    const admin_passcode = document.getElementById("admin_passcode").value;

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, confirm_password, role, admin_passcode })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.detail || "Registration failed");
        
        // Save email locally to pre-fill the verify page
        localStorage.setItem("verify_email", email);
        window.location.href = "/verify"; 
    } catch (err) {
        showMessage(err.message, true); // GUI System Message [cite: 239]
    }
}

async function handleLogin() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.detail || "Login failed");
        
        // Success: Store the JWT token and user info
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("user_name", data.name);
        
        // Redirect to page
        window.location.href = "/inventory"; 
        
    } catch (err) {
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
        
        if (!res.ok) throw new Error(data.detail || "Verification failed");
        
        // Show success message and redirect to login after a short delay
        showMessage("Account verified successfully! Redirecting to login...", false);
        
        setTimeout(() => {
            window.location.href = "/";
        }, 2000);
        
    } catch (err) {
        showMessage(err.message, true);
    }
}
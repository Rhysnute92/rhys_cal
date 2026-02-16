document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    // 1. Retrieve the 'saved' user data
    const savedEmail = localStorage.getItem('user_email');
    const accountCreated = localStorage.getItem('user_account_created');

    // 2. Simple Auth Logic
    // In a local-only app, we check if they've registered at least once
    if (accountCreated === 'true' && email === savedEmail) {
        // Successful Login
        localStorage.setItem('user_session', 'active');
        window.location.href = 'index.html';
    } else if (accountCreated !== 'true') {
        alert("No account found. Please register first.");
        window.location.href = 'register.html';
    } else {
        alert("Invalid email. (For local testing, use the email you registered with).");
    }
});
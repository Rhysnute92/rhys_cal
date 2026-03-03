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

function safeLogin() {
    try {
        // 1. Set the session flag FIRST so the dashboard knows you're allowed in
        localStorage.setItem('isLoggedIn', 'true');
        console.log("Login flag set.");

        // 2. Perform the redirect
        // Using window.location.replace is often better for PWAs as it doesn't 
        // keep the login page in the back-button history.
        window.location.replace("./index.html");
        
    } catch (error) {
        console.error("Login redirect failed:", error);
        // Fallback redirect if the above fails
        window.location.href = "index.html";
    }
}

// login.js
(function() {
    // 1. Check if the user is already marked as logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (isLoggedIn === 'true') {
        // 2. Immediate redirect to the dashboard
        console.log("Session found! Redirecting...");
        window.location.href = 'index.html'; // Change this to your main dashboard filename
    }
})();

window.handleLogin = function(event) {
    event.preventDefault();
    
    // Your actual login validation logic here...
    const success = true; // Placeholder for your validation

    if (success) {
        // SAVE the session
        localStorage.setItem('isLoggedIn', 'true');
        
        // Optional: Save user info to display on the dashboard ring
        localStorage.setItem('userName', 'Rhys'); 
        
        window.location.href = 'index.html';
    }
};

window.handleLogin = function(event) {
    event.preventDefault();
    
    const rememberMe = document.getElementById('remember-me').checked;
    const success = true; // Your validation here

    if (success) {
        if (rememberMe) {
            // Persistent: Stays even after closing the browser
            localStorage.setItem('isLoggedIn', 'true');
        } else {
            // Temporary: Clears when the tab/browser is closed
            sessionStorage.setItem('isLoggedIn', 'true');
        }
        
        window.location.href = 'index.html';
    }
};
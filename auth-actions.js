// Handle Password Reset
document.getElementById('resetForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newPass = document.getElementById('newPass').value;
    const confirmPass = document.getElementById('confirmNewPass').value;

    if (newPass !== confirmPass) {
        alert("Passwords do not match!");
        return;
    }

    // Overwrite the saved password in localStorage
    localStorage.setItem('user_password', newPass); // Ensure this key matches your login/register logic
    alert("Password updated successfully!");
    window.location.href = 'index.html';
});

// Handle Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    const confirmLogout = confirm("Are you sure you want to log out?");
    if (confirmLogout) {
        // Remove the session but keep the account data
        localStorage.removeItem('user_session');
        alert("Logged out successfully.");
        window.location.href = 'login.html'; // Redirect to login or splash screen
    }
});
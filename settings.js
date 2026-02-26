// At the top of your scripts, add this check
document.addEventListener('DOMContentLoaded', () => {
    const calorieInput = document.getElementById('dailyCalorieGoal');
    if (calorieInput) { 
        // Only run settings logic if the element actually exists on this page
        calorieInput.value = localStorage.getItem('dailyGoal') || 2000;
    }
});

import { goals, saveState, state, updatePassword } from './state.js';


// Check if we are returning from a password reset email
window.onload = async () => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        const newPass = prompt("Please enter your new password:");
        if (newPass) {
            try {
                await updatePassword(newPass);
                alert("Password updated successfully!");
            } catch (err) {
                alert("Error: " + err.message);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load existing goals into inputs
    const g = JSON.parse(localStorage.getItem('userGoals')) || goals;
    document.getElementById('goalKcal').value = g.restCals || 1800;
    document.getElementById('goalP').value = g.protein || 200;
    document.getElementById('goalC').value = g.carbs || 145;
    document.getElementById('goalF').value = g.fats || 45;

    // 2. Initialize Tile Size
    const savedSize = localStorage.getItem('tileSize') || 160;
    document.getElementById('sizeSlider').value = savedSize;
    document.getElementById('sizeValue').innerText = `${savedSize}px`;

    // 3. Initialize Theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkBtn').innerText = "☀️ Switch to Light Mode";
    }
});

// Example inside saveGoals or addMeal
const calorieInput = document.getElementById('goalKcal').value;
goals.restCals = sanitizeInput(calorieInput); 
// Now, even if the user typed "2,000 kcal", it saves as 2000.


// --- Goal Management ---
export function saveGoals() {
    // 1. Get values from the HTML inputs
    const baseCalories = parseInt(document.getElementById('calories')?.value) || 2000;
    const protein = parseInt(document.getElementById('protein')?.value) || 0;
    const carbs = parseInt(document.getElementById('carbs')?.value) || 0;
    const fat = parseInt(document.getElementById('fat')?.value) || 0;

    // 2. Check if Training Day is active (assuming your toggle has id="trainingMode")
    // If your toggle in index.html is active, we add the 300 kcal bonus
    const isTrainingDay = document.getElementById('trainingMode')?.checked || false;
    
    let finalCalories = baseCalories;
    if (isTrainingDay) {
        finalCalories += 300;
    }

    // 3. Update your state object
    state.goals = {
        baseCalories: baseCalories, // Store the original
        calories: finalCalories,     // Store the calculated total
        protein: protein,
        carbs: carbs,
        fat: fat,
        isTrainingDay: isTrainingDay
    };

    // 4. Save to localStorage
    localStorage.setItem('fitness_settings', JSON.stringify(state.goals));

    alert(`Goals saved! ${isTrainingDay ? "Training (+300)" : "Rest"} mode active.`);

    function updateAuthUI() {
    const authZone = document.getElementById('auth-zone');
    const isLoggedIn = localStorage.getItem('user_session') === 'active';

    if (isLoggedIn) {
        // Show Logout button instead of Login link
        authZone.innerHTML = `
            <button id="navLogoutBtn" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 14px; font-weight: bold;">
                Logout
            </button>
        `;

        // Add the click event for the new logout button
        document.getElementById('navLogoutBtn').addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                localStorage.removeItem('user_session');
                window.location.href = 'login.html';
            }
        });
    } else {
        // Keep the login/register link if no session exists
        authZone.innerHTML = `<a href="login.html" class="secondary-link">Login / Register</a>`;
    }
}

// Run this when the script loads
updateAuthUI();
}

// --- Appearance ---
window.changeTileSize = function(val) {
    document.getElementById('sizeValue').innerText = `${val}px`;
    localStorage.setItem('tileSize', val);
    // This affects the dashboard-grid gap/min-height via CSS variables if you use them
};

window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('darkBtn').innerText = isDark ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode";
};

// --- Dashboard Management ---
window.resetTiles = function() {
    if(confirm("Reset dashboard layout to default?")) {
        localStorage.removeItem('activeTiles');
        localStorage.removeItem('customTiles');
        alert("Dashboard reset! Refreshing...");
        window.location.href = 'index.html';
    }
};

// --- Data Export (Your CSV Function) ---
window.exportDataToCSV = function() {
    const data = {
        Food: JSON.parse(localStorage.getItem('foodLogs')) || {},
        Weight: JSON.parse(localStorage.getItem('weightHistory')) || [],
        Steps: JSON.parse(localStorage.getItem('stepsLog')) || {},
        Sleep: JSON.parse(localStorage.getItem('sleepLog')) || {}
    };

    let csvContent = "data:text/csv;charset=utf-8,Category,Date,Value/Details\n";

    for (let date in data.Food) {
        data.Food[date].forEach(item => {
            csvContent += `Food,${date},"${item.name} (${item.calories}kcal)"\n`;
        });
    }

    data.Weight.forEach(entry => {
        csvContent += `Weight,${entry.date},${entry.weight}kg\n`;
    });

    for (let date in data.Steps) csvContent += `Steps,${date},${data.Steps[date]}\n`;
    for (let date in data.Sleep) csvContent += `Sleep,${date},${data.Sleep[date]}hrs\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fitness_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', () => {
    const calorieInput = document.getElementById('dailyCalorieGoal');
    const saveBtn = document.getElementById('saveSettingsBtn');

    // ONLY execute if these elements exist (prevents the "null" error)
    if (calorieInput && saveBtn) {
        const savedGoal = localStorage.getItem('dailyGoal') || 2000;
        calorieInput.value = savedGoal;

        saveBtn.addEventListener('click', () => {
            localStorage.setItem('dailyGoal', calorieInput.value);
            alert('Goal Saved!');
        });
    }
});

window.confirmWipeData = function() {
    // First Confirmation
    const firstCheck = confirm("Are you sure you want to delete ALL data? This includes food logs, weight history, and settings.");
    
    if (firstCheck) {
        // Second Confirmation with a requirement
        const secondCheck = prompt("To confirm, please type 'DELETE' in the box below:");
        
        if (secondCheck === "DELETE") {
            localStorage.clear();
            alert("All data has been erased. The app will now restart.");
            window.location.href = 'index.html';
        } else {
            alert("Confirmation failed. Data was not deleted.");
        }
    }
};

window.exportDataToCSV = function() {
    const history = JSON.parse(localStorage.getItem('customTilesHistory')) || {};
    let csvContent = "data:text/csv;charset=utf-8,Category,Date,Value\n";

    // Add Custom Trackers to CSV
    for (const date in history) {
        for (const trackerName in history[date]) {
            csvContent += `Tracker - ${trackerName},${date},${history[date][trackerName]}\n`;
        }
    }

    // ... append your existing Food and Weight logic ...
};

const _supabase = supabase.createClient('https://xlutwqwtecrlxadfaifu.supabase.co', 'YOUR_KEYsb_publishable_Kb2eAvRNrDqBGfmuv3ct3Q_2li9wW9p');

// Elements
const authOverlay = document.getElementById('auth-overlay');
const splash = document.getElementById('splash-screen');
const loginContainer = document.getElementById('login-container');
const mainContent = document.getElementById('main-content');

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Check for existing session
    const { data: { session } } = await _supabase.auth.getSession();

    setTimeout(() => {
        if (session) {
            showApp();
        } else {
            showLogin();
        }
    }, 2000); // 2-second splash for branding
});

// Transition to Login
function showLogin() {
    splash.style.display = 'none';
    loginContainer.style.display = 'block';
}

// Transition to Main App
async function showApp() {
    // 1. Get the current logged-in user
    const { data: { user } } = await _supabase.auth.getUser();

    // 2. Fetch their profile from the public table
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('full_name, fitness_goal')
        .eq('id', user.id)
        .single();

    if (profile) {
        // Update your UI (e.g., a welcome message)
        document.querySelector('h1').innerText = `Welcome, ${profile.full_name}`;
    }

    // 3. Reveal the app
    authOverlay.style.opacity = '0';
    setTimeout(() => {
        authOverlay.style.display = 'none';
        mainContent.style.display = 'block';
    }, 500);
}

// Add these to your existing settings.js

async function showApp() {
    const { data: { user } } = await _supabase.auth.getUser();

    // 1. Fetch existing profile data
    const { data: profile, error } = await _supabase
        .from('profiles')
        .select('full_name, fitness_goal')
        .eq('id', user.id)
        .single();

    if (profile) {
        document.getElementById('display-name').value = profile.full_name || "";
        document.getElementById('fitness-goal').value = profile.fitness_goal || "General Health";
        document.querySelector('h1').innerText = `Settings for ${profile.full_name || 'User'}`;
    }

    // 2. Reveal the UI
    authOverlay.style.opacity = '0';
    setTimeout(() => {
        authOverlay.style.display = 'none';
        mainContent.style.display = 'block';
    }, 500);
}

// 3. Handle Saving Changes
document.getElementById('save-profile-btn').onclick = async () => {
    const status = document.getElementById('save-status');
    const newName = document.getElementById('display-name').value;
    const newGoal = document.getElementById('fitness-goal').value;
    
    status.innerText = "Saving...";
    status.style.color = "white";

    const { data: { user } } = await _supabase.auth.getUser();

    const { error } = await _supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: newName,
            fitness_goal: newGoal,
            updated_at: new Date()
        });

    if (error) {
        status.innerText = "Error: " + error.message;
        status.style.color = "#ff4d4d";
    } else {
        status.innerText = "Changes saved successfully!";
        status.style.color = "#4bb543";
        document.querySelector('h1').innerText = `Settings for ${newName}`;
    }
};

// --- HANDLE LOGIN SUBMIT ---
document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        document.getElementById('auth-error').innerText = error.message;
    } else {
        showApp();
    }
};

// --- HANDLE LOGOUT (Triggered by your Logout Card) ---
async function handleLogout() {
    await _supabase.auth.signOut();
    location.reload(); // Re-triggers the splash and shows login
}

// Add this line to "expose" it to the HTML:
window.saveGoals = saveGoals;
window.resetTiles = resetTiles;
window.confirmWipeData = confirmWipeData;

// State variables
let currentMode = 'login'; // Modes: 'login', 'signup', 'reset'

const authTitle = document.getElementById('auth-title');
const passwordWrapper = document.getElementById('password-wrapper');
const submitBtn = document.getElementById('auth-submit-btn');
const toggleText = document.getElementById('toggle-text');
const backToLogin = document.getElementById('link-back-to-login');
const authError = document.getElementById('auth-error');

// --- UI MODE SWITCHER ---
function setAuthMode(mode) {
    currentMode = mode;
    authError.innerText = ""; // Clear errors
    
    if (mode === 'reset') {
        authTitle.innerText = "Reset Password";
        submitBtn.innerText = "Send Recovery Email";
        passwordWrapper.style.display = 'none';
        toggleText.style.display = 'none';
        backToLogin.style.display = 'inline-block';
    } else if (mode === 'signup') {
        authTitle.innerText = "Create Account";
        submitBtn.innerText = "Sign Up";
        passwordWrapper.style.display = 'block';
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-auth">Login</a>';
        backToLogin.style.display = 'none';
        // Re-attach toggle listener because we replaced the HTML
        document.getElementById('toggle-auth').onclick = () => setAuthMode('login');
    } else {
        authTitle.innerText = "Welcome Back";
        submitBtn.innerText = "Login";
        passwordWrapper.style.display = 'block';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-auth">Sign Up</a>';
        backToLogin.style.display = 'none';
        document.getElementById('toggle-auth').onclick = () => setAuthMode('signup');
    }
}

// Event Listeners for switching
document.getElementById('link-forgot').onclick = (e) => { e.preventDefault(); setAuthMode('reset'); };
backToLogin.onclick = (e) => { e.preventDefault(); setAuthMode('login'); };
document.getElementById('toggle-auth').onclick = () => setAuthMode('signup');

// --- UNIFIED FORM SUBMISSION ---
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-pass').value;

    if (currentMode === 'reset') {
        const { error } = await _supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href, // Returns user here to set new pass
        });
        if (error) authError.innerText = error.message;
        else alert("Check your email for the reset link!");
        
    } else if (currentMode === 'signup') {
        const { error } = await _supabase.auth.signUp({ 
            email, password, 
            options: { data: { full_name: "New User" } } // This triggers your SQL function
        });
        if (error) authError.innerText = error.message;
        else alert("Signup successful! Please confirm your email.");
        
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) authError.innerText = error.message;
        else showApp(); // Function from previous steps to hide splash and show dashboard
    }
};
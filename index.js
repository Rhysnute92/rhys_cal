function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const splash = document.getElementById('splash-screen');
    const mainContent = document.querySelector('.main-dashboard');
    const header = document.querySelector('.app-header');

    if (!isLoggedIn) {
        // Hide the app, show only the splash/login
        if (splash) splash.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
        if (header) header.style.display = 'none';
    } else {
        // User is logged in, show the app
        if (splash) splash.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        if (header) header.style.display = 'block';
    }
}

// Run this immediately on every page load
checkAuth();

import { goals, foodData, isTrainingDay, todayKey, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

// Training Day Toggle logic
function toggleTrainingMode() {
    const isTraining = document.getElementById('trainingToggle').checked;
    const foodConsumed = parseInt(document.getElementById('displayFood').innerText) || 0;
    
    // Set goals based on mode
    const baseGoal = 1500;
    const trainingGoal = 1800;
    const currentGoal = isTraining ? trainingGoal : baseGoal;
    
    // Calculate remaining
    const remaining = Math.max(0, currentGoal - foodConsumed);
    
    // 1. Update Text Displays
    document.getElementById('displayGoal').innerText = currentGoal;
    document.getElementById('displayRemaining').innerText = remaining;
    
    // 2. Update Chart Visuals
    calorieChart.data.datasets[0].data = [foodConsumed, remaining];
    calorieChart.update();
    
    console.log(`Goal updated to ${currentGoal} for ${isTraining ? 'Training' : 'Rest'} day.`);
}

// Pedometer Permission
async function requestSensorPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const response = await DeviceMotionEvent.requestPermission();
            if (response === 'granted') {
                alert("Sensors enabled! Walking data will now sync.");
                // Initialize your pedometer logic here
            }
        } catch (err) {
            console.error("Sensor permission denied", err);
        }
    } else {
        alert("Sensor API not supported on this browser or already enabled.");
    }
}

function updateUI() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalFood = meals.reduce((sum, item) => sum + Number(item.calories), 0);

    // Logic: If isTrainingDay is true, use trainCals, else use restCals
    const currentGoal = isTrainingDay ? (goals.restCals + 300) : goals.restCals;
    const remaining = Math.max(0, currentGoal - totalFood);

    if (document.getElementById('displayGoal')) document.getElementById('displayGoal').innerText = currentGoal;
    if (document.getElementById('displayFood')) document.getElementById('displayFood').innerText = totalFood;
    if (document.getElementById('displayRemaining')) document.getElementById('displayRemaining').innerText = remaining;
}

function addNewTile() {
    const tileType = document.getElementById('tileType').value;
    const mainGrid = document.getElementById('mainGrid');
    
    // Create a wrapper div for the new card
    const card = document.createElement('div');
    card.className = 'card stat-card animated-fade-in';
    
    // Define the content based on selection
    let content = '';
    
    switch(tileType) {
        case 'water':
            content = `
                <div class="tile-header"><h4>Water</h4> <span>💧</span></div>
                <div class="stat-val"><span id="waterCount">0</span> <small>ml</small></div>
                <button onclick="updateWater(250)" class="btn-text-small">+ 250ml</button>
            `;
            break;
        case 'sleep':
            content = `
                <div class="tile-header"><h4>Sleep</h4> <span>🌙</span></div>
                <div class="stat-val">0 <small>hrs</small></div>
                <div class="progress-bar"><div class="fill" style="width: 70%"></div></div>
            `;
            break;
        case 'gym':
            content = `
                <div class="tile-header"><h4>Gym</h4> <span>🏋️‍♂️</span></div>
                <div class="stat-val">Push Day</div>
                <p style="font-size: 0.7rem; color: #666;">Last: 2 days ago</p>
            `;
            break;
        default:
            content = `<div class="tile-header"><h4>New Tile</h4></div><p>Content coming soon!</p>`;
    }
    
    card.innerHTML = content;
    mainGrid.appendChild(card);
    
    // Close the modal after adding
    closeModal();
}

// Helper to close modal
function closeModal() {
    document.getElementById('addTileModal').style.display = 'none';
}

// Toggle the splash screen visibility
function toggleSplash(show) {
    const splash = document.getElementById('splash-screen');
    splash.style.display = show ? 'flex' : 'none';
}

// Open/Close Auth Modal
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Handle the "Forgot Password" link
function handleForgotPassword() {
    alert("Redirecting to password reset... (or use the Registration flow as noted).");
}

async function handleAuth(action) {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    if (action === 'login') {
        console.log("Attempting login for:", email);
        // Simulate a successful login
        alert("Welcome back! Syncing your data...");
        closeAuthModal();
        toggleSplash(false); // Hide splash if it's up
    } else if (action === 'signup') {
        console.log("Creating account for:", email);
        window.location.href = 'register.html';
    }
}

let calorieChart;

// 1. Initialization
document.addEventListener('DOMContentLoaded', () => {
    initChart(); // Initialize chart first
    updateUI();  // Then populate with data
    checkAuth(); // Check if we should show splash or dashboard
});

function initChart() {
    const canvas = document.getElementById('calorieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    calorieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consumed', 'Remaining'],
            datasets: [{
                data: [0, 2000],
                backgroundColor: ['#2ecc71', '#f4f7f6'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

// 2. Core UI Update
function updateUI() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalFood = meals.reduce((sum, item) => sum + Number(item.calories), 0);

    // Get goal from state.js
    const isTraining = document.getElementById('trainingToggle')?.checked || false;
    const currentGoal = isTraining ? (goals.restCals + 300) : goals.restCals;
    const remaining = Math.max(0, currentGoal - totalFood);

    if (document.getElementById('displayGoal')) document.getElementById('displayGoal').innerText = currentGoal;
    if (document.getElementById('displayFood')) document.getElementById('displayFood').innerText = totalFood;
    if (document.getElementById('displayRemaining')) document.getElementById('displayRemaining').innerText = remaining;

    if (calorieChart) {
        calorieChart.data.datasets[0].data = [totalFood, remaining];
        calorieChart.update();
    }
}

// 3. Tile Management
window.addNewTile = function() {
    const tileType = document.getElementById('tileType').value;
    const mainGrid = document.getElementById('mainGrid');
    const card = document.createElement('div');
    card.className = 'card stat-card animated-fade-in';
    
    let content = '';
    switch(tileType) {
        case 'water':
            content = `<div class="tile-header"><h4>Water</h4> <span>💧</span></div>
                       <div class="stat-val"><span id="waterCount">0</span> <small>ml</small></div>
                       <button onclick="alert('Water tracking coming soon!')" class="btn-text-small">+ 250ml</button>`;
            break;
        case 'sleep':
            content = `<div class="tile-header"><h4>Sleep</h4> <span>🌙</span></div>
                       <div class="stat-val">0 <small>hrs</small></div>`;
            break;
        default:
            content = `<div class="tile-header"><h4>Activity</h4></div><p>New tracker added!</p>`;
    }
    
    card.innerHTML = content;
    mainGrid.appendChild(card);
    window.closeModal();
};

// 4. Auth & Splash Logic
window.checkAuth = function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const splash = document.getElementById('splash-screen');
    const mainContent = document.querySelector('.main-dashboard');
    const header = document.querySelector('.app-header');

    if (!isLoggedIn) {
        if (splash) splash.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
        if (header) header.style.display = 'none';
    } else {
        if (splash) splash.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        if (header) header.style.display = 'block';
    }
};

// Expose functions to HTML
window.toggleTrainingMode = updateUI; // Use updateUI for the toggle too
window.closeModal = () => document.getElementById('addTileModal').style.display = 'none';
window.handleAuth = (action) => {
    if (action === 'login') {
        localStorage.setItem('isLoggedIn', 'true');
        window.checkAuth();
    }
};
window.toggleTrainingMode = toggleTrainingMode;
window.requestSensorPermission = requestSensorPermission;
window.addNewTile = addNewTile;
window.closeModal = closeModal;
window.handleAuth = handleAuth;
window.closeAuthModal = closeAuthModal;
/* ================================
   GLOBAL STATE & CONFIG
================================ */

// Manages unit preference and persistent data from localStorage
export const weightUnit = localStorage.getItem('weightUnit') || 'kg';

export let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};
export let foodData = JSON.parse(localStorage.getItem('foodData')) || {};
export let waterData = JSON.parse(localStorage.getItem('waterData')) || {};
export let weightHistory = JSON.parse(localStorage.getItem('weightHistory')) || [];
export let isTrainingDay = JSON.parse(localStorage.getItem('isTrainingDay')) || false;

// Fixed Goals as requested: 1500 (Rest) / 1800 (Train)
// Macros are locked at 200g P, 145g C, 45g F for both modes
export let goals = {
    restCals: 1500,
    trainCals: 1800,
    protein: 200,
    carbs: 145,
    fat: 45,
    targetWeight: 75 // Added target weight for the comparison chart
};

export const WATER_GOAL = 2000;

// Expanded Exercise Database including Cardio (Swimming/Walking)
export const gymDB = [
    { name: "Swimming", equipment: "Pool", muscle: "Full Body (Cardio)" },
    { name: "Walking", equipment: "None", muscle: "Legs (Cardio)" },
    { name: "Barbell Bench Press", equipment: "Barbell", muscle: "Chest" },
    { name: "Incline DB Press", equipment: "Dumbbells", muscle: "Chest" },
    { name: "Barbell Squat", equipment: "Barbell", muscle: "Legs" },
    { name: "Leg Press", equipment: "Machine", muscle: "Legs" },
    { name: "Deadlift", equipment: "Barbell", muscle: "Back" },
    { name: "Bent Over Row", equipment: "Barbell", muscle: "Back" },
    { name: "Lat Pulldown", equipment: "Machine", muscle: "Back" },
    { name: "Overhead Press", equipment: "Barbell", muscle: "Shoulders" },
    { name: "Lateral Raise", equipment: "Dumbbells", muscle: "Shoulders" },
    { name: "Bicep Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Tricep Pushdown", equipment: "Cable", muscle: "Arms" },
    { name: "Hammer Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Skull Crushers", equipment: "Barbell", muscle: "Arms" }
];

export let activeLogDate = new Date().toISOString().split('T')[0];

/* ================================
   HELPERS
================================ */

// Saves state to localStorage to ensure data persists on refresh
export function saveState(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Utility to get the current date key (YYYY-MM-DD)
export function todayKey() {
    return new Date().toISOString().split('T')[0];
}

// Handles conversion for weight display
export function getDisplayWeight(kg) {
    return weightUnit === 'lbs'
        ? (kg * 2.20462).toFixed(1)
        : kg.toFixed(1);
}

function getTodayString() {
    const today = new Date();
    // Returns YYYY-MM-DD
    return today.toISOString().split('T')[0];
}

// Calculates totals for any given date
window.getTotalsForDate = function(dateString) {
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};
    const entries = history[dateString] || [];

    return entries.reduce((acc, item) => {
        acc.p += parseFloat(item.protein) || 0;
        acc.c += parseFloat(item.carbs) || 0;
        acc.f += parseFloat(item.fats) || 0;
        acc.kcal += parseInt(item.calories) || 0;
        return acc;
    }, { p: 0, c: 0, f: 0, kcal: 0 });
};

// Specifically updates the card on the Log page
window.updateLogSummaryUI = function() {
    const selectedDate = document.getElementById('logDatePicker').value;
    const totals = getTotalsForDate(selectedDate);
    const summaryDiv = document.getElementById('daySummary');

    if (!summaryDiv) return;

    summaryDiv.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item"><span class="label">Kcal</span><strong>${totals.kcal}</strong></div>
            <div class="summary-item"><span class="label">Prot</span><strong>${totals.p.toFixed(0)}g</strong></div>
            <div class="summary-item"><span class="label">Carb</span><strong>${totals.c.toFixed(0)}g</strong></div>
            <div class="summary-item"><span class="label">Fat</span><strong>${totals.f.toFixed(0)}g</strong></div>
        </div>
    `;
};

/* --- Settings & Goals --- */
window.saveGoals = function() {
    const goals = {
        calories: parseInt(document.getElementById('goalKcal').value) || 2000,
        protein: parseInt(document.getElementById('goalP').value) || 150,
        carbs: parseInt(document.getElementById('goalC').value) || 200,
        fats: parseInt(document.getElementById('goalF').value) || 60
    };
    localStorage.setItem('userGoals', JSON.stringify(goals));
    alert("Goals updated!");
};

/* --- Dynamic Tile Management --- */
window.renderDashboard = function() {
    const grid = document.getElementById('mainGrid');
    const activeTiles = JSON.parse(localStorage.getItem('activeTiles')) || ['nutrition', 'gym', 'settings'];

    grid.innerHTML = activeTiles.map(tile => {
        if (tile === 'nutrition') return createNutritionTile();
        if (tile === 'gym') return createGymTile();
        if (tile === 'settings') return createSettingsTile();
        // Add more logic here for custom tiles
        return `<div class="card"><h3>${tile}</h3><p>Custom Tracker</p></div>`;
    }).join('') + `<div class="card add-tile" onclick="openModal()">+ Add Tile</div>`;
};

function createSettingsTile() {
    return `
        <div class="card settings-tile" onclick="window.location.href='settings.html'">
            <h3>Settings</h3>
            <p>Update Goals & Profile</p>
            <div class="icon-circle">⚙️</div>
        </div>
    `;
}

/* state.js - Shared logic for all pages */
const getToday = () => new Date().toISOString().split('T')[0];

// Universal Update for Dashboard Trackers
window.updateTracker = function(type, val = null) {
    const today = getToday();
    let storageKey = type === 'water' ? 'waterLog' : type === 'steps' ? 'stepsLog' : 'sleepLog';
    let data = JSON.parse(localStorage.getItem(storageKey)) || {};

    if (type === 'water') {
        data[today] = (data[today] || 0) + 1;
    } else if (type === 'steps') {
        const input = prompt("Total steps for today:", data[today] || "");
        if (input === null) return;
        data[today] = parseInt(input) || 0;
    } else if (type === 'sleep') {
        data[today] = parseFloat(val);
    }

    localStorage.setItem(storageKey, JSON.stringify(data));
    if (typeof renderDashboard === "function") renderDashboard();
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};

// Global totals for the Index and Log summaries
window.getTotalsForDate = function(dateString) {
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};
    const entries = history[dateString] || [];
    return entries.reduce((acc, item) => {
        acc.p += parseFloat(item.protein) || 0;
        acc.c += parseFloat(item.carbs) || 0;
        acc.f += parseFloat(item.fats) || 0;
        acc.kcal += parseInt(item.calories) || 0;
        return acc;
    }, { p: 0, c: 0, f: 0, kcal: 0 });
};

window.toggleDarkMode = function() {
    // If the body has dark-theme, remove it and force light-theme
    // If it doesn't, add dark-theme and remove light-theme
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme-preference', 'light');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme-preference', 'dark');
    }
    updateDarkModeButton();
};

function updateDarkModeButton() {
    const btn = document.getElementById('darkBtn');
    if (!btn) return;
    const isDark = document.body.classList.contains('dark-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches && !document.body.classList.contains('light-theme'));

    btn.innerText = isDark ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode";
}

// Apply theme on load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    updateDarkModeButton();
});

/* Standardized Date Fetcher */
window.getToday = function() {
    const now = new Date();
    const year = now.getFullYear();
    // Month is 0-indexed, so we add 1 and pad with a leading zero if needed
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`; // Returns format: "2026-02-11"
};

// Global variable to track what date the user is LOOKING at
window.currentViewDate = getToday();

// Navigate dates
window.changeDate = function(offset) {
    const d = new Date(window.currentViewDate);
    d.setDate(d.getDate() + offset);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    window.currentViewDate = `${year}-${month}-${day}`;

    // Update UI
    if (typeof renderDashboard === "function") renderDashboard();
    updateDateDisplay();
};

// Copy Data Function
window.copyTodayToDate = function() {
    const today = getToday();
    const target = window.currentViewDate;

    if (today === target) {
        alert("You are already looking at today!");
        return;
    }

    // List of keys you want to copy (e.g., water, calories, steps)
    const trackers = ['water', 'calories', 'steps', 'protein'];

    trackers.forEach(key => {
        const todayData = localStorage.getItem(`${key}_${today}`);
        if (todayData) {
            localStorage.setItem(`${key}_${target}`, todayData);
        }
    });

    alert(`Copied today's stats to ${target}!`);
    renderDashboard();
};

window.copyTodayToDate = function() {
    const today = getToday();
    const target = window.currentViewDate;

    if (today === target) return alert("You are already on Today!");

    const todayData = localStorage.getItem(`logs_${today}`);

    if (todayData) {
        localStorage.setItem(`logs_${target}`, todayData);
        loadDiaryEntries(); // Refresh the UI
        alert("Logs copied successfully!");
    } else {
        alert("Nothing found in Today's log to copy.");
    }
};

/* state.js */

window.toggleTrainingDay = function () {
    const today = getToday();
    const key = `isTraining_${today}`;

    // 1. Check if it's currently a training day
    const isTraining = localStorage.getItem(key) === 'true';
    const newState = !isTraining;

    // 2. Save the new state
    localStorage.setItem(key, newState);

    // 3. Update the UI
    updateCalorieGoal();
};

window.updateCalorieGoal = function () {
    const today = getToday();
    const isTraining = localStorage.getItem(`isTraining_${today}`) === 'true';
    const targetDisplay = document.getElementById('targetDisplay');
    const statusText = document.getElementById('trainingStatus');
    const btn = document.getElementById('trainToggleBtn');

    // Default 1500, jumps to 1800 if training
    const goal = isTraining ? 1800 : 1500;

    if (targetDisplay) targetDisplay.innerText = `Goal: ${goal} kcal`;

    if (statusText) {
        statusText.innerText = isTraining ? "Training Day Active" : "Rest Day";
        statusText.style.color = isTraining ? "var(--primary)" : "var(--secondary)";
    }

    if (btn) {
        btn.innerText = isTraining ? "✅ Training Set" : "💪 Mark Training";
        btn.style.background = isTraining ? "#28a745" : "var(--primary)";
    }

    // Save the numeric goal for other parts of the app to use
    localStorage.setItem(`goal_${today}`, goal);
};

// Ensure it loads correctly on page open
document.addEventListener('DOMContentLoaded', updateCalorieGoal);
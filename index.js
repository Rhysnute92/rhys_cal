 import { goals, foodData, isTrainingDay, weightHistory, todayKey, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    initCharts();
});

export function updateDashboard() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totals = meals.reduce((acc, m) => ({
        cals: acc.cals + (m.calories || 0),
        p: acc.p + (m.protein || 0),
        c: acc.c + (m.carbs || 0),
        f: acc.f + (m.fats || 0)
    }), { cals: 0, p: 0, c: 0, f: 0 });

    const currentGoal = isTrainingDay ? goals.trainCals : goals.restCals;

    // Update Text Elements
    if(document.getElementById('dashCals')) document.getElementById('dashCals').innerText = totals.cals;
    if(document.getElementById('calGoal')) document.getElementById('calGoal').innerText = currentGoal;

    // Update Progress Bar
    const pct = Math.min((totals.cals / currentGoal) * 100, 100);
    if(document.getElementById('cal-bar')) document.getElementById('cal-bar').style.width = pct + '%';

    renderCharts(totals);
}

window.toggleTrainingMode = function() {
    const currentState = JSON.parse(localStorage.getItem('isTrainingDay')) || false;
    localStorage.setItem('isTrainingDay', JSON.stringify(!currentState));
    location.reload(); // Refresh to apply new calorie targets
};

function renderCharts(totals) {
    // 1. Macro Pie Chart
    const pieCtx = document.getElementById('macroPieChart')?.getContext('2d');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Protein', 'Carbs', 'Fats'],
                datasets: [{
                    data: [totals.p, totals.c, totals.f],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
                }]
            }
        });
    }

    // 2. 7-Day Weight Comparison
    const weightCtx = document.getElementById('weightComparisonChart')?.getContext('2d');
    if (weightCtx) {
        const last7 = weightHistory.slice(-7);
        new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: last7.map(d => d.date),
                datasets: [{
                    label: 'Weight',
                    data: last7.map(d => d.weight),
                    borderColor: '#4CAF50'
                }, {
                    label: 'Target',
                    data: new Array(last7.length).fill(goals.targetWeight),
                    borderColor: 'red',
                    borderDash: [5, 5]
                }]
            }
        });
    }
}

// index.js
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const totals = getTotalsForDate(today);

    const nutritionTile = document.getElementById('nutritionTile');
    if (nutritionTile) {
        nutritionTile.innerHTML = `
            <h3>Today's Nutrition</h3>
            <div class="tile-stats">
                <p><strong>${totals.kcal}</strong> Calories</p>
                <div class="mini-macro-bar">
                    <span>P: ${totals.p.toFixed(0)}g</span>
                    <span>C: ${totals.c.toFixed(0)}g</span>
                    <span>F: ${totals.f.toFixed(0)}g</span>
                </div>
            </div>
        `;
    }
});

// index.js
document.addEventListener('DOMContentLoaded', () => {
    const calorieGoal = 1800; // You can change this or pull from localStorage
    const today = new Date().toISOString().split('T')[0];

    // Use the function we created earlier
    const totals = getTotalsForDate(today);

    // Calculate percentage (capped at 100%)
    const percentage = Math.min((totals.kcal / calorieGoal) * 100, 100);
    const remaining = calorieGoal - totals.kcal;

    // Update Progress Bar
    const bar = document.getElementById('kcalProgressBar');
    if (bar) {
        bar.style.width = percentage + '%';
        // Change color to red if over goal
        if (totals.kcal > calorieGoal) {
            bar.style.background = '#ff4444';
        }
    }

    // Update Text
    const remainingText = document.getElementById('kcalRemaining');
    if (remainingText) {
        remainingText.innerText = remaining >= 0
            ? `${remaining} kcal remaining`
            : `${Math.abs(remaining)} kcal over goal`;
    }
});

 /* --- Inside your renderDashboard function --- */
 // Add this to your existing switch or if/else block:
 if (tile === 'water') return createWaterTile();

 /* --- The Water Tile Function --- */
 function createWaterTile() {
     const today = new Date().toISOString().split('T')[0];
     const waterHistory = JSON.parse(localStorage.getItem('waterLog')) || {};
     const intake = waterHistory[today] || 0;
     const goal = 8; // Default 8 glasses

     return `
        <div class="card water-tile">
            <div class="water-header">
                <h3>Water</h3>
                <span class="water-count">${intake}/${goal}</span>
            </div>
            <div class="water-grid">
                ${generateWaterIcons(intake)}
            </div>
            <button class="btn-water-add" onclick="addWater()">+ Add Glass</button>
        </div>
    `;
 }

 function generateWaterIcons(count) {
     let icons = '';
     for (let i = 1; i <= 8; i++) {
         icons += `<span class="drop ${i <= count ? 'filled' : ''}">💧</span>`;
     }
     return icons;
 }

 window.addWater = function() {
     const today = new Date().toISOString().split('T')[0];
     const waterHistory = JSON.parse(localStorage.getItem('waterLog')) || {};

     // Increment count for today
     waterHistory[today] = (waterHistory[today] || 0) + 1;

     localStorage.setItem('waterLog', JSON.stringify(waterHistory));

     // Refresh only the dashboard to show the new drop
     renderDashboard();

     // Haptic feedback (vibes when you add water)
     if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
 };

 window.addNewTile = function() {
     const type = document.getElementById('tileType').value;
     const activeTiles = JSON.parse(localStorage.getItem('activeTiles')) || ['nutrition', 'gym', 'settings'];

     if (!activeTiles.includes(type)) {
         activeTiles.push(type);
         localStorage.setItem('activeTiles', JSON.stringify(activeTiles));
         renderDashboard();
     }
     closeModal();
 };

 /* index.js - Dashboard Controller */

 document.addEventListener('DOMContentLoaded', () => {
     // Display today's date in the header
     const options = { weekday: 'long', day: 'numeric', month: 'long' };
     document.getElementById('currentDateDisplay').innerText = new Date().toLocaleDateString(undefined, options);
     renderDashboard();
 });

 window.renderDashboard = function() {
     const grid = document.getElementById('mainGrid');
     if (!grid) return;

     // Default tiles if none are set
     const activeTiles = JSON.parse(localStorage.getItem('activeTiles')) || ['nutrition', 'gym', 'settings'];

     grid.innerHTML = activeTiles.map(tile => {
         switch(tile) {
             case 'nutrition': return createNutritionTile();
             case 'water':     return createWaterTile();
             case 'steps':     return createStepsTile();
             case 'sleep':     return createSleepTile();
             case 'gym':       return createGymTile();
             case 'settings':  return createSettingsTile();
             default: return '';
         }
     }).join('') + `<div class="card add-tile" onclick="openModal()">+ Add Tracker</div>`;
 };

 // --- Tile Creators ---

 function createNutritionTile() {
     const today = new Date().toISOString().split('T')[0];
     const totals = getTotalsForDate(today);
     const goals = JSON.parse(localStorage.getItem('userGoals')) || { calories: 2000 };
     const progress = Math.min((totals.kcal / goals.calories) * 100, 100);

     return `
        <div class="card nutrition-tile" onclick="window.location.href='log.html'">
            <h3>Nutrition</h3>
            <div class="stat-main"><strong>${totals.kcal}</strong> <small>/ ${goals.calories} kcal</small></div>
            <div class="progress-container">
                <div class="progress-fill" style="width: ${progress}%; background: ${totals.kcal > goals.calories ? '#ff4444' : 'var(--primary-color)'}"></div>
            </div>
            <div class="mini-macros">
                <span>P: ${totals.p.toFixed(0)}g</span>
                <span>C: ${totals.c.toFixed(0)}g</span>
                <span>F: ${totals.f.toFixed(0)}g</span>
            </div>
        </div>
    `;
 }

 function createGymTile() {
     const log = JSON.parse(localStorage.getItem('exerciseLog')) || [];
     const lastWorkout = log.length > 0 ? log[log.length - 1].name : "No workouts yet";
     return `
        <div class="card gym-tile" onclick="window.location.href='training.html'">
            <h3>Training</h3>
            <p>Last: ${lastWorkout}</p>
            <div class="icon-circle">🏋️</div>
        </div>
    `;
 }

 function createSettingsTile() {
     return `
        <div class="card settings-tile" onclick="window.location.href='settings.html'">
            <h3>Settings</h3>
            <p>Goals & Layout</p>
            <div class="icon-circle">⚙️</div>
        </div>
    `;
 }

 // --- Modal Controls ---
 window.openModal = () => document.getElementById('addTileModal').style.display = 'flex';
 window.closeModal = () => document.getElementById('addTileModal').style.display = 'none';

 /* --- Steps Tile Function --- */
 function createStepsTile() {
     const today = new Date().toISOString().split('T')[0];
     const stepsData = JSON.parse(localStorage.getItem('stepsLog')) || {};
     const count = stepsData[today] || 0;
     const goal = 10000;
     const progress = Math.min((count / goal) * 100, 100);

     return `
        <div class="card steps-tile">
            <h3>Steps</h3>
            <div class="stat-main">
                <strong>${count.toLocaleString()}</strong> 
                <small>/ ${goal.toLocaleString()}</small>
            </div>
            <div class="progress-container">
                <div class="progress-fill" style="width: ${progress}%; background: #4caf50;"></div>
            </div>
            <button class="btn-tile-action" onclick="updateTracker('steps')">Log Steps</button>
        </div>
    `;
 }

 /* --- Sleep Tile Function --- */
 function createSleepTile() {
     const today = new Date().toISOString().split('T')[0];
     const sleepData = JSON.parse(localStorage.getItem('sleepLog')) || {};
     const hours = sleepData[today] || 0;

     return `
        <div class="card sleep-tile">
            <h3>Sleep</h3>
            <div class="stat-main">
                <strong>${hours}</strong> <small>hrs</small>
            </div>
            <input type="range" min="0" max="12" step="0.5" value="${hours}" 
                   onchange="updateTracker('sleep', this.value)" class="sleep-slider">
            <p class="label">Last Night</p>
        </div>
    `;
 }

 /* index.js - Dashboard Display */
 document.addEventListener('DOMContentLoaded', () => {
     renderDashboard();
     document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString();
 });

 /* index.js - Updated renderDashboard */
/* index.js */

function renderDashboard() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;

    // 1. Load custom tiles from storage
    const customTiles = JSON.parse(localStorage.getItem('customTiles')) || [];

    // 2. Start with Core Tiles (Training & Settings)
    let gridHTML = `
        <div class="card" onclick="location.href='training.html'">
            <span>💪</span>
            <h3>Training</h3>
            <p>View Progress →</p>
        </div>

        <div class="card" onclick="location.href='settings.html'">
            <span>⚙️</span>
            <h3>Settings</h3>
            <p>Customize</p>
        </div>
    `;

    // 3. Add the User's Custom Tiles
    customTiles.forEach((tile, index) => {
        gridHTML += `
            <div class="card" style="position: relative;">
                <span>✨</span>
                <h3>${tile.name}</h3>
                <p>Custom Tracker</p>
                <button onclick="removeTile(${index})" class="delete-btn">×</button>
            </div>
        `;
    });

    // 4. Add the "Add New Tile" prompt button
    gridHTML += `
        <div class="card add-tile-btn" onclick="addNewTilePrompt()">
            <span style="font-size: 2rem; color: var(--primary);">+</span>
            <h3>Add Tile</h3>
            <p>New Feature</p>
        </div>
    `;

    grid.innerHTML = gridHTML;
}

// Function to trigger the prompt and save data
window.addNewTilePrompt = function () {
    const name = prompt("What would you like to track? (e.g., Caffeine, Protein, Stretching)");

    if (name && name.trim() !== "") {
        const customTiles = JSON.parse(localStorage.getItem('customTiles')) || [];

        // Add new tile object
        customTiles.push({
            name: name,
            id: Date.now() // Unique ID for later use
        });

        localStorage.setItem('customTiles', JSON.stringify(customTiles));
        renderDashboard(); // Refresh the screen
    }
};

// Function to delete a custom tile
window.removeTile = function (index) {
    if (confirm("Delete this tile?")) {
        const customTiles = JSON.parse(localStorage.getItem('customTiles')) || [];
        customTiles.splice(index, 1);
        localStorage.setItem('customTiles', JSON.stringify(customTiles));
        renderDashboard();
    }
};

document.addEventListener('DOMContentLoaded', renderDashboard);

// Function to save a new tile to LocalStorage
     window.addNewTilePrompt = function() {
         const name = prompt("What would you like to track? (e.g., Caffeine, Stretching)");
         if (name && name.trim() !== "") {
             const customTiles = JSON.parse(localStorage.getItem('customTiles')) || [];
             customTiles.push({ name: name });
             localStorage.setItem('customTiles', JSON.stringify(customTiles));
             renderDashboard(); // Re-render to show the new tile immediately
         }
     };

// Function to remove a tile
     window.deleteTile = function(index) {
         if(confirm("Delete this tracker?")) {
             const customTiles = JSON.parse(localStorage.getItem('customTiles')) || [];
             customTiles.splice(index, 1);
             localStorage.setItem('customTiles', JSON.stringify(customTiles));
             renderDashboard();
         }
     };

// Initial Render
     document.addEventListener('DOMContentLoaded', renderDashboard);

 function loadDashboard() {
     const today = getToday();
     const waterDrank = localStorage.getItem(`water_${today}`) || 0;

     document.getElementById('water-display').innerText = `${waterDrank} ml`;
     console.log("Loading data for date:", today);
}

/* index.js */

function renderDashboard() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;

    const today = getToday();
    const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];

    // 1. Core Tiles
    let gridHTML = `
        <div class="card" onclick="location.href='training.html'">
            <span>💪</span>
            <h3>Training</h3>
            <p>View Progress →</p>
        </div>
        <div class="card" onclick="location.href='settings.html'">
            <span>⚙️</span>
            <h3>Settings</h3>
            <p>Customize</p>
        </div>
    `;

    // 2. Custom Interactive Tiles
    customTiles.forEach((tile, index) => {
        gridHTML += `
            <div class="card interactive-tile" onclick="incrementTile(${index})">
                <button onclick="event.stopPropagation(); removeTile(${index})" class="delete-btn">×</button>
                <span class="tile-icon">✨</span>
                <h3>${tile.name}</h3>
                <div class="tile-value">${tile.amount}</div>
                <p>${tile.unit}</p>
            </div>
        `;
    });

    // 3. Add Button
    gridHTML += `
        <div class="card add-tile-btn" onclick="addNewTilePrompt()">
            <span>+</span>
            <h3>Add Tracker</h3>
        </div>
    `;

    grid.innerHTML = gridHTML;
}

// Logic to add a new functional tracker
window.addNewTilePrompt = function () {
    const name = prompt("Name (e.g., Water, Coffee, Steps):");
    const unit = prompt("Unit (e.g., ml, cups, count):", "count");
    const step = prompt("Increment amount (e.g., 250, 1):", "1");

    if (name) {
        const today = getToday();
        const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];

        customTiles.push({
            name: name,
            unit: unit,
            step: parseInt(step),
            amount: 0
        });

        localStorage.setItem(`customTiles_${today}`, JSON.stringify(customTiles));
        renderDashboard();
    }
};

// Increment the value when the tile is tapped
window.incrementTile = function (index) {
    const today = getToday();
    const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];

    customTiles[index].amount += customTiles[index].step;

    localStorage.setItem(`customTiles_${today}`, JSON.stringify(customTiles));
    renderDashboard();

    // Haptic feedback for a "real" button feel
    if (navigator.vibrate) navigator.vibrate(30);
};

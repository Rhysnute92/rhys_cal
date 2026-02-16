import { goals, foodData, isTrainingDay, weightHistory, todayKey, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initCharts();
});

function initDashboard() {
    // Display Date
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateElement = document.getElementById('currentDateDisplay');
    if (dateElement) dateElement.innerText = new Date().toLocaleDateString(undefined, options);

    updateTrainingHeader();
    renderDashboard();
}

function updateTrainingHeader() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    
    // Determine goal based on training status
    const currentGoal = isTrainingDay ? goals.trainCals : goals.restCals;
    const statusText = isTrainingDay ? "Training Day" : "Rest Day";

    // Update Top Card
    document.getElementById('calorieGoal').innerText = `${currentGoal} kcal`;
    document.getElementById('dayStatus').innerText = statusText;
    
    const btn = document.getElementById('trainingBtn');
    btn.innerText = isTrainingDay ? "Mark Rest Day" : "Mark Training Day";
    btn.classList.toggle('active-training', isTrainingDay);
}

window.handleTrainingToggle = function() {
    // Toggle state (import logic usually handles this, but here is the setter)
    const newState = !isTrainingDay;
    localStorage.setItem('isTrainingDay', JSON.stringify(newState));
    location.reload(); 
};

window.renderDashboard = function() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;

    const today = todayKey();
    const meals = foodData[today] || [];
    const totals = meals.reduce((acc, m) => ({
        kcal: acc.kcal + (m.calories || 0),
        p: acc.p + (m.protein || 0),
        c: acc.c + (m.carbs || 0),
        f: acc.f + (m.fats || 0)
    }), { kcal: 0, p: 0, c: 0, f: 0 });

    const currentGoal = isTrainingDay ? goals.trainCals : goals.restCals;
    const progress = Math.min((totals.kcal / currentGoal) * 100, 100);

    // 1. Core Nutrition Tile
    let gridHTML = `
        <div class="card grid-tile" onclick="location.href='log.html'">
            <div class="tile-header"><h4>Calories</h4><span>🔥</span></div>
            <div class="tile-value"><span>${totals.kcal}</span> / ${currentGoal}</div>
            <div class="progress-bg">
                <div class="progress-fill" style="width: ${progress}%; background: ${totals.kcal > currentGoal ? '#ff4444' : 'var(--primary)'}"></div>
            </div>
            <div class="mini-macros" style="display:flex; justify-content:space-between; margin-top:10px; font-size:0.75rem;">
                <span>P: ${totals.p}g</span> <span>C: ${totals.c}g</span> <span>F: ${totals.f}g</span>
            </div>
        </div>
    `;

    // 2. Load Custom Dynamic Tiles (Water, Steps, etc.)
    const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];
    customTiles.forEach((tile, index) => {
        gridHTML += `
            <div class="card grid-tile interactive-tile" onclick="incrementTile(${index})">
                <button onclick="event.stopPropagation(); removeTile(${index})" class="delete-btn">×</button>
                <div class="tile-header"><h4>${tile.name}</h4><span>✨</span></div>
                <div class="tile-value">${tile.amount} <small>${tile.unit}</small></div>
                <p style="font-size:0.7rem; color:gray;">Tap to add ${tile.step}</p>
            </div>
        `;
    });

    // 3. Add Button
    gridHTML += `
        <div class="card add-tile-btn" onclick="openModal()">
            <span style="font-size:2rem;">+</span>
            <h3>Add Tracker</h3>
        </div>
    `;

    grid.innerHTML = gridHTML;
};

// --- Custom Tile Logic ---
window.addNewTile = function() {
    const type = document.getElementById('tileType').value;
    const today = todayKey();
    const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];

    const presets = {
        water: { name: 'Water', unit: 'ml', step: 250 },
        steps: { name: 'Steps', unit: 'steps', step: 1000 },
        sleep: { name: 'Sleep', unit: 'hrs', step: 1 },
        gym:   { name: 'Gym', unit: 'sessions', step: 1 }
    };

    customTiles.push({ ...presets[type], amount: 0 });
    localStorage.setItem(`customTiles_${today}`, JSON.stringify(customTiles));
    closeModal();
    renderDashboard();
};

window.incrementTile = function(index) {
    const today = todayKey();
    const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];
    customTiles[index].amount += customTiles[index].step;
    localStorage.setItem(`customTiles_${today}`, JSON.stringify(customTiles));
    renderDashboard();
    if (navigator.vibrate) navigator.vibrate(30);
};

window.removeTile = function(index) {
    const today = todayKey();
    const customTiles = JSON.parse(localStorage.getItem(`customTiles_${today}`)) || [];
    customTiles.splice(index, 1);
    localStorage.setItem(`customTiles_${today}`, JSON.stringify(customTiles));
    renderDashboard();
};

// --- Charts ---
function initCharts() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totals = meals.reduce((acc, m) => ({
        p: acc.p + (m.protein || 0),
        c: acc.c + (m.carbs || 0),
        f: acc.f + (m.fats || 0)
    }), { p: 0, c: 0, f: 0 });

    const pieCtx = document.getElementById('macroPieChart')?.getContext('2d');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Carbs', 'Fats'],
                datasets: [{
                    data: [totals.p, totals.c, totals.f],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '70%', plugins: { legend: { display: false } } }
        });
    }

    const weightCtx = document.getElementById('weightComparisonChart')?.getContext('2d');
    if (weightCtx) {
        const last7 = weightHistory.slice(-7);
        new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: last7.map(d => d.date.split('-').slice(1).join('/')),
                datasets: [{
                    label: 'Weight',
                    data: last7.map(d => d.weight),
                    borderColor: '#4CAF50',
                    tension: 0.3
                }]
            },
            options: { maintainAspectRatio: false }
        });
    }
}

// Modal Controls
window.openModal = () => document.getElementById('addTileModal').style.display = 'flex';
window.closeModal = () => document.getElementById('addTileModal').style.display = 'none';


window.onbeforeprint = () => {
    // 1. Handle the Date header
    const printDate = document.getElementById('printDate');
    if (printDate) {
        printDate.innerText = `Generated on: ${new Date().toLocaleDateString()}`;
    }

    // 2. Populate the Summary Table
    const today = todayKey();
    const meals = foodData[today] || [];
    const tableBody = document.getElementById('foodSummaryBody');
    const tableFoot = document.getElementById('foodSummaryFoot');
    
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';
    
    let totals = { kcal: 0, p: 0, c: 0, f: 0 };

    if (meals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No food logged for today.</td></tr>';
    } else {
        meals.forEach(item => {
            const row = `
                <tr>
                    <td>${item.name || 'Unnamed Item'}</td>
                    <td>${item.calories}</td>
                    <td>${item.protein}g</td>
                    <td>${item.carbs}g</td>
                    <td>${item.fats}g</td>
                </tr>
            `;
            tableBody.innerHTML += row;
            
            // Calculate totals for the footer
            totals.kcal += Number(item.calories);
            totals.p += Number(item.protein);
            totals.c += Number(item.carbs);
            totals.f += Number(item.fats);
        });

        // Inject Totals
        tableFoot.innerHTML = `
            <tr>
                <td>TOTAL</td>
                <td>${totals.kcal}</td>
                <td>${totals.p}g</td>
                <td>${totals.c}g</td>
                <td>${totals.f}g</td>
            </tr>
        `;
    }
};

window.handleTrainingToggle = function() {
    const newState = !isTrainingDay;
    localStorage.setItem('isTrainingDay', JSON.stringify(newState));
    location.reload(); 
};

import { customTilesHistory, customTileConfig, todayKey, saveState } from './state.js';

window.renderDashboard = function() {
    const grid = document.getElementById('mainGrid');
    const today = todayKey();
    
    // Ensure today's entry exists in history
    if (!customTilesHistory[today]) {
        customTilesHistory[today] = {};
    }

    let gridHTML = ``; // Add your core tiles here first...

    customTileConfig.forEach((config, index) => {
        // Get today's count, or 0 if it's a brand new day
        const currentAmount = customTilesHistory[today][config.name] || 0;

        gridHTML += `
            <div class="card grid-tile interactive-tile" onclick="incrementTracker('${config.name}', ${index})">
                <div class="tile-header"><h4>${config.name}</h4><span>${config.icon || '✨'}</span></div>
                <div class="tile-value">${currentAmount} <small>${config.unit}</small></div>
                <p style="font-size:0.7rem; color:gray;">Daily Reset Active</p>
            </div>
        `;
    });

    grid.innerHTML = gridHTML;
};

window.incrementTracker = function(name, configIndex) {
    const today = todayKey();
    const step = customTileConfig[configIndex].step;

    // Update the value for TODAY specifically
    const current = customTilesHistory[today][name] || 0;
    customTilesHistory[today][name] = current + step;

    saveState();
    renderDashboard();
};

function updateUI() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalFood = meals.reduce((sum, item) => sum + Number(item.calories), 0);
    const goal = goals.restCals;
    const remaining = goal - totalFood;

    document.getElementById('displayGoal').innerText = goal.toLocaleString();
    document.getElementById('displayFood').innerText = totalFood.toLocaleString();
    document.getElementById('displayRemaining').innerText = remaining.toLocaleString();
}
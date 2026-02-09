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
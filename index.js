import { goals, foodData, isTrainingDay, todayKey, saveState, customTilesHistory, customTileConfig, dailySteps } from './state.js';
import { initPedometer } from './pedometer.js';

let calorieChart;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initCalorieChart();
});

function initDashboard() {
    // 1. Display Date (Matches the report header logic)
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateText = new Date().toLocaleDateString(undefined, options);
    
    // Use the printDate element if currentDateDisplay is missing
    const dateEl = document.getElementById('currentDateDisplay') || document.getElementById('printDate');
    if (dateEl) dateEl.innerText = dateText;

    // 2. Setup Toggle State
    const toggle = document.getElementById('trainingToggle');
    if (toggle) toggle.checked = isTrainingDay;

    renderDashboard();
}

// --- Dashboard Rendering ---
window.renderDashboard = function() {
    const grid = document.getElementById('mainGrid');
    if (!grid) return;

    const today = todayKey();
    const meals = foodData[today] || [];
    const totals = meals.reduce((acc, m) => ({
        kcal: acc.kcal + (Number(m.calories) || 0),
        p: acc.p + (Number(m.protein) || 0),
        c: acc.c + (Number(m.carbs) || 0),
        f: acc.f + (Number(m.fats) || 0)
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

    // 2. Load Custom Dynamic Tiles from History
    if (!customTilesHistory[today]) customTilesHistory[today] = {};
    
    customTileConfig.forEach((config, index) => {
        const currentAmount = customTilesHistory[today][config.name] || 0;
        gridHTML += `
            <div class="card grid-tile interactive-tile" onclick="incrementTracker('${config.name}', ${index})">
                <div class="tile-header"><h4>${config.name}</h4><span>${config.icon || '✨'}</span></div>
                <div class="tile-value">${currentAmount} <small>${config.unit}</small></div>
                <p style="font-size:0.7rem; color:gray;">Tap to add ${config.step}</p>
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
    updateHeroStats(totals.kcal, currentGoal);
};

// --- Hero Section Updates ---
function updateHeroStats(totalFood, currentGoal) {
    const remaining = Math.max(0, currentGoal - totalFood);

    document.getElementById('displayGoal').innerText = currentGoal.toLocaleString();
    document.getElementById('displayFood').innerText = totalFood.toLocaleString();
    document.getElementById('displayRemaining').innerText = remaining.toLocaleString();

    if (calorieChart) {
        const progress = Math.min(100, (totalFood / currentGoal) * 100);
        calorieChart.data.datasets[0].data = [progress, 100 - progress];
        calorieChart.update();
    }
}

// --- Event Handlers ---
window.toggleTrainingMode = function() {
    const toggle = document.getElementById('trainingToggle');
    // Important: We update the actual variable in state.js memory via local storage
    localStorage.setItem('isTrainingDay', toggle.checked);
    
    // In a real app, you'd export a setter, but since we use location.reload in the past:
    // We will just refresh the UI elements to reflect the new goal
    location.reload(); 
};

window.incrementTracker = function(name, configIndex) {
    const today = todayKey();
    const step = customTileConfig[configIndex].step;
    const current = customTilesHistory[today][name] || 0;
    
    customTilesHistory[today][name] = current + step;
    
    if (navigator.vibrate) navigator.vibrate(30);
    saveState();
    renderDashboard();
};

// --- Charts ---
export function initCalorieChart() {
    const canvas = document.getElementById('calorieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    calorieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#0066ee', '#eef2f3'],
                borderWidth: 0,
                cutout: '85%'
            }]
        },
        options: {
            cutout: '85%',
            plugins: { tooltip: { enabled: false } },
            animation: { duration: 1500, easing: 'easeOutQuart' }
        }
    });
    renderDashboard();
}

// --- Modal & Print Controls ---
window.openModal = () => document.getElementById('addTileModal').style.display = 'flex';
window.closeModal = () => document.getElementById('addTileModal').style.display = 'none';

window.onbeforeprint = () => {
    const today = todayKey();
    const meals = foodData[today] || [];
    const tableBody = document.getElementById('foodSummaryBody');
    const tableFoot = document.getElementById('foodSummaryFoot');
    
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    let totals = { kcal: 0, p: 0, c: 0, f: 0 };

    if (meals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No food logged for today.</td></tr>';
    } else {
        meals.forEach(item => {
            tableBody.innerHTML += `
                <tr>
                    <td>${item.name || 'Unnamed Item'}</td>
                    <td>${item.calories}</td>
                    <td>${item.protein}g</td>
                    <td>${item.carbs}g</td>
                    <td>${item.fats}g</td>
                </tr>`;
            totals.kcal += Number(item.calories);
            totals.p += Number(item.protein);
            totals.c += Number(item.carbs);
            totals.f += Number(item.fats);
        });

        tableFoot.innerHTML = `
            <tr>
                <td>TOTAL</td>
                <td>${totals.kcal}</td>
                <td>${totals.p}g</td>
                <td>${totals.c}g</td>
                <td>${totals.f}g</td>
            </tr>`;
    }
};

import { initPedometer } from './pedometer.js';
import { dailySteps, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    // Start the pedometer
    initPedometer(() => {
        dailySteps++;
        updateStepUI();
        // Save every 10 steps to prevent constant database hitting
        if (dailySteps % 10 === 0) saveState();
    });
});

function updateStepUI() {
    const stepVal = document.getElementById('stepCountDisplay');
    const stepFill = document.getElementById('stepProgressFill');
    const stepGoal = 10000; // Professional standard goal

    if (stepVal) stepVal.innerText = dailySteps.toLocaleString();
    if (stepFill) {
        const progress = (dailySteps / stepGoal) * 100;
        stepFill.style.width = `${Math.min(progress, 100)}%`;
    }
}

window.requestSensorPermission = async () => {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === 'granted') {
            startStepTracking();
        }
    } else {
        // Non-iOS devices usually don't need explicit permission
        startStepTracking();
    }
};

function startStepTracking() {
    startPedometer(() => {
        // 1. Update Global State
        dailySteps++; 
        
        // 2. Update UI immediately
        document.getElementById('liveSteps').innerText = dailySteps;
        document.getElementById('stepFill').style.width = (dailySteps / 10000 * 100) + '%';
        
        // 3. Visual pulse
        const dot = document.getElementById('stepIndicator');
        dot.classList.add('active');
        setTimeout(() => dot.classList.remove('active'), 200);

        // 4. Batch Save to Supabase (every 20 steps to save battery/data)
        if (dailySteps % 20 === 0) saveState();
    });
}
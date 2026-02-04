import { isTrainingDay, save, activeLogDate } from './state.js';
import { foodData, workoutData, weightUnit } from './state.js';

// Initialize the correct page logic based on current URL
window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('log.html')) {
        initFoodPage();
    }
    // Apply theme on load
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
});

window.toggleDarkMode = function() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

window.toggleTrainingMode = function() {
    const checkbox = document.getElementById('trainingMode');
    const statusText = document.getElementById('trainingStatusText');
    const isTraining = checkbox.checked;

    save('isTrainingDay', isTraining);
    statusText.innerText = isTraining ? "Training Day (1800 kcal)" : "Rest Day (1500 kcal)";
};

window.dismissQuickStart = function() {
    document.getElementById('quickStartCard').style.display = 'none';
};

/* ================================
   DASHBOARD
================================ */

export function updateCalorieDisplay() {
    const goal = goals.trainCals;
    const meals = foodData[todayKey()] || [];
    const consumed = meals.reduce((s,m)=>s+(m.calories||0),0);

    const el = document.getElementById('remainingCalories');
    if (el) el.innerText = goal - consumed;
}

/* ================================
   FOOD LOG
================================ */

export function renderFoodLog() {
    const el = document.getElementById('todayFoodList');
    if (!el) return;

    const meals = foodData[activeLogDate] || [];
    el.innerHTML = meals.length
        ? meals.map((m,i)=>`
            <div class="card">
                <strong>${m.name}</strong>
                <button onclick="deleteMeal(${i})">✕</button>
            </div>
        `).join('')
        : `<p class="hint">No entries.</p>`;
}

/* ================================
   WATER
================================ */

export function updateWaterUI() {
    const val = waterData[todayKey()] || 0;
    const pct = Math.min((val / WATER_GOAL) * 100, 100);

    if (document.getElementById('dashWater')) {
        dashWater.innerText = val;
        document.getElementById('water-bar-dash').style.width = pct + '%';
    }
}

/* ================================
   THEME + INIT
================================ */

export function initTheme() {
    document.documentElement.setAttribute(
        'data-theme',
        localStorage.getItem('theme') || 'light'
    );
}

/* ================================
   SINGLE BOOTSTRAP
================================ */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateCalorieDisplay();
    updateWaterUI();
});

import { initFoodPage } from './log.js';

function switchTab(tab) {
    if (tab === 'log') initFoodPage();
}



export function renderCharts() {
    const weightCtx = document.getElementById('weightChart');
    const historyCtx = document.getElementById('historyChart');

    if (weightCtx) {
        new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: Object.keys(workoutData).slice(-7), // Last 7 days
                datasets: [{
                    label: `Weight (${weightUnit})`,
                    data: Object.values(workoutData).map(d => d.weight),
                    borderColor: '#4CAF50',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                }]
            },
            options: {responsive: true, maintainAspectRatio: false}
        });
    }

    if (historyCtx) {
        const labels = Object.keys(foodData).slice(-7);
        const dailyCals = labels.map(date =>
            foodData[date].reduce((sum, meal) => sum + (meal.calories || 0), 0)
        );

        new Chart(historyCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Calories Consumed',
                    data: dailyCals,
                    backgroundColor: '#2c3e50',
                    borderRadius: 5
                }]
            }
        });
    }
}

function updateDashboardStats() {
    const today = getTodayKey();
    const meals = state.foodData[today] || [];

    // 1. Calculate Totals
    let totals = { cals: 0, p: 0, c: 0, f: 0 };
    meals.forEach(m => {
        totals.cals += m.calories || 0;
        totals.p += m.protein || 0;
        totals.c += m.carbs || 0;
        totals.f += m.fats || 0;
    });

    // 2. Define Goals (You can move these to state.js later)
    const goals = { cals: 2500, p: 180, c: 250, f: 80 };

    // 3. Update Text and Bars
    document.getElementById('dashCals').innerText = totals.cals;
    document.getElementById('cals-bar-dash').style.width = Math.min((totals.cals / goals.cals) * 100, 100) + "%";

    updateMacroBar('p', totals.p, goals.p);
    updateMacroBar('c', totals.c, goals.c);
    updateMacroBar('f', totals.f, goals.f);
}

// Helper to update individual macro UI
function updateMacroBar(id, current, goal) {
    const percent = Math.min((current / goal) * 100, 100);
    document.getElementById(`${id}-val`).innerText = `${current}g`;
    document.getElementById(`${id}-bar`).style.width = percent + "%";
}

// --- GOAL MODAL UI ---
function toggleGoalModal(show) {
    const modal = document.getElementById('goalModal');
    if (!modal) return;

    modal.style.display = show ? 'flex' : 'none';

    if (show) {
        // Fill the inputs with current values from state.js
        document.getElementById('goalCals').value = state.goals.cals;
        document.getElementById('goalP').value = state.goals.p;
        document.getElementById('goalC').value = state.goals.c;
        document.getElementById('goalF').value = state.goals.f;
        document.getElementById('goalSteps').value = state.goals.steps;
    }
}

function applyGoals() {
    const newGoals = {
        cals: parseInt(document.getElementById('goalCals').value) || 0,
        p: parseInt(document.getElementById('goalP').value) || 0,
        c: parseInt(document.getElementById('goalC').value) || 0,
        f: parseInt(document.getElementById('goalF').value) || 0,
        steps: parseInt(document.getElementById('goalSteps').value) || 10000
    };

    saveGoals(newGoals); // Calls the function in state.js
    toggleGoalModal(false);
}


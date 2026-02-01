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



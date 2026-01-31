import {
    foodData, waterData, goals, WATER_GOAL,
    save, todayKey, activeLogDate
} from './state.js';

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

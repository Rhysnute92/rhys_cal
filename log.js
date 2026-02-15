/* log.js */
import { getToday } from './state.js'; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Set a global date if not already set
    if (!window.currentViewDate) {
        window.currentViewDate = (typeof getToday === 'function') ? getToday() : new Date().toISOString().split('T')[0];
    }
    
    // Sync the date picker UI
    const picker = document.getElementById('logDatePicker');
    if (picker) {
        picker.value = window.currentViewDate;
    }

    refreshUI();
});

// Helper to update everything at once
function refreshUI() {
    displayDailyLog();
    if (window.renderWeeklyChart) window.renderWeeklyChart();
}

// --- ATTACH TO WINDOW (Fixes "Not Defined" errors) ---

window.startCamera = function() {
    const overlay = document.getElementById('scannerOverlay');
    if (overlay) overlay.style.display = 'block';
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) { console.error(err); return; }
        Quagga.start();
    });

    Quagga.onDetected((data) => {
        window.stopScanner();
        fetchFoodData(data.codeResult.code);
    });
};

window.stopScanner = function() {
    Quagga.stop();
    const overlay = document.getElementById('scannerOverlay');
    if (overlay) overlay.style.display = 'none';
};

window.quickAdd = function(name, cals, p, c, f, category) {
    const date = document.getElementById('logDatePicker').value;
    const logKey = `logs_${date}`;
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];

    logs.push({
        id: Date.now(),
        name,
        calories: parseInt(cals),
        protein: parseFloat(p),
        carbs: parseFloat(c),
        fat: parseFloat(f),
        meal: category
    });

    localStorage.setItem(logKey, JSON.stringify(logs));
    refreshUI();
};

window.saveScannedFood = function() {
    const foodName = document.getElementById('foodSearch').value;
    if (!foodName) return alert("Please enter a food name.");

    const date = document.getElementById('logDatePicker').value;
    const logKey = `logs_${date}`;
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];

    logs.push({
        id: Date.now(),
        name: foodName,
        calories: parseInt(document.getElementById('manualCal').value) || 0,
        protein: parseFloat(document.getElementById('manualP')?.value) || 0,
        carbs: parseFloat(document.getElementById('manualC')?.value) || 0,
        fat: parseFloat(document.getElementById('manualF')?.value) || 0,
        meal: document.getElementById('mealType').value
    });

    localStorage.setItem(logKey, JSON.stringify(logs));
    document.getElementById('manualEntryForm').style.display = 'none';
    refreshUI();
};

window.displayDailyLog = function() {
    const container = document.getElementById('dailyLogList');
    const picker = document.getElementById('logDatePicker');
    if (!container || !picker) return;

    const selectedDate = picker.value;
    const logs = JSON.parse(localStorage.getItem(`logs_${selectedDate}`)) || [];
    
    container.innerHTML = "";
    const meals = ['Breakfast', 'Dinner', 'Tea', 'Snacks', 'Drinks'];
    let dayTotals = { kcal: 0, p: 0, c: 0, f: 0 };

    meals.forEach(mealType => {
        const mealLogs = logs.filter(l => l.meal === mealType);
        let mealKcal = 0;

        const itemsHtml = mealLogs.map(l => {
            mealKcal += l.calories;
            dayTotals.kcal += l.calories;
            dayTotals.p += (l.protein || 0);
            dayTotals.c += (l.carbs || 0);
            dayTotals.f += (l.fat || 0);
            return `
                <div class="meal-item">
                    <span>${l.name}</span>
                    <div class="log-actions">
                        <strong>${l.calories} kcal</strong>
                        <button class="delete-btn" onclick="deleteItem(${l.id})">×</button>
                    </div>
                </div>`;
        }).join('');

        const section = document.createElement('div');
        section.className = "meal-group card";
        section.innerHTML = `
            <div class="meal-header">
                <h3>${mealType}</h3>
                <span>${mealKcal} kcal</span>
            </div>
            <div class="meal-items-list">${itemsHtml || '<p class="empty-msg">No entries</p>'}</div>
        `;
        container.appendChild(section);
    });

    updateMacroUI(dayTotals);
};

function updateMacroUI(totals) {
    const targets = { p: 200, c: 145, f: 45 };
    
    const updateBar = (id, current, target, barId) => {
        const percent = Math.min((current / target) * 100, 100);
        const textEl = document.getElementById(id);
        const barEl = document.getElementById(barId);
        if (textEl) textEl.innerText = `${Math.round(current)} / ${target}g`;
        if (barEl) barEl.style.width = percent + "%";
    };

    updateBar('txtP', totals.p, targets.p, 'barP');
    updateBar('txtC', totals.c, targets.c, 'barC');
    updateBar('txtF', totals.f, targets.f, 'barF');
}

window.deleteItem = function(id) {
    const date = document.getElementById('logDatePicker').value;
    const logKey = `logs_${date}`;
    let logs = JSON.parse(localStorage.getItem(logKey)) || [];
    logs = logs.filter(item => item.id !== id);
    localStorage.setItem(logKey, JSON.stringify(logs));
    refreshUI();
};

window.clearDailyLog = function() {
    const date = document.getElementById('logDatePicker').value;
    if (confirm(`Clear all entries for ${date}?`)) {
        localStorage.removeItem(`logs_${date}`);
        refreshUI();
    }
};

window.renderWeeklyChart = function() {
    const chartContainer = document.getElementById('weeklyChart');
    const labelContainer = document.getElementById('chartLabels');
    if (!chartContainer || !labelContainer) return;

    chartContainer.innerHTML = '';
    labelContainer.innerHTML = '';

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString([], { weekday: 'short' });

        const logs = JSON.parse(localStorage.getItem(`logs_${dateStr}`)) || [];
        const totalCals = logs.reduce((sum, item) => sum + (item.calories || 0), 0);
        const height = Math.min((totalCals / 2500) * 100, 100);

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        bar.setAttribute('data-value', totalCals);
        chartContainer.appendChild(bar);

        const label = document.createElement('span');
        label.innerText = dayName;
        labelContainer.appendChild(label);
    }
};

window.selectTab = function(element, category) {
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('mealType').value = category;
};
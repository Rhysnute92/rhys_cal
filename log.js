/* log.js */
import { getToday } from './state.js';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    window.currentViewDate = getToday();
    
    // Set date picker to today
    const picker = document.getElementById('logDatePicker');
    if (picker) picker.value = window.currentViewDate;

    refreshUI();
});

// --- HELPER: Refresh all UI components ---
function refreshUI() {
    displayDailyLog();
    renderWeeklyChart();
}

// --- SCANNER LOGIC ---
window.startCamera = function () {
    document.getElementById('scannerOverlay').style.display = 'block';
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
        const code = data.codeResult.code;
        window.stopScanner();
        fetchFoodData(code);
    });
};

window.stopScanner = function () {
    Quagga.stop();
    document.getElementById('scannerOverlay').style.display = 'none';
};

async function fetchFoodData(barcode) {
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();
        if (data.status === 1) {
            const p = data.product;
            document.getElementById('manualEntryForm').style.display = 'block';
            document.getElementById('foodSearch').value = p.product_name || "Unknown Item";
            document.getElementById('manualCal').value = Math.round(p.nutriments['energy-kcal_100g'] || 0);
            document.getElementById('manualP').value = p.nutriments.proteins_100g || 0;
            document.getElementById('manualC').value = p.nutriments.carbohydrates_100g || 0;
            document.getElementById('manualF').value = p.nutriments.fat_100g || 0;
            document.getElementById('manualEntryForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("Product not found.");
        }
    } catch (e) {
        alert("Error fetching food data.");
    }
}

// --- LOGGING LOGIC ---
window.saveScannedFood = function () {
    const date = document.getElementById('logDatePicker').value;
    const logKey = `logs_${date}`;
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];

    const newItem = {
        id: Date.now(),
        name: document.getElementById('foodSearch').value,
        calories: parseInt(document.getElementById('manualCal').value) || 0,
        protein: parseFloat(document.getElementById('manualP').value) || 0,
        carbs: parseFloat(document.getElementById('manualC').value) || 0,
        fat: parseFloat(document.getElementById('manualF').value) || 0,
        meal: document.getElementById('mealType').value,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (!newItem.name) return alert("Please enter a food name.");

    logs.push(newItem);
    localStorage.setItem(logKey, JSON.stringify(logs));
    
    document.getElementById('manualEntryForm').style.display = 'none';
    refreshUI();
};

window.quickAdd = function (name, cals, p, c, f, category) {
    const date = document.getElementById('logDatePicker').value;
    const logKey = `logs_${date}`;
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];

    logs.push({
        id: Date.now(),
        name,
        calories: cals,
        protein: p,
        carbs: c,
        fat: f,
        meal: category
    });

    localStorage.setItem(logKey, JSON.stringify(logs));
    if (window.navigator.vibrate) window.navigator.vibrate(20);
    refreshUI();
};

// --- UI DISPLAY LOGIC ---
window.displayDailyLog = function () {
    const selectedDate = document.getElementById('logDatePicker').value;
    const logs = JSON.parse(localStorage.getItem(`logs_${selectedDate}`)) || [];
    const container = document.getElementById('dailyLogList');
    container.innerHTML = "";

    const meals = ['Breakfast', 'Dinner', 'Tea', 'Snacks', 'Drinks'];
    let totals = { kcal: 0, p: 0, c: 0, f: 0 };

    meals.forEach(mealType => {
        const mealLogs = logs.filter(l => l.meal === mealType);
        let mealTotalKcal = 0;

        const mealSection = document.createElement('div');
        mealSection.className = "meal-group card";

        const itemsHtml = mealLogs.map(l => {
            mealTotalKcal += l.calories;
            totals.kcal += l.calories;
            totals.p += l.protein;
            totals.c += l.carbs;
            totals.f += l.fat;
            return `
                <div class="meal-item">
                    <span>${l.name} <small>(P:${l.protein}g)</small></span>
                    <div class="log-actions">
                        <strong>${l.calories} kcal</strong>
                        <button class="delete-btn" onclick="deleteItem(${l.id})">×</button>
                    </div>
                </div>`;
        }).join('');

        mealSection.innerHTML = `
            <div class="meal-header">
                <h3>${mealType}</h3>
                <span>${mealTotalKcal} kcal</span>
            </div>
            <div class="meal-items-list">${itemsHtml || '<p class="empty-msg">No entries</p>'}</div>
        `;
        container.appendChild(mealSection);
    });

    updateMacroProgress(totals);
};

function updateMacroProgress(totals) {
    const targets = { p: 200, c: 145, f: 45 };
    
    const updateBar = (id, current, target, barId) => {
        const percent = Math.min((current / target) * 100, 100);
        document.getElementById(id).innerText = `${Math.round(current)} / ${target}g`;
        document.getElementById(barId).style.width = percent + "%";
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
    if(confirm(`Clear all entries for ${date}?`)) {
        localStorage.removeItem(`logs_${date}`);
        refreshUI();
    }
};

// --- CHART LOGIC ---
window.renderWeeklyChart = function () {
    const chartContainer = document.getElementById('weeklyChart');
    const labelContainer = document.getElementById('chartLabels');
    if (!chartContainer) return;

    chartContainer.innerHTML = '';
    labelContainer.innerHTML = '';

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString([], { weekday: 'short' });

        const logs = JSON.parse(localStorage.getItem(`logs_${dateStr}`)) || [];
        const totalCals = logs.reduce((sum, item) => sum + (item.calories || 0), 0);
        
        const height = Math.min((totalCals / 2500) * 100, 100); // Scale to 2500 kcal

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
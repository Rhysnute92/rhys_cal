import { state, saveState, todayKey } from "./state.js";

// ---------- CONFIG & GLOBALS ----------
const GOAL_KEY = "macroGoals";
let editingIndex = null;
let scanning = false;
let pieChart, weekChart;

// DOM Elements
const elements = {
    foodList: document.getElementById('foodList'),
    dayTotal: document.getElementById('dayTotal'),
    datePicker: document.getElementById('datePicker'),
    macroPie: document.getElementById('macroPie'),
    weeklyChart: document.getElementById('weeklyChart'),
    cameraOverlay: document.getElementById('cameraOverlay')
};

// ---------- INITIALIZATION ----------
document.addEventListener('DOMContentLoaded', () => {
    elements.datePicker.value = todayKey();
    render();
});

elements.datePicker.onchange = render;

// ---------- CORE LOGIC ----------

window.saveEntry = () => {
    const name = document.getElementById('foodName').value;
    const cals = parseInt(document.getElementById('calories').value) || 0;
    const p = parseInt(document.getElementById('protein').value) || 0;
    const c = parseInt(document.getElementById('carbs').value) || 0;
    const f = parseInt(document.getElementById('fat').value) || 0;
    const meal = document.getElementById('meal-type').value;

    if (!name || cals <= 0) {
        alert("Please enter a food name and calories.");
        return;
    }

    const dateKey = elements.datePicker.value;
    if (!state.foodLogs[dateKey]) state.foodLogs[dateKey] = [];

    const entry = { id: Date.now(), name, calories: cals, protein: p, carbs: c, fat: f, meal };

    if (editingIndex !== null) {
        const idx = state.foodLogs[dateKey].findIndex(e => e.id === editingIndex);
        state.foodLogs[dateKey][idx] = entry;
        editingIndex = null;
    } else {
        state.foodLogs[dateKey].push(entry);
    }

    saveState();
    clearInputs();
    render();
};

window.deleteEntry = (id) => {
    const dateKey = elements.datePicker.value;
    state.foodLogs[dateKey] = state.foodLogs[dateKey].filter(item => item.id !== id);
    saveState();
    render();
};

const clearInputs = () => {
    ['foodName', 'calories', 'protein', 'carbs', 'fat'].forEach(id => {
        document.getElementById(id).value = '';
    });
};

// ---------- SCANNING LOGIC ----------

window.startBarcodeScanner = () => {
    elements.cameraOverlay.style.display = "block";
    Quagga.init({
        inputStream: { type: "LiveStream", target: "#interactive", constraints: { facingMode: "environment" } },
        decoder: { readers: ["ean_reader", "upc_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) return console.error(err);
        Quagga.start();
        scanning = true;
    });

    Quagga.onDetected(res => {
        stopScanner();
        lookupBarcode(res.codeResult.code);
    });
};

window.stopScanner = () => {
    Quagga.stop();
    scanning = false;
    elements.cameraOverlay.style.display = "none";
};

async function lookupBarcode(code) {
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        if (data.status === 1) {
            const p = data.product;
            document.getElementById('foodName').value = p.product_name || "";
            document.getElementById('calories').value = p.nutriments["energy-kcal_100g"] || 0;
            document.getElementById('protein').value = p.nutriments.proteins_100g || 0;
            document.getElementById('carbs').value = p.nutriments.carbohydrates_100g || 0;
            document.getElementById('fat').value = p.nutriments.fat_100g || 0;
        }
    } catch (e) { alert("Barcode search failed."); }
}

// AI Meal Scan (File Input Approach)
const aiInput = document.createElement('input');
aiInput.type = 'file'; aiInput.accept = 'image/*'; aiInput.capture = 'environment';

window.startMealScan = () => aiInput.click();

aiInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Placeholder for AI API
    const mockData = { name: "AI Identified Meal", calories: 450, protein: 30, carbs: 40, fat: 15 };
    
    document.getElementById('foodName').value = mockData.name;
    document.getElementById('calories').value = mockData.calories;
    document.getElementById('protein').value = mockData.protein;
    document.getElementById('carbs').value = mockData.carbs;
    document.getElementById('fat').value = mockData.fat;
};

// ---------- RENDERING & CHARTS ----------

function render() {
    const dateKey = elements.datePicker.value;
    const entries = state.foodLogs[dateKey] || [];
    let totals = { cal: 0, p: 0, c: 0, f: 0 };

    // Update List
    elements.foodList.innerHTML = entries.length ? '' : '<p class="text-muted">No food logged yet.</p>';
    entries.forEach(e => {
        totals.cal += e.calories; totals.p += e.protein; totals.c += e.carbs; totals.f += e.fat;
        const div = document.createElement('div');
        div.className = 'food-item';
        div.innerHTML = `
            <div><strong>${e.name}</strong><br><small>${e.calories}kcal | P:${e.protein}g</small></div>
            <button onclick="deleteEntry(${e.id})" class="btn-delete">✕</button>`;
        elements.foodList.appendChild(div);
    });

    elements.dayTotal.innerText = `${totals.cal} kcal`;
    
    updateCharts(totals);
}

function updateCharts(t) {
    // Pie Chart
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(elements.macroPie, {
        type: 'doughnut',
        data: {
            labels: ['P', 'C', 'F'],
            datasets: [{ data: [t.p, t.c, t.f], backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    // Weekly Chart Logic
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        const dayTotal = (state.foodLogs[key] || []).reduce((s, e) => s + e.calories, 0);
        return { label: d.getDate(), value: dayTotal };
    });

    if (weekChart) weekChart.destroy();
    weekChart = new Chart(elements.weeklyChart, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => d.label),
            datasets: [{ label: 'Calories', data: last7Days.map(d => d.value), backgroundColor: '#4CAF50' }]
        }
    });
}
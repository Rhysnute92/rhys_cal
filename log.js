/* =========================================
   1. IMPORTS FROM YOUR STATE.JS
   ========================================= */
import { 
    state, 
    saveState, 
    todayKey, 
    getCurrentCalorieGoal,
    foodData,   // This is your log storage
    goals,       // This contains trainCals, restCals, protein, etc.
    auth
} from "./state.js";

/* =========================================
   2. UI & SCANNER GLOBALS
   ========================================= */
let ui = {};
let scanData100g = null; 

// Helper to get selected date or today
const getActiveDate = () => ui.datePicker?.value || todayKey();

/* =========================================
   3. BARCODE SCANNER
   ========================================= */
window.startBarcodeScanner = function() {
    const overlay = document.getElementById('cameraOverlay');
    overlay.style.display = 'flex';

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: { facingMode: "environment" },
            willReadFrequently: true 
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "code_128_reader"] 
        }
    }, function (err) {
        if (err) return console.error(err);
        Quagga.start();
        Quagga.onDetected(handleDetection);
    });
};

function handleDetection(data) {
    const code = data.codeResult.code;
    window.stopScanner();
    lookupBarcode(code);
}

window.stopScanner = function() {
    Quagga.stop();
    document.getElementById('cameraOverlay').style.display = 'none';
};

async function lookupBarcode(code) {
    const nameInput = document.getElementById("foodName");
    nameInput.placeholder = "Searching...";

    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;
            const n = p.nutriments || {};

            scanData100g = {
                kcal: n["energy-kcal_100g"] || 0,
                p: n.proteins_100g || 0,
                c: n.carbohydrates_100g || 0,
                f: n.fat_100g || 0
            };

            nameInput.value = p.product_name || "Unknown Product";
            window.recalculateMacros(); 
        } else {
            alert("Product not found.");
        }
    } catch (e) {
        alert("Search failed.");
    }
}

window.recalculateMacros = function() {
    if (!scanData100g) return;
    const weight = parseFloat(document.getElementById("servingWeight")?.value) || 100;
    const factor = weight / 100;

    document.getElementById("calories").value = Math.round(scanData100g.kcal * factor);
    document.getElementById("protein").value = (scanData100g.p * factor).toFixed(1);
    document.getElementById("carbs").value = (scanData100g.c * factor).toFixed(1);
    document.getElementById("fat").value = (scanData100g.f * factor).toFixed(1);
};

/* =========================================
   4. ENTRY MANAGEMENT (Updated for foodData)
   ========================================= */
window.saveEntry = function () {
    const name = document.getElementById("foodName").value;
    const cals = parseInt(document.getElementById("calories").value) || 0;

    if (!name || cals <= 0) return alert("Enter name and calories.");

    const dateKey = getActiveDate();
    
    // Ensure the date array exists in foodData (from state.js)
    if (!foodData[dateKey]) foodData[dateKey] = [];

    foodData[dateKey].push({
        id: Date.now(),
        name,
        calories: cals,
        protein: parseFloat(document.getElementById("protein").value) || 0,
        carbs: parseFloat(document.getElementById("carbs").value) || 0,
        fat: parseFloat(document.getElementById("fat").value) || 0
    });

    saveState(); // This now saves locally AND to Supabase
    resetInputs();
    render();
};

function resetInputs() {
    ["foodName", "calories", "protein", "carbs", "fat"].forEach(id => {
        document.getElementById(id).value = "";
    });
    document.getElementById("servingWeight").value = "100";
    scanData100g = null;
}

window.deleteEntry = function (id) {
    const dateKey = getActiveDate();
    foodData[dateKey] = (foodData[dateKey] || []).filter(item => item.id !== id);
    saveState();
    render();
};

/* =========================================
   5. RENDERING (Updated for goals)
   ========================================= */
function render() {
    const dateKey = getActiveDate();
    const entries = foodData[dateKey] || [];
    
    // Use goals from state.js (handles train vs rest)
    const currentGoal = getCurrentCalorieGoal();

    const totals = { cal: 0, p: 0, c: 0, f: 0 };

    if (ui.foodList) {
        ui.foodList.innerHTML = entries.length ? "" : `<p class="text-muted">No food logged today.</p>`;
        entries.forEach(item => {
            totals.cal += item.calories;
            totals.p += item.protein;
            totals.c += item.carbs;
            totals.f += item.fats;

            const div = document.createElement("div");
            div.className = "food-item";
            div.innerHTML = `
                <div><strong>${item.name}</strong><br><small>${item.calories} kcal</small></div>
                <button onclick="deleteEntry(${item.id})" class="btn-delete">✕</button>`;
            ui.foodList.appendChild(div);
        });
    }

    if (ui.dayTotalText) ui.dayTotalText.innerText = `${totals.cal} / ${currentGoal} kcal`;
    
    updateProgressRing(totals.cal, currentGoal);
    renderSummaryTable(totals);
}

function renderSummaryTable(totals) {
    const summaryBody = document.getElementById("summary-body");
    if (!summaryBody) return;

    // Mapping rows to the 'goals' object from state.js
    const rows = [
        { label: "Protein", goal: goals.protein, actual: totals.p },
        { label: "Carbs", goal: goals.carbs, actual: totals.c },
        { label: "Fat", goal: goals.fats, actual: totals.f } // Note: your state uses 'fats'
    ];

    summaryBody.innerHTML = rows.map(r => {
        const left = Math.max(r.goal - Math.round(r.actual), 0);
        return `<tr>
            <td><strong>${r.label}</strong></td>
            <td>${r.goal}g</td>
            <td>${Math.round(r.actual)}g</td>
            <td class="${left === 0 ? 'text-success' : ''}">${left}g</td>
        </tr>`;
    }).join("");
}

function updateProgressRing(current, goal) {
    const circle = document.querySelector(".progress-ring__circle");
    if (!circle) return;
    const circumference = 2 * Math.PI * 50; 
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const percent = Math.min((current / goal) * 100, 100);
    circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
}

/* =========================================
   6. QUICK ACTIONS
   ========================================= */
window.quickAdd = function (name, p, c, f) {
    const dateKey = getActiveDate();
    if (!foodData[dateKey]) foodData[dateKey] = [];
    foodData[dateKey].push({
        id: Date.now(),
        name,
        calories: (p * 4) + (c * 4) + (f * 9),
        protein: p, carbs: c, fat: f
    });
    saveState();
    render();
};

window.copyFromYesterday = function () {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().split('T')[0];
    const yData = foodData[yKey] || [];

    if (yData.length === 0) return alert("Nothing to copy!");
    
    const targetKey = getActiveDate();
    const cloned = yData.map(item => ({ ...item, id: Date.now() + Math.random() }));
    foodData[targetKey] = [...(foodData[targetKey] || []), ...cloned];
    
    saveState();
    render();
};

/* =========================================
   7. INIT
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    ui = {
        datePicker: document.getElementById("datePicker"),
        foodList: document.getElementById("foodList"),
        dayTotalText: document.getElementById("dayTotal")
    };

    if (ui.datePicker) {
        ui.datePicker.value = todayKey();
        ui.datePicker.addEventListener("change", render);
    }

    render();
});
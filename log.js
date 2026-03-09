import { state, saveState, todayKey } from "./state.js";

/* -------------------------------------------------------
 * 1. UI CACHE (populated after DOMContentLoaded)
 * -----------------------------------------------------*/
let ui = {};
let allData = JSON.parse(localStorage.getItem('fitnessData')) || {};

/* -------------------------------------------------------
 * 2. HELPERS
 * -----------------------------------------------------*/
const getActiveDate = () =>
    ui.datePicker?.value || todayKey();

window.startBarcodeScanner = function() {
    const overlay = document.getElementById('cameraOverlay');
    overlay.style.display = 'flex'; // Show the overlay

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'), // Target the div
            constraints: {
                facingMode: "environment" // Use back camera
            },
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "code_128_reader"] 
        }
    }, function (err) {
        if (err) {
            console.error(err);
            alert("Camera initialization failed.");
            return;
        }
        Quagga.start();

    Quagga.onDetected(handleDetection);
    });
}

function handleDetection(data) {
    const code = data.codeResult.code;
    console.log("Barcode detected:", code);
    stopScanner();
    lookupBarcode(code);
}

window.stopScanner = function() {
    Quagga.stop();
    document.getElementById('cameraOverlay').style.display = 'none';
}

async function lookupBarcode(code) {
    // 1. Give the user some visual feedback
    const nameInput = document.getElementById("foodName");
    const originalPlaceholder = nameInput.placeholder;
    nameInput.placeholder = "Searching database...";
    nameInput.value = "";

    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;
            const nutriments = p.nutriments || {};

            // Update UI with found data (falling back to 0 if null)
            nameInput.value = p.product_name || "Unknown Product";
            document.getElementById("calories").value = Math.round(nutriments["energy-kcal_100g"] || 0);
            document.getElementById("protein").value = nutriments.proteins_100g || 0;
            document.getElementById("carbs").value = nutriments.carbohydrates_100g || 0;
            document.getElementById("fat").value = nutriments.fat_100g || 0;
            
            console.log(`Success: Found ${p.product_name}`);
        } else {
            alert("Product not found in database.");
            nameInput.placeholder = originalPlaceholder;
        }
    } catch (e) {
        console.error("Lookup failed", e);
        alert("Network error. Check your connection.");
    }
}

function recalculateMacros() {
    // If we haven't scanned anything yet, or the weight is empty, stop.
    if (!rawData) return;

    let weight = parseFloat(document.getElementById("servingWeight").value);
    
    // Safety check: if weight is 0 or not a number, default to 0 for calculations
    if (isNaN(weight) || weight < 0) weight = 0;

    const factor = weight / 100;

    // Apply the factor to the 100g base data
    document.getElementById("calories").value = Math.round(rawData.kcal * factor);
    document.getElementById("protein").value = (rawData.p * factor).toFixed(1);
    document.getElementById("carbs").value = (rawData.c * factor).toFixed(1);
    document.getElementById("fat").value = (rawData.f * factor).toFixed(1);
}

/* -------------------------------------------------------
 * 4. ENTRY MANAGEMENT
 * -----------------------------------------------------*/
window.saveEntry = function () {
    const name = document.getElementById("foodName").value;
    const cals = parseInt(document.getElementById("calories").value) || 0;
    const p = parseInt(document.getElementById("protein").value) || 0;
    const c = parseInt(document.getElementById("carbs").value) || 0;
    const f = parseInt(document.getElementById("fat").value) || 0;

    if (!name || cals <= 0) {
        alert("Please enter a name and calories.");
        return;
    }

    const dateKey = getActiveDate();
    if (!state.foodLogs[dateKey]) state.foodLogs[dateKey] = [];

    state.foodLogs[dateKey].push({
        id: Date.now(),
        name,
        calories: cals,
        protein: p,
        carbs: c,
        fat: f
    });

    saveState();
    resetInputs();
    render();
};

window.deleteEntry = function (id) {
    const dateKey = getActiveDate();
    state.foodLogs[dateKey] = state.foodLogs[dateKey].filter(
        item => item.id !== id
    );
    saveState();
    render();
};

/* -------------------------------------------------------
 * 5. PROGRESS RING
 * -----------------------------------------------------*/
function updateProgressRing(current, goal = state.dailyGoal || 1800) {
    const circle = document.querySelector(".progress-ring__circle");
    if (!circle) return;

    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    const percent = Math.min((current / goal) * 100, 100);
    const offset = circumference - (percent / 100) * circumference;

    circle.style.strokeDashoffset = offset;
}

/* -------------------------------------------------------
 * 6. RENDER
 * -----------------------------------------------------*/
function render() {
    const todayDate = new Date().toISOString().split('T')[0];
    
    // Safety check: If allData exists but today's date doesn't, default to empty
    const dayEntries = (allData && allData[todayDate]) ? allData[todayDate] : [];
    
    // Now you can map/loop through dayEntries without it crashing
    const foodList = document.getElementById("foodList");
    if (dayEntries.length === 0) {
        foodList.innerHTML = '<p class="text-muted">No food logged yet today.</p>';
        return;
    }
    // ... rest of your render logic
}
    const dayEntries = allData[todayDate] || [];
    const goals = state.macroGoals || {
        protein: 200,
        carbs: 150,
        fat: 50
    };

    const totals = { cal: 0, p: 0, c: 0, f: 0 };

    /* --- LIST --- */
    if (ui.foodList) {
        ui.foodList.innerHTML = entries.length
            ? ""
            : `<p class="text-muted">No food logged yet.</p>`;

        entries.forEach(item => {
            totals.cal += item.calories;
            totals.p += item.protein || 0;
            totals.c += item.carbs || 0;
            totals.f += item.fat || 0;

            const div = document.createElement("div");
            div.className = "food-item";
            div.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${item.calories} kcal</small>
                </div>
                <button onclick="deleteEntry(${item.id})" class="btn-delete">✕</button>
            `;
            ui.foodList.appendChild(div);
        });
    }

    /* --- TOTAL CALS --- */
    if (ui.dayTotalText) ui.dayTotalText.innerText = `${totals.cal} kcal`;

    updateProgressRing(totals.cal);

    /* --- SUMMARY TABLE --- */
    const summaryBody = document.getElementById("summary-body");
    if (summaryBody) {
        const rows = [
            { label: "Protein", goal: goals.protein, actual: totals.p },
            { label: "Carbs", goal: goals.carbs, actual: totals.c },
            { label: "Fat", goal: goals.fat, actual: totals.f }
        ];

        summaryBody.innerHTML = rows
            .map(r => {
                const left = Math.max(r.goal - r.actual, 0);
                return `
                    <tr>
                        <td><strong>${r.label}</strong></td>
                        <td>${r.goal}g</td>
                        <td>${r.actual}g</td>
                        <td class="${left === 0 ? "text-success" : ""}">${left}g</td>
                    </tr>
                `;
            })
            .join("");
    }

/* -------------------------------------------------------
 * 7. GOALS
 * -----------------------------------------------------*/
window.toggleGoals = function () {
    const editor = document.getElementById("goals-editor");
    if (editor) editor.classList.toggle("hidden");
};

window.saveGoals = function () {
    const p = parseInt(document.getElementById("goalP").value) || 200;
    const c = parseInt(document.getElementById("goalC").value) || 150;
    const f = parseInt(document.getElementById("goalF").value) || 50;

    const newCalGoal = p * 4 + c * 4 + f * 9;

    state.dailyGoal = newCalGoal;
    state.macroGoals = { protein: p, carbs: c, fat: f };

    saveState();
    window.toggleGoals();
    render();

    alert(`Goal updated to ${newCalGoal} kcal!`);
};

/* -------------------------------------------------------
 * 8. QUICK ADD
 * -----------------------------------------------------*/
window.quickAdd = function (name, p, c, f) {
    const calories = p * 4 + c * 4 + f * 9;

    const dateKey = getActiveDate();
    if (!state.foodLogs[dateKey]) state.foodLogs[dateKey] = [];

    state.foodLogs[dateKey].push({
        id: Date.now(),
        name,
        calories,
        protein: p,
        carbs: c,
        fat: f
    });

    saveState();
    render();
};

/* -------------------------------------------------------
 * 9. COPY FROM YESTERDAY
 * -----------------------------------------------------*/
window.copyFromYesterday = function () {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayData = allData[yesterdayStr] || [];

    if (yesterdayData.length === 0) {
        alert("No entries found for yesterday!");
        return;
    }

    if (currentItems.length > 0) {
        if (!confirm("Add yesterday's items to today?")) return;
    }

    const cloned = yesterdayData.map(item => ({
        ...item,
        id: Date.now() + Math.random()
    }));

    state.foodLogs[currentDate] = [...currentItems, ...cloned];
    saveState();
    render();

    alert(`Copied ${cloned.length} items from ${yesterdayKey}`);
};

/* -------------------------------------------------------
 * 10. INIT
 * -----------------------------------------------------*/
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

    /* --- Macro auto-calculation --- */
    ["protein", "carbs", "fat"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => {
            const p = parseInt(document.getElementById("protein").value) || 0;
            const c = parseInt(document.getElementById("carbs").value) || 0;
            const f = parseInt(document.getElementById("fat").value) || 0;

            document.getElementById("calories").value =
                p * 4 + c * 4 + f * 9;
        });
    });

    render();
});

import { state, saveState, todayKey } from "./state.js";

/**
 * 1. UTILITY & STATE HELPERS
 */
const getActiveDate = () => document.getElementById('datePicker')?.value || todayKey();

/**
 * 2. CAMERA & SCANNER LOGIC
 * Hidden by default, toggled via window functions
 */
window.startBarcodeScanner = function() {
    const overlay = document.getElementById('cameraOverlay');
    if (!overlay) return;

    overlay.classList.remove('hidden'); // Show the camera UI
    document.body.style.overflow = 'hidden'; // Prevent scrolling while scanning

    Quagga.init({
        inputStream: {
            type: "LiveStream",
            target: document.querySelector("#interactive"),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "upc_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) {
            console.error("Quagga Init Error:", err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected((res) => {
        window.stopScanner();
        lookupBarcode(res.codeResult.code);
    });
};

window.stopScanner = function() {
    Quagga.stop();
    const overlay = document.getElementById('cameraOverlay');
    if (overlay) overlay.classList.add('hidden'); // Hide the camera UI
    document.body.style.overflow = 'auto';
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
    } catch (e) {
        console.error("Lookup failed", e);
    }
}

/**
 * 3. ENTRY MANAGEMENT
 */
window.saveEntry = function() {
    const name = document.getElementById('foodName').value;
    const cals = parseInt(document.getElementById('calories').value) || 0;
    const p = parseInt(document.getElementById('protein').value) || 0;
    const c = parseInt(document.getElementById('carbs').value) || 0;
    const f = parseInt(document.getElementById('fat').value) || 0;

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

window.deleteEntry = function(id) {
    const dateKey = getActiveDate();
    state.foodLogs[dateKey] = state.foodLogs[dateKey].filter(item => item.id !== id);
    saveState();
    render();
};

function resetInputs() {
    ['foodName', 'calories', 'protein', 'carbs', 'fat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

/**
 * 4. RENDERING & VISUALS
 */
function updateProgressRing(current, goal = 2500) {
    const circle = document.querySelector('.progress-ring__circle');
    if (!circle) return;

    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const percent = Math.min((current / goal) * 100, 100);
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function render() {
    const dateKey = ui.datePicker?.value || todayKey();
    const entries = state.foodLogs[dateKey] || [];
    const goals = state.macroGoals || { protein: 200, carbs: 150, fat: 50 };
    
    let totals = { cal: 0, p: 0, c: 0, f: 0 };

    // 1. Process List and Totals
    if (ui.foodList) {
        ui.foodList.innerHTML = entries.length ? "" : '<p class="text-muted">No food logged yet.</p>';
        entries.forEach(item => {
            totals.cal += item.calories;
            totals.p += (item.protein || 0);
            totals.c += (item.carbs || 0);
            totals.f += (item.fat || 0);
            
            const div = document.createElement('div');
            div.className = 'food-item';
            div.innerHTML = `<div><strong>${item.name}</strong><br><small>${item.calories} kcal</small></div>
                             <button onclick="deleteEntry(${item.id})" class="btn-delete">✕</button>`;
            ui.foodList.appendChild(div);
        });
    }

    // 2. Update Progress Ring and Total Text
    if (ui.dayTotalText) ui.dayTotalText.innerText = `${totals.cal} kcal`;
    updateProgressRing(totals.cal);

    // 3. Update Summary Table
    const summaryBody = document.getElementById('summary-body');
    if (summaryBody) {
        const rows = [
            { label: 'Protein', goal: goals.protein, actual: totals.p },
            { label: 'Carbs',   goal: goals.carbs,   actual: totals.c },
            { label: 'Fat',     goal: goals.fat,     actual: totals.f }
        ];

        summaryBody.innerHTML = rows.map(r => {
            const left = Math.max(r.goal - r.actual, 0);
            return `
                <tr>
                    <td><strong>${r.label}</strong></td>
                    <td>${r.goal}g</td>
                    <td>${r.actual}g</td>
                    <td class="${left === 0 ? 'text-success' : ''}">${left}g</td>
                </tr>
            `;
        }).join('');
    }
}

/**
 * 5. INIT
 */
document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('datePicker');
    if (picker) {
        picker.value = todayKey();
        picker.addEventListener('change', render);
    }

    // --- Add your macro input listeners here ---
    const macroInputs = ['protein', 'carbs', 'fat'];
    macroInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const p = parseInt(document.getElementById('protein').value) || 0;
            const c = parseInt(document.getElementById('carbs').value) || 0;
            const f = parseInt(document.getElementById('fat').value) || 0;

            document.getElementById('calories').value = (p * 4) + (c * 4) + (f * 9);
        });
    });

    render();
});

// Toggle the goal editor visibility
window.toggleGoals = function() {
    const editor = document.getElementById('goals-editor');
    editor.classList.toggle('hidden');
};

// Save new goals and refresh the Progress Ring
window.saveGoals = function() {
    const p = parseInt(document.getElementById('goalP').value) || 200;
    const c = parseInt(document.getElementById('goalC').value) || 150;
    const f = parseInt(document.getElementById('goalF').value) || 50;
    
    // Calculate total calorie goal based on macros (4/4/9 rule)
    // 1g Protein = 4kcal, 1g Carb = 4kcal, 1g Fat = 9kcal
    const newCalGoal = (p * 4) + (c * 4) + (f * 9);
    
    state.dailyGoal = newCalGoal;
    state.macroGoals = { protein: p, carbs: c, fat: f };
    
    saveState();
    window.toggleGoals();
    render(); // This will trigger updateProgressRing with the new goal
    alert(`Goal updated to ${newCalGoal} kcal!`);
};

window.quickAdd = function(name, p, c, f) {
    // Calculate calories based on the 4/4/9 rule
    const calories = (p * 4) + (c * 4) + (f * 9);
    
    const dateKey = ui.datePicker?.value || todayKey();
    if (!state.foodLogs[dateKey]) state.foodLogs[dateKey] = [];

    state.foodLogs[dateKey].push({
        id: Date.now(),
        name: name,
        calories: calories,
        protein: p,
        carbs: c,
        fat: f
    });

    saveState();
    render();
    
    // Optional feedback
    console.log(`Quick added: ${name}`);
};

window.copyFromYesterday = function() {
    // 1. Get the date currently selected in the picker
    const currentDateValue = ui.datePicker?.value || todayKey();
    const currentItems = state.foodLogs[currentDateValue] || [];

    // 2. Calculate "Yesterday" relative to the picker
    const dateObj = new Date(currentDateValue);
    dateObj.setDate(dateObj.getDate() - 1);
    const yesterdayKey = dateObj.toISOString().split('T')[0];

    const yesterdayItems = state.foodLogs[yesterdayKey] || [];

    if (yesterdayItems.length === 0) {
        alert("No entries found for " + yesterdayKey);
        return;
    }

    // 3. Confirm overwrite if items already exist
    if (currentItems.length > 0) {
        if (!confirm("This will add yesterday's items to your current log. Continue?")) return;
    }

    // 4. Clone items with new IDs
    const clonedItems = yesterdayItems.map(item => ({
        ...item,
        id: Date.now() + Math.random(), // Ensure unique ID for deletion
        date: currentDateValue // Update date property if your state uses it
    }));

    // 5. Save and Refresh
    state.foodLogs[currentDateValue] = [...currentItems, ...clonedItems];
    saveState();
    render();
    
    alert(`Successfully copied ${clonedItems.length} items from ${yesterdayKey}`);
};
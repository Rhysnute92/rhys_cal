import {foodData, goals, activeLogDate, save, todayKey} from './state.js';
import {renderFoodLog} from "./ui";
import * as state from "./state";

/* ================================
   FOOD LOG INITIALIZATION
================================ */

export function initFoodPage() {
    renderDateStrip();
    renderFoodLog();
    renderMacroTargets();
    renderFrequentFoods();
}

/* ================================
   DATE STRIP
================================ */

export function renderDateStrip() {
    const strip = document.getElementById('dateStrip');
    if (!strip) return;

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return d;
    });

    strip.innerHTML = days.map(d => {
        const key = d.toISOString().split('T')[0];
        const selected = key === activeLogDate;

        return `
            <div onclick="selectLogDate('${key}')"
                 class="date-pill ${selected ? 'active' : ''}">
                <small>${d.toLocaleDateString(undefined,{weekday:'short'})}</small>
                <strong>${d.getDate()}</strong>
            </div>
        `;
    }).join('');
}

export function selectLogDate(date) {
    window.activeLogDate = date;
    renderDateStrip();
    renderFoodLog();
    renderMacroTargets();
}

/* ================================
   FOOD CRUD
================================ */

function addFoodManually() {
    // 1. Capture all values
    const name = document.getElementById('manualName').value || "Unnamed Meal";
    const cals = parseInt(document.getElementById('manualCals').value) || 0;
    const p = parseInt(document.getElementById('manualP').value) || 0;
    const c = parseInt(document.getElementById('manualC').value) || 0;
    const f = parseInt(document.getElementById('manualF').value) || 0;

    const today = getTodayKey();

    // 2. Add to state
    if (!state.foodData[today]) state.foodData[today] = [];

    state.foodData[today].push({
        name: name,
        calories: cals,
        protein: p,
        carbs: c,
        fats: f,
        timestamp: new Date().getTime()
    });

    // 3. Persist and Update UI
    saveData('foodData', state.foodData);
    updateDashboardStats(); // This triggers the new bars you added

    // 4. Reset Form
    document.getElementById('manualName').value = '';
    document.getElementById('manualCals').value = '';
    document.getElementById('manualP').value = '';
    document.getElementById('manualC').value = '';
    document.getElementById('manualF').value = '';
}

/* ================================
   MACROS
================================ */

export function renderMacroTargets() {
    const el = document.getElementById('macroTargetDisplay');
    if (!el) return;

    const meals = foodData[activeLogDate] || [];

    const totals = meals.reduce((a,m)=>({
        p: a.p + (m.protein||0),
        f: a.f + (m.fat||0),
        c: a.c + (m.carbs||0)
    }),{p:0,f:0,c:0});

    el.innerHTML = [
        ['P', totals.p, goals.protein],
        ['F', totals.f, goals.fat],
        ['C', totals.c, goals.carbs]
    ].map(([k,v,g])=>`
        <div>
            <strong>${k}</strong>
            <div>${v} / ${g}g</div>
            <div class="progress-bg">
                <div class="progress-fill" style="width:${Math.min((v/g)*100,100)}%"></div>
            </div>
        </div>
    `).join('');
}

/* ================================
   FREQUENT FOODS
================================ */

export function renderFrequentFoods() {
    const el = document.getElementById('frequentFoodsList');
    if (!el) return;

    const counts = {};
    Object.values(foodData).flat().forEach(f => {
        counts[f.name] = (counts[f.name] || 0) + 1;
    });

    const top = Object.keys(counts)
        .sort((a,b)=>counts[b]-counts[a])
        .slice(0,5);

    el.innerHTML = top.length
        ? top.map(name=>`
            <button onclick="quickAddFood('${name}')">+ ${name}</button>
        `).join('')
        : `<p class="hint">No frequent foods yet</p>`;
}

export function quickAddFood(name) {
    const item = Object.values(foodData).flat().reverse()
        .find(f=>f.name===name);
    if (!item) return;

    addFoodManually(item);
}

/* ================================
   MFP IMPORT + DEDUPE
================================ */

export function cleanDuplicateFoodEntries() {
    let removed = 0;

    Object.keys(foodData).forEach(date => {
        const unique = [];
        foodData[date].forEach(e => {
            if (!unique.some(u =>
                u.name===e.name &&
                u.calories===e.calories &&
                u.protein===e.protein &&
                u.fat===e.fat &&
                u.carbs===e.carbs
            )) unique.push(e);
        });
        removed += foodData[date].length - unique.length;
        foodData[date] = unique;
    });

    if (removed) save('foodData', foodData);
}

// Add this to your existing log.js
window.addFoodManually = function() {
    const name = document.getElementById('manualName').value;
    const calories = parseFloat(document.getElementById('manualCals').value);
    const protein = parseFloat(document.getElementById('manualPro').value) || 0;
    const fat = parseFloat(document.getElementById('manualFat').value) || 0;
    const carbs = parseFloat(document.getElementById('manualCarb').value) || 0;

    if (!name || isNaN(calories)) {
        alert("Please enter a name and calorie count");
        return;
    }

    // Call your existing logic
    import('./log.js').then(m => {
        m.performAdd({ name, calories, protein, fat, carbs });
        // Clear inputs
        ['manualName', 'manualCals', 'manualPro', 'manualFat', 'manualCarb'].forEach(id => {
            document.getElementById(id).value = '';
        });
    });
};

// Update your performAdd to refresh the UI
export function performAdd(item) {
    if (!foodData[activeLogDate]) foodData[activeLogDate] = [];
    foodData[activeLogDate].push({
        ...item,
        time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    });
    save('foodData', foodData);
    renderFoodLog();
    renderMacroTargets();
}

/* ================================
   BARCODE SCANNING (QuaggaJS)
================================ */

window.startScanner = function() {
    const container = document.getElementById('interactive');
    container.classList.remove('hidden');

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('.video-container'),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) return console.error(err);
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        const code = data.codeResult.code;
        stopScanner();
        fetchFoodByBarcode(code);
    });
};

window.stopScanner = function() {
    Quagga.stop();
    document.getElementById('interactive').classList.add('hidden');
};

async function fetchFoodByBarcode(barcode) {
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;
            // Map API data to your form
            document.getElementById('manualName').value = p.product_name || "";
            document.getElementById('manualCals').value = p.nutriments['energy-kcal_100g'] || 0;
            document.getElementById('manualPro').value = p.nutriments.proteins_100g || 0;
            // Open the manual form so the user can confirm
            document.getElementById('manualEntryForm').classList.remove('hidden');
        } else {
            alert("Product not found. Please enter manually.");
        }
    } catch (e) {
        alert("Error fetching product data.");
    }
}

window.startScanner = function() {
    const container = document.getElementById('scannerOverlay');
    container.classList.remove('hidden');

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#videoView'),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) return console.error(err);
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        stopScanner();
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data.codeResult.code}.json`);
        const json = await res.json();
        if(json.status === 1) fillManualForm(json.product);
    });
};

window.stopScanner = function() {
    Quagga.stop();
    document.getElementById('scannerOverlay').classList.add('hidden');
};

// --- Barcode Scanner Logic ---
window.startScanner = function() {
    const overlay = document.getElementById('scannerOverlay');
    overlay.classList.remove('hidden');

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#videoView'),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) { alert("Camera error: " + err); return; }
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        const code = data.codeResult.code;
        stopScanner();
        fetchFoodByBarcode(code);
    });
};

window.stopScanner = function() {
    Quagga.stop();
    document.getElementById('scannerOverlay').classList.add('hidden');
};



window.searchFoodDatabase = async function() {
    const query = document.getElementById('foodSearchInput').value;
    if (query.length < 3) return;

    // Open Food Facts Search API
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1`);
    const data = await res.json();

    renderSearchResults(data.products);
};

function renderSearchResults(products) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = products.slice(0, 5).map(p => `
        <div class="meal-item" onclick="fillManualFormFromSearch('${p.product_name}', ${p.nutriments['energy-kcal_100g'] || 0})">
            <span>${p.product_name}</span>
            <strong>${p.nutriments['energy-kcal_100g'] || 0} kcal</strong>
        </div>
    `).join('');
}

// --- Barcode Scanner Logic ---
window.startScanner = function() {
    const overlay = document.getElementById('scannerOverlay');
    overlay.classList.remove('hidden');

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#videoView'),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "ean_8_reader"] }
    }, (err) => {
        if (err) { alert("Camera error: " + err); return; }
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        const code = data.codeResult.code;
        // Optional: window.navigator.vibrate(200);
        stopScanner();
        fetchFoodByBarcode(code);
    });
};

window.stopScanner = function() {
    Quagga.stop();
    document.getElementById('scannerOverlay').classList.add('hidden');
};

window.cleanDuplicateFoodEntries = function() {
    let removedCount = 0;

    // Loop through each date in the food log
    Object.keys(foodData).forEach(date => {
        const uniqueEntries = [];
        const seen = new Set();

        foodData[date].forEach(item => {
            // Create a unique key based on name and calories
            const identifier = `${item.name.toLowerCase()}-${item.calories}`;

            if (seen.has(identifier)) {
                removedCount++;
            } else {
                seen.add(identifier);
                uniqueEntries.push(item);
            }
        });

        // Update the state for that specific date
        foodData[date] = uniqueEntries;
    });

    if (removedCount > 0) {
        save('foodData', foodData);
        // Provide haptic feedback if supported
        if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);

        alert(`Successfully removed ${removedCount} duplicate entries!`);
        location.reload(); // Refresh to show the updated UI
    } else {
        alert("No duplicates found. Your database is clean!");
    }
};

Quagga.onDetected(async (data) => {
    // 1. Vibrate immediately on success (200ms burst)
    if (window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }

    const code = data.codeResult.code;

    // 2. Visual feedback: flash the screen or stop scanner
    stopScanner();

    // 3. Fetch data
    fetchFoodByBarcode(code);
});

Quagga.onDetected(async (data) => {
    // 1. Vibrate immediately on success (200ms burst)
    if (window.navigator.vibrate) {
        window.navigator.vibrate(200);
    }

    const code = data.codeResult.code;

    // 2. Visual feedback: flash the screen or stop scanner
    stopScanner();

    // 3. Fetch data
    fetchFoodByBarcode(code);
});

window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);

            // Validate that the file contains expected keys
            const expectedKeys = ['foodData', 'workoutData', 'waterData', 'userGoals'];
            const hasData = expectedKeys.some(key => importedState.hasOwnProperty(key));

            if (!hasData) {
                throw new Error("Invalid backup file format.");
            }

            // Confirm with the user before overwriting
            if (confirm("This will overwrite your current data. Are you sure?")) {
                // Save each part of the imported state to localStorage
                Object.keys(importedState).forEach(key => {
                    localStorage.setItem(key, JSON.stringify(importedState[key]));
                });

                // Haptic feedback for success
                if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);

                alert("Data restored successfully! The app will now reload.");
                window.location.reload();
            }
        } catch (err) {
            alert("Error: Could not parse the backup file. " + err.message);
        }
    };
    reader.readAsText(file);
};

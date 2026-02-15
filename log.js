/* log.js */
import {foodData, todayKey, saveState, gymDB, foodLogs, save} from './state.js';


document.addEventListener('DOMContentLoaded', () => {
    renderFoodLog();
    updateMacroUI();
});

// --- SCANNER & MANUAL BACKUP ---
window.startCamera = function() {
    document.getElementById('scannerOverlay').style.display = 'block';
    // Quagga initialization here...
};

window.manualBarcodeEntry = function() {
    const code = prompt("Enter 13-digit Barcode:");
    if (code) fetchFoodData(code);
};

async function fetchFoodData(barcode) {
    // Show the form immediately so user can see something is happening
    document.getElementById('manualEntryForm').style.display = 'block';
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();
        if (data.status === 1) {
            const p = data.product;
            document.getElementById('foodSearch').value = p.product_name || "";
            document.getElementById('manualCal').value = p.nutriments['energy-kcal_100g'] || 0;
            document.getElementById('manualP').value = p.nutriments.proteins_100g || 0;
        }
    } catch (e) { console.error("API Error"); }
}

// --- QUICK ADD ---
window.quickAdd = function(name, cal, p, c, f, meal) {
    const today = todayKey();
    if (!foodLogs[today]) foodLogs[today] = [];
    
    foodLogs[today].push({ name, calories: cal, protein: p, carbs: c, fat: f, meal });
    save('foodLogs', foodLogs);
    renderFoodLog();
};

function renderFoodLog() {
    const container = document.getElementById('dailyLogList');
    const today = todayKey();
    const logs = foodLogs[today] || [];
    
    // Grouping logic by Meal Type (Breakfast, Dinner, etc.)
    // Update IDs totalLogCals and dailyLogList
}

window.fetchProductByBarcode = function(barcode) {
    // 1. Start the fetch request
    fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            // 2. Check if product exists in the Open Food Facts database
            if (data.status === 1) {
                const product = data.product;

                // 3. Map the API data to our app's format
                const newItem = {
                    name: product.product_name || "Unknown Product",
                    calories: Math.round(product.nutriments['energy-kcal_100g'] || 0),
                    protein: product.nutriments.proteins_100g || 0,
                    carbs: product.nutriments.carbohydrates_100g || 0,
                    fats: product.nutriments.fat_100g || 0
                };

                // 4. Send the data to the manual form
                fillManualForm(newItem);

                // 5. Success feedback
                if (window.navigator.vibrate) window.navigator.vibrate(200);
            } else {
                alert("Product not found. Please enter details manually.");
            }
        })
        .catch(error => {
            console.error("Barcode Fetch Error:", error);
            alert("Could not connect to food database.");
        });
};

/* --- Live Search Logic --- */

window.handleSearch = function(event) {
    const query = event.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');

    // 1. If search is empty, hide suggestions
    if (query.length < 1) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    // 2. Filter the database (using gymDB from state.js for now)
    const matches = gymDB.filter(item =>
        item.name.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to top 5 results for mobile speed

    // 3. Render suggestions
    if (matches.length > 0) {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = matches.map(item => `
            <div class="suggestion-item" onclick="selectSearchItem('${item.name}')">
                <strong>${item.name}</strong>
                <small>${item.muscle || 'Food'}</small>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<div class="suggestion-item">No results found</div>';
    }
};

// This function fires when you tap a suggestion
window.selectSearchItem = function(name) {
    const nameField = document.getElementById('foodSearch');
    nameField.value = name;

    // Clear suggestions
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchResults').style.display = 'none';

    // Optional: If you have macro data for this item, fill the form
    // findItemAndPopulate(name);
};

window.selectSearchItem = function(name) {
    // Logic to fill the form with the selected item
    document.getElementById('foodSearch').value = name;
    document.getElementById('searchResults').innerHTML = ''; // Clear results

    // If it's a known food with macros, you'd call fillManualForm(item) here
};

export function addFood(item) {
    const today = todayKey();
    if (!foodData[today]) foodData[today] = [];

    foodData[today].push({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        time: new Date().toLocaleTimeString()
    });

    saveState();
    renderFoodLog();
}

function renderFoodLog() {
    const list = document.getElementById('activeMealList');
    const today = todayKey();
    const meals = foodData[today] || [];

    list.innerHTML = meals.map(m => `
        <div class="meal-item">
            <div><strong>${m.name}</strong><br><small>${m.calories} kcal</small></div>
            <div>P:${m.protein} C:${m.carbs} F:${m.fats}</div>
        </div>
    `).join('');
}

/* log.js - Scanner and Food Entry */
let baseMacros = { p: 0, c: 0, f: 0, kcal: 0 };

// 1. Camera Control
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    document.getElementById('video').srcObject = stream;
    document.getElementById('camera-container').style.display = 'block';
    // Logic for Quagga/Barcode scanning would trigger here
}

function stopCamera() {
    const video = document.getElementById('video');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById('camera-container').style.display = 'none';
}

// 2. Barcode Handling & Auto-Form Fill
window.handleBarcodeScan = async function(barcode) {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
        const p = data.product;
        baseMacros = {
            p: p.nutriments.proteins_100g || 0,
            c: p.nutriments.carbohydrates_100g || 0,
            f: p.nutriments.fat_100g || 0,
            kcal: p.nutriments['energy-kcal_100g'] || 0
        };

        document.getElementById('foodSearch').value = p.product_name || "Unknown";
        recalculateMacros(); // Fill fields based on default 100g

        stopCamera(); // Auto-close camera
        document.getElementById('manualEntryForm').style.display = 'block';
    }
};

window.recalculateMacros = function() {
    const qty = parseFloat(document.getElementById('servingSize').value) || 100;
    const factor = qty / 100;

    document.getElementById('manualP').value = (baseMacros.p * factor).toFixed(1);
    document.getElementById('manualC').value = (baseMacros.c * factor).toFixed(1);
    document.getElementById('manualF').value = (baseMacros.f * factor).toFixed(1);
    document.getElementById('manualCal').value = Math.round(baseMacros.kcal * factor);
};

// 1. The Scanner Listener
    Quagga.onDetected(function(data) {
        const code = data.codeResult.code;

        // Stop scanner immediately to freeze the frame
        Quagga.stop();
        document.getElementById('scannerOverlay').style.display = 'none';

        // Call the function that uses .then()
        fetchProductByBarcode(code);
    });

// 2. The Fetch Function using .then()
    window.fetchProductByBarcode = function(barcode) {
        // We return the fetch promise so we can chain .then()
        return fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
            .then(function(response) {
                if (!response.ok) throw new Error('API unreachable');
                return response.json();
            })
            .then(function(data) {
                if (data.status === 1) {
                    const p = data.product;
                    const item = {
                        name: p.product_name || "Unknown",
                        protein: p.nutriments.proteins_100g || 0,
                        carbs: p.nutriments.carbohydrates_100g || 0,
                        fats: p.nutriments.fat_100g || 0,
                        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0)
                    };

                    // Call the form filler
                    fillManualForm(item);
                } else {
                    alert("Barcode not recognized.");
                }
            })
            .catch(function(err) {
                console.error("Fetch error:", err);
            });
    };


function fillManualForm(item) {
    // Show the form first
    const form = document.getElementById('manualEntryForm');
    form.style.display = 'block';

    // Map the scanned data to the HTML fields
    document.getElementById('foodSearch').value = item.name;
    document.getElementById('manualP').value = item.protein;
    document.getElementById('manualC').value = item.carbs;
    document.getElementById('manualF').value = item.fats;
    document.getElementById('manualCal').value = item.calories;

    // Smooth scroll to the form so the user sees it on their phone
    form.scrollIntoView({ behavior: 'smooth' });
}

function hapticFeedback() {
    if (window.navigator.vibrate) window.navigator.vibrate(200);
}

window.saveScannedFood = function() {
    const foodName = document.getElementById('foodSearch').value;
    const p = parseFloat(document.getElementById('manualP').value) || 0;
    const c = parseFloat(document.getElementById('manualC').value) || 0;
    const f = parseFloat(document.getElementById('manualF').value) || 0;
    const kcal = parseInt(document.getElementById('manualCal').value) || 0;

    if (!foodName) return alert("Enter a name");

    const today = getTodayString();

    // 1. Get the full history object or create a new one
    // Structure: { "2026-02-09": [...items], "2026-02-10": [...] }
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};

    // 2. Initialize the array for today if it doesn't exist
    if (!history[today]) {
        history[today] = [];
    }

    // 3. Add the new entry
    history[today].push({
        id: Date.now(),
        name: foodName,
        protein: p,
        carbs: c,
        fats: f,
        calories: kcal
    });

    // 4. Save back to localStorage
    localStorage.setItem('foodHistory', JSON.stringify(history));

    // UI Reset
    alert("Saved for today!");
    document.getElementById('manualEntryForm').style.display = 'none';
    displayDailyLog(); // Refresh the list
};

function displayDailyLog() {
    const logContainer = document.getElementById('dailyLogList');
    if (!logContainer) return;

    const today = getTodayString();
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};
    const entries = history[today] || []; // Only get today's items

    if (entries.length === 0) {
        logContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No food logged for today.</p>';
        return;
    }

    logContainer.innerHTML = entries.map(item => `
        <div class="log-item">
            <div>
                <strong>${item.name}</strong><br>
                <small>P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fats}g</small>
            </div>
            <div style="font-weight:bold;">${item.calories} kcal</div>
        </div>
    `).reverse().join('');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('logDatePicker');
    if (picker) {
        // Set the calendar to today's date by default
        picker.value = new Date().toISOString().split('T')[0];
    }
    displayDailyLog();
});

function displayDailyLog() {
    const logContainer = document.getElementById('dailyLogList');
    const picker = document.getElementById('logDatePicker');
    if (!logContainer || !picker) return;

    const selectedDate = picker.value; // Get date from the UI
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};
    const entries = history[selectedDate] || [];

    if (entries.length === 0) {
        logContainer.innerHTML = `
            <div class="empty-state">
                <p>No entries for ${selectedDate === new Date().toISOString().split('T')[0] ? 'today' : selectedDate}</p>
            </div>`;
        return;
    }

    logContainer.innerHTML = entries.map(item => `
        <div class="log-item">
            <div>
                <strong>${item.name}</strong><br>
                <small>P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fats}g</small>
            </div>
            <div class="log-kcal">${item.calories} kcal</div>
        </div>
    `).reverse().join('');
}

/* --- Tab Selection Logic --- */
window.selectTab = function(element, category) {
    // 1. Remove 'active' class from all buttons in this group
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));

    // 2. Add 'active' class to the clicked button
    element.classList.add('active');

    // 3. Update the hidden input value
    document.getElementById('mealType').value = category;

    // 4. Haptic feedback for mobile
    if (window.navigator.vibrate) window.navigator.vibrate(10);
};

/* --- Summary Card Logic --- */
window.updateDailySummary = function(entries) {
    const summaryDiv = document.getElementById('daySummary');
    if (!summaryDiv) return;

    const totals = entries.reduce((acc, item) => {
        acc.p += item.protein;
        acc.c += item.carbs;
        acc.f += item.fats;
        acc.kcal += item.calories;
        return acc;
    }, { p: 0, c: 0, f: 0, kcal: 0 });

    summaryDiv.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item"><strong>${totals.kcal}</strong><span>Kcal</span></div>
            <div class="summary-item"><strong>${totals.p.toFixed(1)}g</strong><span>Prot</span></div>
            <div class="summary-item"><strong>${totals.c.toFixed(1)}g</strong><span>Carb</span></div>
            <div class="summary-item"><strong>${totals.f.toFixed(1)}g</strong><span>Fat</span></div>
        </div>
    `;
};

/* --- Clear Daily Log Function --- */
window.clearDailyLog = function() {
    const selectedDate = document.getElementById('logDatePicker').value;
    if (confirm(`Delete all entries for ${selectedDate}?`)) {
        const history = JSON.parse(localStorage.getItem('foodHistory')) || {};
        delete history[selectedDate];
        localStorage.setItem('foodHistory', JSON.stringify(history));
        displayDailyLog();
    }
};

/* --- Updated Display Logic with Delete Button --- */
window.displayDailyLog = function() {
    const logContainer = document.getElementById('dailyLogList');
    const selectedDate = document.getElementById('logDatePicker').value;
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};
    const entries = history[selectedDate] || [];

    // Update the Summary Card
    updateDailySummary(entries);

    if (entries.length === 0) {
        logContainer.innerHTML = '<p class="empty-state">No entries for this date.</p>';
        return;
    }

    const categories = ["Breakfast", "Dinner", "Tea", "Snacks", "Drinks"];
    let html = '';

    categories.forEach(cat => {
        const catItems = entries.filter(item => item.category === cat);
        if (catItems.length > 0) {
            html += `<h4 class="meal-title">${cat}</h4>`;
            catItems.forEach(item => {
                html += `
                <div class="log-item">
                    <div class="log-info">
                        <strong>${item.name}</strong><br>
                        <small>P:${item.protein} C:${item.carbs} F:${item.fats}</small>
                    </div>
                    <div class="log-actions">
                        <span class="log-kcal">${item.calories} kcal</span>
                        <button class="delete-btn" onclick="deleteLogItem(${item.id})">×</button>
                    </div>
                </div>`;
            });
        }
    });
    logContainer.innerHTML = html;
};

/* --- Delete Individual Item --- */
window.deleteLogItem = function(itemId) {
    const selectedDate = document.getElementById('logDatePicker').value;
    const history = JSON.parse(localStorage.getItem('foodHistory')) || {};

    if (history[selectedDate]) {
        // Filter out the item with the matching ID
        history[selectedDate] = history[selectedDate].filter(item => item.id !== itemId);

        // If the day is now empty, you can choose to delete the date key entirely
        if (history[selectedDate].length === 0) delete history[selectedDate];

        localStorage.setItem('foodHistory', JSON.stringify(history));

        // Refresh the UI
        displayDailyLog();

        // Subtle haptic feedback
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    }
};

// Run this when the page loads
document.addEventListener('DOMContentLoaded', displayDailyLog);


// Run this when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateDateDisplay();
    loadDiaryEntries();
});

window.changeDate = function(offset) {
    const d = new Date(window.currentViewDate);
    d.setDate(d.getDate() + offset);

    window.currentViewDate = d.toISOString().split('T')[0]; // Sets YYYY-MM-DD

    updateDateDisplay();
    loadDiaryEntries(); // Refresh the list for the new date
};

function loadDiaryEntries() {
    const container = document.getElementById('diaryEntries');
    const dateKey = window.currentViewDate;

    // Example: Fetching food logs for the selected date
    const logs = JSON.parse(localStorage.getItem(`logs_${dateKey}`)) || [];

    if (logs.length === 0) {
        container.innerHTML = `<p style="text-align:center; grid-column: 1/-1;">No entries for this date.</p>`;
        return;
    }

    container.innerHTML = logs.map(item => `
        <div class="card">
            <h3>${item.name}</h3>
            <p>${item.calories} kcal</p>
        </div>
    `).join('');
}

function updateDateDisplay() {
    const display = document.getElementById('displayDate');
    const today = getToday();

    if (window.currentViewDate === today) {
        display.innerText = "Today";
    } else {
        display.innerText = window.currentViewDate;
    }
}

/* log.js */
import { getToday } from './state.js';

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
    window.currentViewDate = getToday();
    updateDateDisplay();
    displayDailyLog();
});

// --- BARCODE SCANNER LOGIC ---
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
        if (err) return console.error(err);
        Quagga.start();
    });

    Quagga.onDetected((data) => {
        const code = data.codeResult.code;
        stopScanner();
        fetchFoodData(code);
    });
};

window.stopScanner = function () {
    Quagga.stop();
    document.getElementById('scannerOverlay').style.display = 'none';
};

async function fetchFoodData(barcode) {
    // Using OpenFoodFacts API (Free)
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await res.json();
        if (data.status === 1) {
            const p = data.product;
            // Fill the manual entry form with scanned data
            document.getElementById('manualEntryForm').style.display = 'block';
            document.getElementById('foodSearch').value = p.product_name || "Unknown Item";
            document.getElementById('manualCal').value = p.nutriments['energy-kcal_100g'] || 0;
            document.getElementById('manualP').value = p.nutriments.proteins_100g || 0;
            document.getElementById('manualC').value = p.nutriments.carbohydrates_100g || 0;
            document.getElementById('manualF').value = p.nutriments.fat_100g || 0;
        } else {
            alert("Product not found. Please enter manually.");
            document.getElementById('manualEntryForm').style.display = 'block';
        }
    } catch (e) {
        alert("Error fetching food data.");
    }
}

// --- MEAL TABS LOGIC ---
window.selectTab = function (btn, type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('mealType').value = type;
};

// --- SAVE & DISPLAY LOGIC ---
window.saveScannedFood = function () {
    const today = window.currentViewDate;
    const logKey = `logs_${today}`;
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];

    const newItem = {
        name: document.getElementById('foodSearch').value,
        calories: parseInt(document.getElementById('manualCal').value) || 0,
        protein: document.getElementById('manualP').value,
        meal: document.getElementById('mealType').value, // Matches the tab value
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    logs.push(newItem);
    localStorage.setItem(logKey, JSON.stringify(logs));

    document.getElementById('manualEntryForm').style.display = 'none';
    displayDailyLog();
};

window.displayDailyLog = function () {
    const today = window.currentViewDate;
    const logs = JSON.parse(localStorage.getItem(`logs_${today}`)) || [];
    const container = document.getElementById('dailyLogList');
    container.innerHTML = "";

    const meals = ['Breakfast', 'Dinner', 'Tea', 'Snacks', 'Drinks'];
    let totalDayCals = 0;

    meals.forEach(meal => {
        const mealLogs = logs.filter(l => l.meal === meal);
        const mealSection = document.createElement('div');
        mealSection.className = "meal-group card";

        let mealTotal = 0;
        const itemsHtml = mealLogs.map(l => {
            mealTotal += l.calories;
            return `<div class="meal-item"><span>${l.name}</span><strong>${l.calories}kcal</strong></div>`;
        }).join('');

        totalDayCals += mealTotal;

        mealSection.innerHTML = `
            <div class="meal-header">
                <h3>${meal}</h3>
                <span>${mealTotal} kcal</span>
            </div>
            <div class="meal-items-list">${itemsHtml || '<p class="empty-msg">No entries</p>'}</div>
        `;
        container.appendChild(mealSection);
    });

    document.getElementById('totalLogCals').innerText = totalDayCals;
};

/* Inside your displayDailyLog function in log.js */

function updateMacros(logs) {
    // 1. Set your Daily Targets
    const targets = { p: 200, c: 145, f: 45 };

    // 2. Sum up current logs
    let totals = { p: 0, c: 0, f: 0 };

    logs.forEach(item => {
        totals.p += parseFloat(item.protein) || 0;
        totals.c += parseFloat(item.carbs) || 0;
        totals.f += parseFloat(item.fat) || 0;
    });

    // 3. Update Text and Bars
    const updateBar = (id, current, target, barId) => {
        const percent = Math.min((current / target) * 100, 100);
        document.getElementById(id).innerText = `${Math.round(current)} / ${target}g`;
        document.getElementById(barId).style.width = percent + "%";
    };

    updateBar('txtP', totals.p, targets.p, 'barP');
    updateBar('txtC', totals.c, targets.c, 'barC');
    updateBar('txtF', totals.f, targets.f, 'barF');
}

// Call updateMacros(logs) inside your existing displayDailyLog function

/* log.js */

window.quickAdd = function (name, cals, p, c, f, category) {
    const today = window.currentViewDate;
    const logKey = `logs_${today}`;
    const logs = JSON.parse(localStorage.getItem(logKey)) || [];

    const newItem = {
        name: name,
        calories: parseInt(cals),
        protein: parseFloat(p),
        carbs: parseFloat(c),
        fat: parseFloat(f),
        meal: category,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    logs.push(newItem);
    localStorage.setItem(logKey, JSON.stringify(logs));

    // Refresh the diary and macros
    displayDailyLog();

    // Simple feedback
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};

/* log.js */

window.renderWeeklyChart = function () {
    const chartContainer = document.getElementById('weeklyChart');
    const labelContainer = document.getElementById('chartLabels');
    if (!chartContainer) return;

    chartContainer.innerHTML = '';
    labelContainer.innerHTML = '';

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }

    // Get data and find max for scaling
    const dailyTotals = last7Days.map(date => {
        const logs = JSON.parse(localStorage.getItem(`logs_${date}`)) || [];
        return logs.reduce((sum, item) => sum + (item.calories || 0), 0);
    });

    const maxCal = Math.max(...dailyTotals, 2000); // Scale against at least 2000

    dailyTotals.forEach((total, index) => {
        const height = (total / maxCal) * 100;
        const dayName = new Date(last7Days[index]).toLocaleDateString([], { weekday: 'short' });

        // Create Bar
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        bar.setAttribute('data-value', total);
        chartContainer.appendChild(bar);

        // Create Label
        const label = document.createElement('span');
        label.innerText = dayName;
        labelContainer.appendChild(label);
    });
};

// Update chart whenever the log changes
const originalDisplayLog = window.displayDailyLog;
window.displayDailyLog = function () {
    originalDisplayLog();
    renderWeeklyChart();
};
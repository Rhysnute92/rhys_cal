// 1. Global State Management
let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let restGoal = 1500, trainGoal = 1800;
let proteinGoal = 200, fatGoal = 45, carbGoal = 145;
let isTrainingDay = false;

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    // If on the Database page, populate the table
    if (document.getElementById('weeklySummaryBody')) {
        generateWeeklyTable();
    }
});

function loadData() {
    const dateKey = new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('day_' + dateKey));

    if (saved) {
        mealFoods = saved.mealFoods || mealFoods;
        restGoal = saved.restGoal || 1500;
        trainGoal = saved.trainGoal || 1800;
        proteinGoal = saved.proteinGoal || 200;
        fatGoal = saved.fatGoal || 45;
        carbGoal = saved.carbGoal || 145;
        isTrainingDay = saved.isTrainingDay || false;
    }

    // Sync UI elements if they exist on the current page
    const trainToggle = document.getElementById('trainingMode');
    if (trainToggle) trainToggle.checked = isTrainingDay;

    updateGoalDisplays();
    updateDailyTotals();
}

function saveData() {
    const dateKey = new Date().toISOString().split('T')[0];
    const dataToSave = {
        mealFoods, restGoal, trainGoal, proteinGoal, fatGoal, carbGoal, isTrainingDay
    };
    localStorage.setItem('day_' + dateKey, JSON.stringify(dataToSave));
}

// 3. Goal & Mode Logic
function toggleTrainingMode() {
    const trainToggle = document.getElementById('trainingMode');
    if (!trainToggle) return;

    isTrainingDay = trainToggle.checked;
    const statusText = document.getElementById('trainingStatusText');
    if (statusText) {
        statusText.innerText = isTrainingDay ? `Training Day (${trainGoal} kcal)` : `Rest Day (${restGoal} kcal)`;
    }

    saveData();
    updateDailyTotals();
}

function updateCalorieGoals() {
    const restInput = document.getElementById('goalRestCals');
    const trainInput = document.getElementById('goalTrainCals');

    if (restInput && restInput.value) restGoal = parseInt(restInput.value);
    if (trainInput && trainInput.value) trainGoal = parseInt(trainInput.value);

    saveData();
    toggleTrainingMode(); // Refreshes text and math
}

function updateGoal(type) {
    const input = document.getElementById(`goal${type}`);
    if (!input || !input.value) return;

    const val = parseInt(input.value);
    if (type === 'Protein') proteinGoal = val;
    if (type === 'Fat') fatGoal = val;
    if (type === 'Carbs') carbGoal = val;

    saveData();
    updateGoalDisplays();
    updateDailyTotals();
    input.value = ''; // Clear input
}

// 4. Calculations & UI Updates
function updateDailyTotals() {
    let totals = { cal: 0, p: 0, f: 0, c: 0 };

    // Sum all categories (including Drinks)
    Object.values(mealFoods).flat().forEach(f => {
        totals.cal += (parseInt(f.calories) || 0);
        totals.p += (parseInt(f.protein) || 0);
        totals.f += (parseInt(f.fat) || 0);
        totals.c += (parseInt(f.carbs) || 0);
    });

    const activeGoal = isTrainingDay ? trainGoal : restGoal;

    // Update Remaining Calories
    const remEl = document.getElementById('remainingCalories');
    if (remEl) {
        const rem = activeGoal - totals.cal;
        remEl.innerText = rem;
        remEl.style.color = rem < 0 ? "#ff4444" : "#4CAF50";
    }

    // Update Progress Bars
    setBar('protein-bar', totals.p, proteinGoal);
    setBar('fat-bar', totals.f, fatGoal);
    setBar('carb-bar', totals.c, carbGoal);

    // Update Chart if on Dashboard
    if (document.getElementById('macroChart')) {
        drawCharts(totals.p, totals.f, totals.c);
    }
}

function setBar(id, cur, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min((cur / goal) * 100, 100) + "%";
}

function updateGoalDisplays() {
    const displays = {
        'displayGoalP': proteinGoal,
        'displayGoalF': fatGoal,
        'displayGoalC': carbGoal
    };
    Object.entries(displays).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    });
}

function toggleEditMode() {
    document.querySelectorAll('.edit-box').forEach(box => box.classList.toggle('hidden'));
}

// 5. Data Visualization (Chart.js)
function drawCharts(p, f, c) {
    const ctx = document.getElementById('macroChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Fat', 'Carbs'],
            datasets: [{
                data: [p * 4, f * 9, c * 4],
                backgroundColor: ['#4CAF50', '#FF9800', '#2196F3']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// 6. Database / History Generation
function generateWeeklyTable() {
    const body = document.getElementById('weeklySummaryBody');
    if (!body) return;

    body.innerHTML = '';
    const now = new Date();

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem('day_' + dateKey));

        if (data && data.mealFoods) {
            Object.entries(data.mealFoods).forEach(([cat, foods]) => {
                foods.forEach(food => {
                    const row = `<tr>
                        <td>${d.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</td>
                        <td>${cat}</td>
                        <td>${food.name}</td>
                        <td>${food.calories}</td>
                    </tr>`;
                    body.innerHTML += row;
                });
            });
        }
    }
}

function startScanner() {
    const viewport = document.getElementById('interactive');
    viewport.style.display = "block";

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: viewport,
            constraints: { facingMode: "environment" } // Uses back camera
        },
        decoder: {
            readers: ["ean_reader", "upc_reader"] // Standard food barcode formats
        }
    }, function(err) {
        if (err) { console.error(err); return; }
        Quagga.start();
    });

    Quagga.onDetected((data) => {
        const code = data.codeResult.code;
        // 1. Stop scanning once found
        Quagga.stop();
        viewport.style.display = "none";

        // 2. Play a small beep (optional) or alert
        alert("Barcode Detected: " + code);

        // 3. Auto-fill the name (In a real app, you'd fetch from an API like OpenFoodFacts)
        document.getElementById('foodName').value = "Scanned Item (" + code + ")";

        // You would typically use a fetch() here to get nutritional data
        // fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
    });
}

let currentActiveTab = 'Breakfast';

function switchTab(category) {
    currentActiveTab = category;

    // ... your existing UI code ...

    // Update the button text dynamically
    const copyBtn = document.querySelector('button[onclick="copyYesterday()"]');
    if (copyBtn) {
        copyBtn.innerText = `📋 Copy Yesterday's ${category}`;
    }

    renderActiveList();
}

function renderActiveList() {
    const listContainer = document.getElementById('activeMealList');
    if (!listContainer) return;

    const foods = mealFoods[currentActiveTab] || [];

    if (foods.length === 0) {
        listContainer.innerHTML = `<p class="hint" style="text-align:center">Nothing logged for ${currentActiveTab} yet.</p>`;
        return;
    }

    listContainer.innerHTML = foods.map((food, index) => `
        <div class="library-item">
            <div>
                <strong>${food.name}</strong><br>
                <small>${food.calories} kcal | P: ${food.protein} F: ${food.fat} C: ${food.carbs}</small>
            </div>
            <button class="delete-small" onclick="deleteItem('${currentActiveTab}', ${index})">✕</button>
        </div>
    `).join('');
}

// Update the existing addFood to refresh the list automatically
const originalAddFood = addFood;
addFood = function() {
    originalAddFood();
    renderActiveList();
};

function deleteItem(cat, index) {
    mealFoods[cat].splice(index, 1);
    saveData();
    renderActiveList();
    updateDailyTotals();
}

// Call on load
document.addEventListener("DOMContentLoaded", () => {
    // ... existing load calls
    renderActiveList();
});

function copyYesterday() {
    // 1. Get yesterday's date key
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];

    // 2. Fetch data
    const saved = JSON.parse(localStorage.getItem('day_' + dateKey));

    if (!saved || !saved.mealFoods || !saved.mealFoods[currentActiveTab] || saved.mealFoods[currentActiveTab].length === 0) {
        alert(`No ${currentActiveTab} entries found for yesterday.`);
        return;
    }

    // 3. Confirm with user
    const itemCount = saved.mealFoods[currentActiveTab].length;
    if (confirm(`Add the ${itemCount} items you had for ${currentActiveTab} yesterday?`)) {
        // Clone the items to avoid reference issues
        const itemsToAdd = JSON.parse(JSON.stringify(saved.mealFoods[currentActiveTab]));

        // Add to current state
        mealFoods[currentActiveTab].push(...itemsToAdd);

        // 4. Update and Save
        saveData();
        renderActiveList();
        updateDailyTotals();
    }


// 1. Global Database Search (Open Food Facts API)
async function searchGlobalDB(event) {
    if (event && event.key !== 'Enter') return;

    const query = document.getElementById('dbSearch').value;
    const resultsBox = document.getElementById('searchResults');

    if (query.length < 3) return;

    resultsBox.innerHTML = '<p class="hint">Searching...</p>';
    resultsBox.classList.remove('hidden');

    try {
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=10`);
        const data = await response.json();

        resultsBox.innerHTML = data.products.map(p => {
            const kcal = p.nutriments['energy-kcal_100g'] || 0;
            return `
                <div class="search-item" onclick="autoFillFromSearch('${p.product_name}', ${kcal}, ${p.nutriments.proteins_100g || 0}, ${p.nutriments.fats_100g || 0}, ${p.nutriments.carbohydrates_100g || 0})">
                    <strong>${p.product_name}</strong> - ${kcal} kcal/100g
                </div>
            `;
        }).join('');
    } catch (e) {
        resultsBox.innerHTML = '<p class="hint">Error fetching data.</p>';
    }
}

function autoFillFromSearch(name, cal, p, f, c) {
    document.getElementById('foodName').value = name;
    document.getElementById('foodCalories').value = Math.round(cal);
    document.getElementById('protein').value = Math.round(p);
    document.getElementById('fat').value = Math.round(f);
    document.getElementById('carbs').value = Math.round(c);
    document.getElementById('searchResults').classList.add('hidden');
}

// 2. Frequent Items Logic
function updateFrequentItems() {
    const allHistory = [];
    // Loop through last 7 days in storage
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = 'day_' + d.toISOString().split('T')[0];
        const dayData = JSON.parse(localStorage.getItem(key));
        if (dayData) {
            Object.values(dayData.mealFoods).flat().forEach(item => allHistory.push(item));
        }
    }

    // Count occurrences
    const counts = allHistory.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || {count: 0, data: item});
        acc[item.name].count++;
        return acc;
    }, {});

    // Sort and take top 5
    const top5 = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const freqList = document.getElementById('frequentList');
    if (freqList) {
        freqList.innerHTML = top5.map(item => `
            <span class="freq-tag" onclick="quickAdd('${item.data.name}', ${item.data.calories}, ${item.data.protein}, ${item.data.fat}, ${item.data.carbs})">
                + ${item.data.name}
            </span>
        `).join('');
    }
}

function quickAdd(n, cal, p, f, c) {
    document.getElementById('foodName').value = n;
    document.getElementById('foodCalories').value = cal;
    document.getElementById('protein').value = p;
    document.getElementById('fat').value = f;
    document.getElementById('carbs').value = c;
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    updateFrequentItems();
});

// 1. Global Database Search (Open Food Facts API)
async function searchGlobalDB(event) {
    if (event && event.key !== 'Enter') return;

    const query = document.getElementById('dbSearch').value;
    const resultsBox = document.getElementById('searchResults');

    if (query.length < 3) return;

    resultsBox.innerHTML = '<p class="hint">Searching...</p>';
    resultsBox.classList.remove('hidden');

    try {
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=10`);
        const data = await response.json();

        resultsBox.innerHTML = data.products.map(p => {
            const kcal = p.nutriments['energy-kcal_100g'] || 0;
            return `
                <div class="search-item" onclick="autoFillFromSearch('${p.product_name}', ${kcal}, ${p.nutriments.proteins_100g || 0}, ${p.nutriments.fats_100g || 0}, ${p.nutriments.carbohydrates_100g || 0})">
                    <strong>${p.product_name}</strong> - ${kcal} kcal/100g
                </div>
            `;
        }).join('');
    } catch (e) {
        resultsBox.innerHTML = '<p class="hint">Error fetching data.</p>';
    }
}

function autoFillFromSearch(name, cal, p, f, c) {
    document.getElementById('foodName').value = name;
    document.getElementById('foodCalories').value = Math.round(cal);
    document.getElementById('protein').value = Math.round(p);
    document.getElementById('fat').value = Math.round(f);
    document.getElementById('carbs').value = Math.round(c);
    document.getElementById('searchResults').classList.add('hidden');
}

// 2. Frequent Items Logic
function updateFrequentItems() {
    const allHistory = [];
    // Loop through last 7 days in storage
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = 'day_' + d.toISOString().split('T')[0];
        const dayData = JSON.parse(localStorage.getItem(key));
        if (dayData) {
            Object.values(dayData.mealFoods).flat().forEach(item => allHistory.push(item));
        }
    }

    // Count occurrences
    const counts = allHistory.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || {count: 0, data: item});
        acc[item.name].count++;
        return acc;
    }, {});

    // Sort and take top 5
    const top5 = Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const freqList = document.getElementById('frequentList');
    if (freqList) {
        freqList.innerHTML = top5.map(item => `
            <span class="freq-tag" onclick="quickAdd('${item.data.name}', ${item.data.calories}, ${item.data.protein}, ${item.data.fat}, ${item.data.carbs})">
                + ${item.data.name}
            </span>
        `).join('');
    }
}

function quickAdd(n, cal, p, f, c) {
    document.getElementById('foodName').value = n;
    document.getElementById('foodCalories').value = cal;
    document.getElementById('protein').value = p;
    document.getElementById('fat').value = f;
    document.getElementById('carbs').value = c;
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    updateFrequentItems();
});

function multiplyQuantity(factor) {
    const fields = ['foodCalories', 'protein', 'fat', 'carbs'];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value) {
            let newVal = parseFloat(el.value) * factor;
            el.value = Math.round(newVal);
        }
    });
}

function customMultiplier() {
    const factor = prompt("Enter multiplier (e.g., 0.75 for 75% or 1.25 for 125%):");
    if (factor && !isNaN(factor)) {
        multiplyQuantity(parseFloat(factor));
    }
}

function addWater(ml) {
    mealFoods['Drinks'].push({ name: `Water (${ml}ml)`, calories: 0, protein: 0, fat: 0, carbs: 0 });
    saveData(); renderActiveList();
}

let weightHistory = []; // Add this to your global variables

// Add this to your loadData() function
weightHistory = saved.weightHistory || [];

function logWeight() {
    const weightVal = parseFloat(document.getElementById('weightInput').value);
    if (!weightVal) return;

    const dateKey = new Date().toISOString().split('T')[0];

    // Update or Add weight for today
    const entryIndex = weightHistory.findIndex(e => e.date === dateKey);
    if (entryIndex > -1) {
        weightHistory[entryIndex].weight = weightVal;
    } else {
        weightHistory.push({ date: dateKey, weight: weightVal });
    }

    // Keep only last 30 entries for the chart
    weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (weightHistory.length > 30) weightHistory.shift();

    saveData(); // Ensure weightHistory is added to your saveData() object
    updateWeightUI();
    document.getElementById('weightInput').value = '';
}

function updateWeightUI() {
    if (weightHistory.length === 0) return;

    const lastWeight = weightHistory[weightHistory.length - 1].weight;
    document.getElementById('weightTrend').innerText = `${lastWeight} current`;

    const ctx = document.getElementById('weightChart').getContext('2d');
    if (window.wChart) window.wChart.destroy();

    window.wChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weightHistory.map(e => e.date.split('-').slice(1).join('/')),
            datasets: [{
                label: 'Weight',
                data: weightHistory.map(e => e.weight),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: false }, x: { grid: { display: false } } }
        }
    });
}

// Call updateWeightUI() inside your DOMContentLoaded listener

function updateWeightUI() {
    if (weightHistory.length === 0) return;

    const entries = weightHistory.slice(-30); // Last 30 entries
    const currentWeight = entries[entries.length - 1].weight;

    // Update Label
    document.getElementById('lastWeightLabel').innerText = `Last: ${currentWeight} lbs`;

    // Calculate Trend
    if (entries.length > 1) {
        const prevWeight = entries[entries.length - 2].weight;
        const diff = (currentWeight - prevWeight).toFixed(1);
        const indicator = document.getElementById('weightChangeIndicator');

        indicator.innerText = diff > 0 ? `+${diff} lbs` : `${diff} lbs`;
        indicator.className = 'trend-indicator ' + (diff > 0 ? 'trend-up' : 'trend-down');
    }

    // Render Chart
    const ctx = document.getElementById('weightChart').getContext('2d');
    if (window.wChart) window.wChart.destroy();

    window.wChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: entries.map(e => e.date.split('-').slice(1).join('/')),
            datasets: [{
                label: 'Weight Progress',
                data: entries.map(e => e.weight),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.05)',
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#4CAF50',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
}

// Updated Variables in app.js
let weightHistory = [];
let goalWeight = 170;

function logWeight() {
    const weightEl = document.getElementById('inputDailyWeight');
    const val = parseFloat(weightEl.value);
    if (!val) return;

    const dateKey = new Date().toISOString().split('T')[0];

    // Logic to update weightHistory array
    const entryIdx = weightHistory.findIndex(e => e.date === dateKey);
    if (entryIdx > -1) {
        weightHistory[entryIdx].weight = val;
    } else {
        weightHistory.push({ date: dateKey, weight: val });
    }

    saveData();
    updateWeightUI();
    weightEl.value = ''; // Clear the unique ID input
}

function updateWeightUI() {
    const canvas = document.getElementById('canvasWeightTrend');
    const label = document.getElementById('labelLastWeight');
    const trendIndicator = document.getElementById('statusWeightTrend');

    if (!canvas || weightHistory.length === 0) return;

    const lastEntry = weightHistory[weightHistory.length - 1].weight;
    label.innerText = `Last: ${lastEntry} lbs`;

    // Chart.js using the unique canvas ID
    const ctx = canvas.getContext('2d');
    if (window.wTrendChart) window.wTrendChart.destroy();

    window.wTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weightHistory.map(e => e.date),
            datasets: [
                {
                    label: 'Actual',
                    data: weightHistory.map(e => e.weight),
                    borderColor: '#4CAF50',
                    tension: 0.4
                },
                {
                    label: 'Goal',
                    data: new Array(weightHistory.length).fill(goalWeight),
                    borderColor: 'rgba(255, 99, 132, 0.5)',
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

let weightUnit = 'lbs'; // Global unit state

function setUnit(unit) {
    weightUnit = unit;

    // Update UI buttons
    document.getElementById('unitLbs').classList.toggle('active', unit === 'lbs');
    document.getElementById('unitKg').classList.toggle('active', unit === 'kg');

    // Update labels and charts
    updateWeightUI();
    saveData();
}

// In your logWeight function, ensure you handle the unit
function logWeight() {
    const val = parseFloat(document.getElementById('inputDailyWeight').value);
    if (!val) return;

    const dateKey = new Date().toISOString().split('T')[0];
    weightHistory.push({ date: dateKey, weight: val, unit: weightUnit });

    saveData();
    updateWeightUI();
}
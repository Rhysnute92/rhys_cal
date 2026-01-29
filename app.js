// 1. Global State Management
let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let weightHistory = [];
let recentScans = JSON.parse(localStorage.getItem('recentScans')) || [];
let restGoal = 1500, trainGoal = 1800;
let proteinGoal = 200, fatGoal = 45, carbGoal = 145, goalWeight = 170;
let isTrainingDay = false;
let currentActiveTab = 'Breakfast';
let searchTimer;

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    if (document.getElementById('activeMealList')) renderActiveList();
    if (document.getElementById('recentScansList')) renderRecentScans();
    if (document.getElementById('canvasWeightTrend')) updateWeightUI();
    if (document.getElementById('historyBody')) generateWeeklyTable();
});

function loadData() {
    const dateKey = new Date().toISOString().split('T')[0];
    const savedDay = JSON.parse(localStorage.getItem('day_' + dateKey));
    const savedGlobal = JSON.parse(localStorage.getItem('userSettings'));

    if (savedDay) {
        mealFoods = savedDay.mealFoods || mealFoods;
        isTrainingDay = savedDay.isTrainingDay || false;
    }

    if (savedGlobal) {
        weightHistory = savedGlobal.weightHistory || [];
        restGoal = savedGlobal.restGoal || 1500;
        trainGoal = savedGlobal.trainGoal || 1800;
        proteinGoal = savedGlobal.proteinGoal || 200;
        fatGoal = savedGlobal.fatGoal || 45;
        carbGoal = savedGlobal.carbGoal || 145;
    }

    const trainToggle = document.getElementById('trainingMode');
    if (trainToggle) {
        trainToggle.checked = isTrainingDay;
        const statusText = document.getElementById('trainingStatusText');
        if (statusText) statusText.innerText = isTrainingDay ? "Training Day" : "Rest Day";
        const workoutSection = document.getElementById('workoutInputSection');
        if (workoutSection) workoutSection.classList.toggle('hidden', !isTrainingDay);
    }
    updateDailyTotals();
}

function saveData() {
    const dateKey = new Date().toISOString().split('T')[0];
    localStorage.setItem('day_' + dateKey, JSON.stringify({ mealFoods, isTrainingDay }));
    localStorage.setItem('userSettings', JSON.stringify({
        weightHistory, restGoal, trainGoal, proteinGoal, fatGoal, carbGoal, goalWeight
    }));
}

// 3. Scanner & Recents Logic
function startScanner() {
    const viewport = document.getElementById('interactive');
    viewport.classList.remove('hidden');

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: viewport.querySelector('.video-container'),
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["ean_reader", "upc_reader", "code_128_reader"] }
    }, (err) => {
        if (err) return alert("Camera Error: " + err);
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        if (navigator.vibrate) navigator.vibrate(100);
        stopScanner();

        const code = data.codeResult.code;
        try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`).then(r => r.json());
            if (res.status === 1) {
                const p = res.product;
                const foodObj = {
                    name: p.product_name || "Unknown Item",
                    cal: Math.round(p.nutriments['energy-kcal_100g'] || 0),
                    p: Math.round(p.nutriments.proteins_100g || 0),
                    f: Math.round(p.nutriments.fats_100g || 0),
                    c: Math.round(p.nutriments.carbohydrates_100g || 0)
                };
                saveToRecents(foodObj);
                autoFillFromSearch(foodObj.name, foodObj.cal, foodObj.p, foodObj.f, foodObj.c);
            } else {
                alert("Barcode not found.");
                prepareManualEntry();
            }
        } catch (e) { prepareManualEntry(); }
    });
}

function stopScanner() {
    Quagga.stop();
    document.getElementById('interactive').classList.add('hidden');
}

function saveToRecents(food) {
    // Unique list by name, limit to 5
    recentScans = recentScans.filter(item => item.name !== food.name);
    recentScans.unshift(food);
    if (recentScans.length > 5) recentScans.pop();

    localStorage.setItem('recentScans', JSON.stringify(recentScans));
    renderRecentScans();
}

function renderRecentScans() {
    const container = document.getElementById('recentScansContainer');
    const list = document.getElementById('recentScansList');
    if (!list) return;

    if (recentScans.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = recentScans.map(f => `
        <div onclick="autoFillFromSearch('${f.name.replace(/'/g, "\\'")}', ${f.cal}, ${f.p}, ${f.f}, ${f.c})" class="recent-tag">
            🕒 ${f.name}
        </div>
    `).join('');
}

function clearRecents() {
    if (confirm("Clear your recent scan history?")) {
        recentScans = [];
        localStorage.removeItem('recentScans');
        renderRecentScans();
    }
}

// 4. Search & Manual Logic
async function searchGlobalDB(event) {
    const query = event.target.value.trim();
    const resultsBox = document.getElementById('searchResults');
    clearTimeout(searchTimer);

    if (query.length < 3) {
        resultsBox.innerHTML = '';
        resultsBox.classList.add('hidden');
        return;
    }

    searchTimer = setTimeout(async () => {
        resultsBox.innerHTML = '<p class="hint">Searching...</p>';
        resultsBox.classList.remove('hidden');

        try {
            const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
            const data = await response.json();

            if (!data.products || data.products.length === 0) {
                resultsBox.innerHTML = `<div class="search-item" onclick="prepareManualEntry()"><strong>⚠️ Not found</strong><small>Add manually</small></div>`;
                return;
            }

            resultsBox.innerHTML = data.products.map(p => {
                const name = (p.product_name || "Unknown").replace(/'/g, "\\'");
                const kcal = Math.round(p.nutriments['energy-kcal_100g'] || 0);
                const p_g = Math.round(p.nutriments.proteins_100g || 0);
                const f_g = Math.round(p.nutriments.fats_100g || 0);
                const c_g = Math.round(p.nutriments.carbohydrates_100g || 0);
                return `<div class="search-item" onclick="handleSearchResult('${name}', ${kcal}, ${p_g}, ${f_g}, ${c_g})">
                            <strong>${p.product_name}</strong><small>${kcal} kcal | P:${p_g} F:${f_g} C:${c_g}</small>
                        </div>`;
            }).join('');
        } catch (e) { resultsBox.innerHTML = '<p class="hint">Connection error</p>'; }
    }, 300);
}

function handleSearchResult(n, cal, p, f, c) {
    saveToRecents({name: n, cal: cal, p: p, f: f, c: c});
    autoFillFromSearch(n, cal, p, f, c);
}

function autoFillFromSearch(n, cal, p, f, c) {
    document.getElementById('manualEntryForm').classList.remove('hidden');
    document.getElementById('foodName').value = n;
    document.getElementById('foodCalories').value = cal;
    document.getElementById('protein').value = p;
    document.getElementById('fat').value = f;
    document.getElementById('carbs').value = c;
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('dbSearch').value = '';
}

function prepareManualEntry() {
    const query = document.getElementById('dbSearch').value;
    document.getElementById('manualEntryForm').classList.remove('hidden');
    document.getElementById('foodName').value = query;
    document.getElementById('searchResults').classList.add('hidden');
}

function toggleManualForm() {
    const form = document.getElementById('manualEntryForm');
    form.classList.toggle('hidden');
}

function toggleTrainingMode() {
    const trainToggle = document.getElementById('trainingMode');
    if (!trainToggle) return;

    isTrainingDay = trainToggle.checked;

    // Update UI labels
    const statusText = document.getElementById('trainingStatusText');
    if (statusText) statusText.innerText = isTrainingDay ? "Training Day" : "Rest Day";

    const workoutSection = document.getElementById('workoutInputSection');
    if (workoutSection) workoutSection.classList.toggle('hidden', !isTrainingDay);

    console.log("Training Mode:", isTrainingDay, "Target:", isTrainingDay ? trainGoal : restGoal);

    saveData();
    updateDailyTotals(); // This forces the 1800 math to run
}

function updateDailyTotals() {
    let totals = { cal: 0, p: 0, f: 0, c: 0 };
    Object.values(mealFoods).flat().forEach(f => {
        totals.cal += (parseInt(f.calories) || 0);
    });

    // CRITICAL: Ensure these variables (1500/1800) are used
    let baseGoal = isTrainingDay ? 1800 : 1500;

    let extraBurn = 0;
    const burnInput = document.getElementById('workoutBurn');
    if (isTrainingDay && burnInput) {
        extraBurn = parseInt(burnInput.value) || 0;
    }

    const totalBudget = baseGoal + extraBurn;
    const remEl = document.getElementById('remainingCalories');

    if (remEl) {
        const remaining = totalBudget - totals.cal;
        remEl.innerText = remaining;
        remEl.style.color = remaining < 0 ? "#ff4444" : "#4CAF50";
    }

    setBar('protein-bar', totals.p, proteinGoal);
    setBar('fat-bar', totals.f, fatGoal);
    setBar('carb-bar', totals.c, carbGoal);
}

function setBar(id, cur, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min((cur / goal) * 100, 100) + "%";
}

function addFood() {
    const name = document.getElementById('foodName').value;
    const cal = document.getElementById('foodCalories').value;
    if (!name || !cal) return;

    mealFoods[currentActiveTab].push({
        name,
        calories: parseInt(cal),
        protein: parseInt(document.getElementById('protein').value) || 0,
        fat: parseInt(document.getElementById('fat').value) || 0,
        carbs: parseInt(document.getElementById('carbs').value) || 0
    });

    saveData();
    renderActiveList();
    updateDailyTotals();

    // Reset Form
    ['foodName', 'foodCalories', 'protein', 'fat', 'carbs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('manualEntryForm').classList.add('hidden');
}

function renderActiveList() {
    const container = document.getElementById('activeMealList');
    if (!container) return;
    const foods = mealFoods[currentActiveTab] || [];
    container.innerHTML = foods.length === 0 ? '<p class="hint">Empty</p>' :
        foods.map((f, i) => `
            <div class="library-item">
                <div><strong>${f.name}</strong><br><small>${f.calories} kcal</small></div>
                <button class="delete-small" onclick="deleteItem('${currentActiveTab}', ${i})">✕</button>
            </div>`).join('');
}

function deleteItem(cat, idx) {
    mealFoods[cat].splice(idx, 1);
    saveData(); renderActiveList(); updateDailyTotals();
}

function multiplyQuantity(factor) {
    ['foodCalories', 'protein', 'fat', 'carbs'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value) el.value = Math.round(parseFloat(el.value) * factor);
    });
}

function switchTab(cat) {
    currentActiveTab = cat;
    document.querySelectorAll('.tile').forEach(t => t.classList.toggle('active', t.innerText.includes(cat)));
    document.getElementById('currentTabLabel').innerText = `Logging ${cat}`;
    renderActiveList();
}

let weightChart;

// Initialize Chart on Load
function initWeightChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Dates
            datasets: [{
                label: 'Weight',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
    updateChartData();
}

function logWeight() {
    const val = document.getElementById('inputDailyWeight').value;
    if (!val) return;

    const entry = {
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: parseFloat(val)
    };

    // Save to history (keep last 7 entries for the graph)
    weightHistory.push(entry);
    if (weightHistory.length > 7) weightHistory.shift();

    saveData();
    updateChartData();
    document.getElementById('inputDailyWeight').value = '';
}

function updateChartData() {
    if (!weightChart) return;

    weightChart.data.labels = weightHistory.map(e => e.date);
    weightChart.data.datasets[0].data = weightHistory.map(e => e.weight);
    weightChart.update();

    // Calculate Trend
    const diffEl = document.getElementById('weightDiff');
    if (weightHistory.length >= 2) {
        const diff = weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight;
        const color = diff <= 0 ? "#4CAF50" : "#ff4444";
        const sign = diff > 0 ? "+" : "";
        diffEl.innerHTML = `<span style="color: ${color}">${sign}${diff.toFixed(1)} ${weightUnit} overall</span>`;
    }
}

// Call init in your DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", () => {
    // ... existing loadData logic ...
    initWeightChart();
});
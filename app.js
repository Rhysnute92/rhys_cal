// 1. Global State Management
let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let weightHistory = [];
let restGoal = 1500, trainGoal = 1800;
let proteinGoal = 200, fatGoal = 45, carbGoal = 145, goalWeight = 170;
let isTrainingDay = false;
let weightUnit = 'lbs';
let currentActiveTab = 'Breakfast';
let searchTimer;

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    // Initialize page-specific UI
    if (document.getElementById('activeMealList')) renderActiveList();
    if (document.getElementById('frequentList')) updateFrequentItems();
    if (document.getElementById('canvasWeightTrend')) updateWeightUI();
    if (document.getElementById('weeklySummaryBody')) generateWeeklyTable();
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
        goalWeight = savedGlobal.goalWeight || 170;
        weightUnit = savedGlobal.weightUnit || 'lbs';
    }

    // Sync UI elements
    const trainToggle = document.getElementById('trainingMode');
    if (trainToggle) {
        trainToggle.checked = isTrainingDay;
        // Ensure workout section visibility matches state on load
        const workoutSection = document.getElementById('workoutInputSection');
        if (workoutSection) workoutSection.classList.toggle('hidden', !isTrainingDay);
        const statusText = document.getElementById('trainingStatusText');
        if (statusText) statusText.innerText = isTrainingDay ? "Training Day" : "Rest Day";
    }

    updateGoalDisplays();
    updateDailyTotals();
}

function saveData() {
    const dateKey = new Date().toISOString().split('T')[0];
    localStorage.setItem('day_' + dateKey, JSON.stringify({ mealFoods, isTrainingDay }));
    localStorage.setItem('userSettings', JSON.stringify({
        weightHistory, restGoal, trainGoal, proteinGoal, fatGoal, carbGoal, goalWeight, weightUnit
    }));
}

// 3. Training & Dashboard Logic
function toggleTrainingMode() {
    const trainToggle = document.getElementById('trainingMode');
    const workoutSection = document.getElementById('workoutInputSection');
    const statusText = document.getElementById('trainingStatusText');

    isTrainingDay = trainToggle.checked;

    if (statusText) statusText.innerText = isTrainingDay ? "Training Day" : "Rest Day";
    if (workoutSection) workoutSection.classList.toggle('hidden', !isTrainingDay);

    saveData();
    updateDailyTotals();
}

function setWorkoutPreset(val) {
    const input = document.getElementById('workoutBurn');
    if (input) {
        input.value = val;
        updateDailyTotals();
        saveData();
    }
}

// 4. Database Search & Manual Form logic
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
                resultsBox.innerHTML = `<div class="search-item" onclick="prepareManualEntry()"><strong>⚠️ Not found</strong><small>Tap to enter manually</small></div>`;
                return;
            }

            resultsBox.innerHTML = data.products.map(p => {
                const name = p.product_name ? p.product_name.replace(/'/g, "\\'") : "Unknown";
                const kcal = p.nutriments['energy-kcal_100g'] || 0;
                const p_g = p.nutriments.proteins_100g || 0;
                const f_g = p.nutriments.fats_100g || 0;
                const c_g = p.nutriments.carbohydrates_100g || 0;
                return `<div class="search-item" onclick="autoFillFromSearch('${name}', ${kcal}, ${p_g}, ${f_g}, ${c_g})">
                            <strong>${p.product_name}</strong><small>${kcal} kcal | P:${p_g} F:${f_g} C:${c_g}</small>
                        </div>`;
            }).join('');
        } catch (e) { resultsBox.innerHTML = '<p class="hint">Connection error</p>'; }
    }, 300);
}

function toggleManualForm() {
    const form = document.getElementById('manualEntryForm');
    const btn = document.getElementById('toggleManualBtn');
    if (!form) return;
    const isHidden = form.classList.toggle('hidden');
    btn.innerText = isHidden ? "+ Add Custom Item Manually" : "- Hide Manual Form";
}

function prepareManualEntry() {
    const query = document.getElementById('dbSearch').value;
    ['foodName', 'foodCalories', 'protein', 'fat', 'carbs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('foodName').value = query;
    document.getElementById('manualEntryForm').classList.remove('hidden');
    document.getElementById('toggleManualBtn').innerText = "- Hide Manual Form";
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('foodName').focus();
}

function autoFillFromSearch(n, cal, p, f, c) {
    document.getElementById('manualEntryForm').classList.remove('hidden');
    document.getElementById('toggleManualBtn').innerText = "- Hide Manual Form";
    document.getElementById('foodName').value = n;
    document.getElementById('foodCalories').value = Math.round(cal);
    document.getElementById('protein').value = Math.round(p);
    document.getElementById('fat').value = Math.round(f);
    document.getElementById('carbs').value = Math.round(c);
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('dbSearch').value = '';
}

// 5. Logging & Totals
function addFood() {
    const name = document.getElementById('foodName').value;
    const cal = document.getElementById('foodCalories').value;
    if (!name || !cal) return;

    mealFoods[currentActiveTab].push({
        name, calories: parseInt(cal),
        protein: parseInt(document.getElementById('protein').value) || 0,
        fat: parseInt(document.getElementById('fat').value) || 0,
        carbs: parseInt(document.getElementById('carbs').value) || 0
    });

    saveData();
    renderActiveList();
    updateDailyTotals();

    ['foodName', 'foodCalories', 'protein', 'fat', 'carbs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('manualEntryForm').classList.add('hidden');
    document.getElementById('toggleManualBtn').innerText = "+ Add Custom Item Manually";
}

function updateDailyTotals() {
    let totals = { cal: 0, p: 0, f: 0, c: 0 };
    Object.values(mealFoods).flat().forEach(f => {
        totals.cal += (parseInt(f.calories) || 0);
        totals.p += (parseInt(f.protein) || 0);
        totals.f += (parseInt(f.fat) || 0);
        totals.c += (parseInt(f.carbs) || 0);
    });

    // Calorie Math: (Base Goal + Workout Burn) - Eaten
    let activeGoal = isTrainingDay ? trainGoal : restGoal;
    let extraBurn = 0;
    const burnInput = document.getElementById('workoutBurn');
    if (isTrainingDay && burnInput) extraBurn = parseInt(burnInput.value) || 0;

    const totalBudget = activeGoal + extraBurn;
    const remEl = document.getElementById('remainingCalories');
    if (remEl) {
        const remaining = totalBudget - totals.cal;
        remEl.innerText = remaining;
        remEl.style.color = remaining < 0 ? "#ff4444" : "#4CAF50";
    }

    setBar('protein-bar', totals.p, proteinGoal);
    setBar('fat-bar', totals.f, fatGoal);
    setBar('carb-bar', totals.c, carbGoal);
    if (document.getElementById('canvasMacroDist')) drawCharts(totals);
}

// 6. Utility Functions (Bars, Tabs, Charts)
function setBar(id, cur, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min((cur / goal) * 100, 100) + "%";
}

function switchTab(cat) {
    currentActiveTab = cat;
    document.querySelectorAll('.tile').forEach(t => t.classList.toggle('active', t.innerText.includes(cat)));
    document.getElementById('currentTabLabel').innerText = `Logging ${cat}`;
    renderActiveList();
}

function renderActiveList() {
    const container = document.getElementById('activeMealList');
    if (!container) return;
    const foods = mealFoods[currentActiveTab] || [];
    container.innerHTML = foods.length === 0 ? '<p class="hint">Empty</p>' :
        foods.map((f, i) => `<div class="library-item"><div><strong>${f.name}</strong><br><small>${f.calories} kcal</small></div><button class="delete-small" onclick="deleteItem('${currentActiveTab}', ${i})">✕</button></div>`).join('');
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

function updateGoalDisplays() {
    const ds = { 'displayGoalP': proteinGoal, 'displayGoalF': fatGoal, 'displayGoalC': carbGoal };
    Object.entries(ds).forEach(([id, val]) => { if (document.getElementById(id)) document.getElementById(id).innerText = val; });
}

// 7. Scanner
function startScanner() {
    const viewport = document.getElementById('interactive');
    viewport.classList.remove('hidden'); // Show the camera window

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: viewport,
            constraints: {
                facingMode: "environment", // Uses back camera
                width: { min: 640 },
                height: { min: 480 }
            }
        },
        decoder: {
            readers: ["ean_reader", "upc_reader", "code_128_reader"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            alert("Could not start camera. Check permissions.");
            return;
        }
        Quagga.start();
    });

    // Handle detection
    Quagga.onDetected(async (data) => {
        const code = data.codeResult.code;
        // Provide haptic feedback if the device supports it
        if (navigator.vibrate) navigator.vibrate(100);

        stopScanner(); // Close camera immediately after success

        // Fetch from OpenFoodFacts API
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
            const res = await response.json();
            if (res.status === 1) {
                autoFillFromSearch(
                    res.product.product_name || "Scanned Item",
                    res.product.nutriments['energy-kcal_100g'] || 0,
                    res.product.nutriments.proteins_100g || 0,
                    res.product.nutriments.fats_100g || 0,
                    res.product.nutriments.carbohydrates_100g || 0
                );
            } else {
                alert("Barcode not in database. Opening manual entry...");
                prepareManualEntry();
            }
        } catch (e) {
            console.error("Scanner Error:", e);
        }
    });
}

// Function to manually close the scanner
function stopScanner() {
    Quagga.stop();
    const viewport = document.getElementById('interactive');
    viewport.classList.add('hidden');
}

function generateWeeklyTable() {
    const table = document.getElementById('historyBody');
    if (!table) return;

    let html = '';
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayData = JSON.parse(localStorage.getItem('day_' + key));

        if (dayData) {
            let t = { c: 0, p: 0, f: 0, carb: 0 };
            Object.values(dayData.mealFoods).flat().forEach(f => {
                t.c += f.calories; t.p += f.protein; t.f += f.fat; t.carb += f.carbs;
            });

            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px 0;">${d.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</td>
                <td><strong>${t.c}</strong></td>
                <td style="color:#888;">${t.p}/${t.f}/${t.carb}</td>
            </tr>`;
        }
    }
    table.innerHTML = html || '<tr><td colspan="3" class="hint">No history found yet.</td></tr>';
}

function exportToCSV() {
    // 1. Setup the Header Row
    let csvContent = "Date,Meal,Item,Calories,Protein,Fat,Carbs\n";

    // 2. Collect all keys from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('day_'));
    keys.sort(); // Sort by date

    if (keys.length === 0) {
        alert("No data found to export!");
        return;
    }

    // 3. Loop through days and meals
    keys.forEach(key => {
        const date = key.replace('day_', '');
        const dayData = JSON.parse(localStorage.getItem(key));

        if (dayData && dayData.mealFoods) {
            Object.entries(dayData.mealFoods).forEach(([mealName, foods]) => {
                foods.forEach(f => {
                    const row = [
                        date,
                        mealName,
                        `"${f.name.replace(/"/g, '""')}"`, // Escape quotes in food names
                        f.calories,
                        f.protein,
                        f.fat,
                        f.carbs
                    ].join(",");
                    csvContent += row + "\n";
                });
            });
        }
    });

    // 4. Create the download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fitness_history_${new Date().toISOString().split('T')[0]}.csv`);

    // 5. Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
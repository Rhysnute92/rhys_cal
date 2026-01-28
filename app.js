// 1. Global State
let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let weightHistory = [];
let restGoal = 1500, trainGoal = 1800;
let proteinGoal = 200, fatGoal = 45, carbGoal = 145, goalWeight = 170;
let isTrainingDay = false;
let weightUnit = 'lbs';
let currentActiveTab = 'Breakfast';
let searchTimer; // For automatic search debounce

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    // Page-specific initializers
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

    const trainToggle = document.getElementById('trainingMode');
    if (trainToggle) trainToggle.checked = isTrainingDay;

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

// 3. Automatic Search & Scanner Logic
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
        resultsBox.innerHTML = '<p class="hint">Searching database...</p>';
        resultsBox.classList.remove('hidden');

        try {
            const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
            const data = await response.json();

            if (!data.products || data.products.length === 0) {
                resultsBox.innerHTML = '<p class="hint">No products found.</p>';
                return;
            }

            resultsBox.innerHTML = data.products.map(p => {
                const name = p.product_name ? p.product_name.replace(/'/g, "\\'") : "Unknown";
                const kcal = p.nutriments['energy-kcal_100g'] || 0;
                const p_g = p.nutriments.proteins_100g || 0;
                const f_g = p.nutriments.fats_100g || 0;
                const c_g = p.nutriments.carbohydrates_100g || 0;

                return `
                    <div class="search-item" onclick="autoFillFromSearch('${name}', ${kcal}, ${p_g}, ${f_g}, ${c_g})">
                        <strong>${p.product_name || 'Unknown'}</strong>
                        <small>${kcal} kcal | P:${p_g} F:${f_g} C:${c_g}</small>
                    </div>
                `;
            }).join('');
        } catch (e) {
            resultsBox.innerHTML = '<p class="hint">Error connecting to database.</p>';
        }
    }, 300);
}

function autoFillFromSearch(n, cal, p, f, c) {
    document.getElementById('foodName').value = n;
    document.getElementById('foodCalories').value = Math.round(cal);
    document.getElementById('protein').value = Math.round(p);
    document.getElementById('fat').value = Math.round(f);
    document.getElementById('carbs').value = Math.round(c);
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('dbSearch').value = ''; // Clear search bar
}

function startScanner() {
    const viewport = document.getElementById('interactive');
    viewport.style.display = "block";

    Quagga.init({
        inputStream: { name: "Live", type: "LiveStream", target: viewport, constraints: { facingMode: "environment" } },
        decoder: { readers: ["ean_reader", "upc_reader", "code_128_reader"] }
    }, function(err) {
        if (err) { console.error(err); return; }
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        const code = data.codeResult.code;
        Quagga.stop();
        viewport.style.display = "none";

        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
            const res = await response.json();
            if (res.status === 1) {
                const p = res.product;
                autoFillFromSearch(
                    p.product_name || "Scanned Item",
                    p.nutriments['energy-kcal_100g'] || 0,
                    p.nutriments.proteins_100g || 0,
                    p.nutriments.fats_100g || 0,
                    p.nutriments.carbohydrates_100g || 0
                );
            } else { alert("Product not found."); }
        } catch (e) { console.error("Scanner error", e); }
    });
}

// 4. Logging & UI Updates
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
    updateFrequentItems();
    ['foodName', 'foodCalories', 'protein', 'fat', 'carbs'].forEach(id => document.getElementById(id).value = '');
}

function switchTab(category) {
    currentActiveTab = category;
    document.querySelectorAll('.tile').forEach(t => t.classList.toggle('active', t.innerText.includes(category)));
    document.getElementById('currentTabLabel').innerText = `Logging ${category}`;
    const wt = document.getElementById('waterTracker');
    if (wt) wt.classList.toggle('hidden', category !== 'Drinks');
    renderActiveList();
}

function multiplyQuantity(factor) {
    ['foodCalories', 'protein', 'fat', 'carbs'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value) el.value = Math.round(parseFloat(el.value) * factor);
    });
}

function renderActiveList() {
    const container = document.getElementById('activeMealList');
    if (!container) return;
    const foods = mealFoods[currentActiveTab] || [];
    container.innerHTML = foods.length === 0 ? '<p class="hint">No items logged yet.</p>' :
        foods.map((f, i) => `
            <div class="library-item">
                <div><strong>${f.name}</strong><br><small>${f.calories} kcal | P:${f.protein} F:${f.fat} C:${f.carbs}</small></div>
                <button class="delete-small" onclick="deleteItem('${currentActiveTab}', ${i})">✕</button>
            </div>
        `).join('');
}

function deleteItem(cat, index) {
    mealFoods[cat].splice(index, 1);
    saveData(); renderActiveList(); updateDailyTotals();
}

// 5. Dashboard & Totals
function updateDailyTotals() {
    let totals = { cal: 0, p: 0, f: 0, c: 0 };
    Object.values(mealFoods).flat().forEach(f => {
        totals.cal += (parseInt(f.calories) || 0);
        totals.p += (parseInt(f.protein) || 0);
        totals.f += (parseInt(f.fat) || 0);
        totals.c += (parseInt(f.carbs) || 0);
    });

    const activeGoal = isTrainingDay ? trainGoal : restGoal;
    const remEl = document.getElementById('remainingCalories');
    if (remEl) {
        const rem = activeGoal - totals.cal;
        remEl.innerText = rem;
        remEl.style.color = rem < 0 ? "#ff4444" : "#4CAF50";
    }

    setBar('protein-bar', totals.p, proteinGoal);
    setBar('fat-bar', totals.f, fatGoal);
    setBar('carb-bar', totals.c, carbGoal);
}

function setBar(id, cur, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min((cur / goal) * 100, 100) + "%";
}

function updateGoalDisplays() {
    const ds = { 'displayGoalP': proteinGoal, 'displayGoalF': fatGoal, 'displayGoalC': carbGoal };
    Object.entries(ds).forEach(([id, val]) => { if (document.getElementById(id)) document.getElementById(id).innerText = val; });
}

function copyYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('day_' + dateKey));

    if (!saved || !saved.mealFoods || !saved.mealFoods[currentActiveTab] || saved.mealFoods[currentActiveTab].length === 0) {
        alert(`No ${currentActiveTab} found for yesterday.`);
        return;
    }

    if (confirm(`Add yesterday's ${currentActiveTab} items?`)) {
        mealFoods[currentActiveTab].push(...JSON.parse(JSON.stringify(saved.mealFoods[currentActiveTab])));
        saveData(); renderActiveList(); updateDailyTotals();
    }
}
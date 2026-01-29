// TOP OF APP.JS
const weightUnit = localStorage.getItem('weightUnit') || 'kg';
let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};

const gymDB = [
    { name: "Barbell Bench Press", equipment: "Barbell", muscle: "Chest" },
    { name: "Barbell Squat", equipment: "Barbell", muscle: "Legs" },
    { name: "Deadlift", equipment: "Barbell", muscle: "Back" },
    { name: "Lat Pulldown", equipment: "Cable", muscle: "Back" },
    { name: "DB Lateral Raise", equipment: "Dumbbells", muscle: "Shoulders" },
    { name: "Tricep Pushdown", equipment: "Cable", muscle: "Arms" },
    { name: "Bicep Curl", equipment: "Dumbbells", muscle: "Arms" }
    // ... add more as needed
];

// --- CALENDAR RENDER FIX ---
function renderCalendar() {
    const calendar = document.getElementById('workoutCalendar');
    if (!calendar) return; // Prevents error if not on Training page

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    document.getElementById('calendarMonth').innerText =
        now.toLocaleString('default', { month: 'long' });

    let html = '';
    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const active = workoutData[dateKey] && workoutData[dateKey].length > 0;

        html += `<div class="cal-day ${active ? 'trained' : ''}">${i}</div>`;
    }
    calendar.innerHTML = html;
}

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

// --- GYM DATABASE ---
const gymDB = [
    { name: "Barbell Bench Press", equipment: "Barbell", muscle: "Chest" },
    { name: "Dumbbell Bench Press", equipment: "Dumbbells", muscle: "Chest" },
    { name: "Incline DB Press", equipment: "Dumbbells", muscle: "Upper Chest" },
    { name: "Lat Pulldown", equipment: "Cable", muscle: "Back" },
    { name: "Seated Cable Row", equipment: "Cable", muscle: "Back" },
    { name: "Barbell Squat", equipment: "Barbell", muscle: "Legs" },
    { name: "Leg Press", equipment: "Machine", muscle: "Legs" },
    { name: "Deadlift", equipment: "Barbell", muscle: "Back/Legs" },
    { name: "DB Lateral Raise", equipment: "Dumbbells", muscle: "Shoulders" },
    { name: "Overhead Press", equipment: "Barbell", muscle: "Shoulders" },
    { name: "Bicep Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Tricep Pushdown", equipment: "Cable", muscle: "Arms" },
    { name: "Pull-ups", equipment: "Bodyweight", muscle: "Back" },
    { name: "Dips", equipment: "Bodyweight", muscle: "Triceps/Chest" }
];

let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};

// --- SEARCH LOGIC ---
function searchExercises(event) {
    const query = event.target.value.toLowerCase();
    const resultsBox = document.getElementById('exerciseResults');

    if (query.length < 2) {
        resultsBox.innerHTML = '';
        resultsBox.classList.add('hidden');
        return;
    }

    const filtered = gymDB.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query)
    );

    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = filtered.map(ex => `
        <div class="search-item" onclick="selectExercise('${ex.name}')">
            <strong>${ex.name}</strong>
            <small style="display:block; color:#666;">🔨 ${ex.equipment} | 💪 ${ex.muscle}</small>
        </div>
    `).join('');
}

// --- PB & SELECTION LOGIC ---
function selectExercise(name) {
    document.getElementById('exerciseSearch').value = name;
    document.getElementById('exerciseResults').classList.add('hidden');

    const pb = findPersonalBest(name);
    const pbDiv = document.getElementById('pbDisplay');

    if (pb) {
        pbDiv.innerHTML = `⭐ PB: <strong>${pb.weight}${weightUnit}</strong> (${pb.sets}x${pb.reps})`;
        pbDiv.style.color = "#4CAF50";
        document.getElementById('weight').value = pb.weight; // Auto-fill last best weight
    } else {
        pbDiv.innerHTML = "🆕 First time logging this exercise!";
        pbDiv.style.color = "#2196F3";
    }
    document.getElementById('sets').focus();
}

function findPersonalBest(exerciseName) {
    let bestWeight = 0;
    let bestEntry = null;

    Object.values(workoutData).forEach(dayExercises => {
        dayExercises.forEach(ex => {
            if (ex.name === exerciseName) {
                const currentWeight = parseFloat(ex.weight);
                if (currentWeight > bestWeight) {
                    bestWeight = currentWeight;
                    bestEntry = ex;
                }
            }
        });
    });
    return bestEntry;
}

// --- ADDING & SAVING ---
function addExercise() {
    const name = document.getElementById('exerciseSearch').value;
    const s = document.getElementById('sets').value;
    const r = document.getElementById('reps').value;
    const w = document.getElementById('weight').value;

    if (!name || !s || !r || !w) return alert("Please fill all fields");

    const dateKey = new Date().toISOString().split('T')[0];
    if (!workoutData[dateKey]) workoutData[dateKey] = [];

    // Check for New PB
    const oldPB = findPersonalBest(name);
    if (oldPB && parseFloat(w) > parseFloat(oldPB.weight)) {
        alert("🎉 NEW PERSONAL BEST!");
    }

    workoutData[dateKey].push({ name, sets: s, reps: r, weight: w });
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    // UI Reset
    ['exerciseSearch', 'sets', 'reps', 'weight'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pbDisplay').innerHTML = '';
    renderWorkout();
}

function renderWorkout() {
    const list = document.getElementById('exerciseList');
    if (!list) return;

    const dateKey = new Date().toISOString().split('T')[0];
    const todayWorkout = workoutData[dateKey] || [];

    list.innerHTML = todayWorkout.length === 0 ?
        '<p class="hint">No exercises logged today.</p>' :
        todayWorkout.map((ex, i) => `
            <div class="library-item">
                <div>
                    <strong>${ex.name}</strong><br>
                    <small>${ex.sets} sets x ${ex.reps} reps @ ${ex.weight}${weightUnit}</small>
                </div>
                <button class="delete-small" onclick="deleteExercise(${i})">✕</button>
            </div>
        `).join('');
}

function deleteExercise(index) {
    const dateKey = new Date().toISOString().split('T')[0];
    workoutData[dateKey].splice(index, 1);
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    renderWorkout();
}

let timerInterval;
let defaultRestTime = 90; // Default starts at 90s
let restTimeRemaining;

function setCustomTimer() {
    const userTime = prompt("Enter rest time in seconds:", defaultRestTime);
    if (userTime && !isNaN(userTime)) {
        defaultRestTime = parseInt(userTime);
        // If timer is already running, update it immediately
        if (!document.getElementById('restTimerOverlay').classList.contains('hidden')) {
            restTimeRemaining = defaultRestTime;
            updateTimerDisplay();
        }
    }
}

function startRestTimer() {
    const overlay = document.getElementById('restTimerOverlay');
    overlay.classList.remove('hidden');

    restTimeRemaining = defaultRestTime;
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        restTimeRemaining--;
        updateTimerDisplay();

        if (restTimeRemaining <= 0) {
            stopTimer();
            playTimerAlert();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const mins = Math.floor(restTimeRemaining / 60);
    const secs = restTimeRemaining % 60;
    display.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function stopTimer() {
    clearInterval(timerInterval);
    document.getElementById('restTimerOverlay').classList.add('hidden');
}

function playTimerAlert() {
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    // Play a subtle beep using Web Audio API (No files needed!)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);

    alert("Time to lift! 💪");
}

function searchExercises(event) {
    const query = event.target.value.toLowerCase();
    const resultsBox = document.getElementById('exerciseResults');

    if (query.length < 2) {
        resultsBox.innerHTML = '';
        resultsBox.classList.add('hidden');
        return;
    }

    // Search names and equipment
    const filtered = gymDB.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        resultsBox.classList.remove('hidden');
        resultsBox.innerHTML = filtered.map(ex => `
            <div class="search-item" onclick="selectExercise('${ex.name.replace(/'/g, "\\'")}')">
                <strong>${ex.name}</strong>
                <small style="display:block; color:var(--primary);">🔨 ${ex.equipment} | 💪 ${ex.muscle}</small>
            </div>
        `).join('');
    } else {
        // Option to add as custom if not found
        resultsBox.innerHTML = `
            <div class="search-item" onclick="selectExercise('${query}')">
                <strong>Add "${query}"</strong><small> (Custom Exercise)</small>
            </div>`;
    }
}

function selectExercise(name) {
    const searchInput = document.getElementById('exerciseSearch');
    const resultsBox = document.getElementById('exerciseResults');
    const pbDiv = document.getElementById('pbDisplay');

    searchInput.value = name;
    resultsBox.classList.add('hidden');

    // Find PB logic
    let bestWeight = 0;
    Object.values(workoutData).flat().forEach(ex => {
        if (ex.name === name && parseFloat(ex.weight) > bestWeight) {
            bestWeight = parseFloat(ex.weight);
        }
    });

    if (bestWeight > 0) {
        pbDiv.innerHTML = `⭐ PB: <strong>${bestWeight}${weightUnit}</strong>`;
        pbDiv.style.color = "var(--primary)";
        document.getElementById('weight').value = bestWeight; // Suggest previous weight
    } else {
        pbDiv.innerHTML = "🆕 New exercise detected!";
        pbDiv.style.color = "#2196F3";
    }

    document.getElementById('sets').focus();
}

function renderCalendar() {
    const calendar = document.getElementById('workoutCalendar');
    const monthLabel = document.getElementById('calendarMonth');
    if (!calendar) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    monthLabel.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    let html = '';
    // Add Day Headers
    ['S','M','T','W','T','F','S'].forEach(d => html += `<div style="font-size:0.6rem; color:#999; font-weight:bold;">${d}</div>`);

    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const hasWorkout = workoutData[dateKey] && workoutData[dateKey].length > 0;

        html += `
            <div onclick="showHistoryDetail('${dateKey}')" 
                 style="padding: 8px 0; border-radius: 6px; font-size: 0.8rem; cursor: pointer; 
                 ${hasWorkout ? 'background: var(--primary); color: white; font-weight:bold;' : 'background: #f9f9f9;'}">
                ${i}
            </div>`;
    }
    calendar.innerHTML = html;
}

function showHistoryDetail(dateKey) {
    const detailBox = document.getElementById('historyDetail');
    const list = document.getElementById('historyExerciseList');
    const dateLabel = document.getElementById('selectedHistoryDate');
    const exercises = workoutData[dateKey] || [];

    detailBox.classList.remove('hidden');
    dateLabel.innerText = new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    if (exercises.length === 0) {
        list.innerHTML = '<p class="hint">No workout logged for this day.</p>';
        return;
    }

    list.innerHTML = exercises.map(ex => `
        <div style="font-size: 0.8rem; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
            <strong>${ex.name}</strong>: ${ex.sets}x${ex.reps} @ ${ex.weight}${weightUnit}
        </div>
    `).join('');
}

// Ensure this is called in your DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    // ... existing init calls ...
    if (document.getElementById('workoutCalendar')) renderCalendar();
});
let currentlyViewingDate = ""; // Track which date is open for sharing

function showHistoryDetail(dateKey) {
    currentlyViewingDate = dateKey; // Save the date key for the copy function
    const detailBox = document.getElementById('historyDetail');
    const list = document.getElementById('historyExerciseList');
    const dateLabel = document.getElementById('selectedHistoryDate');
    const exercises = workoutData[dateKey] || [];

    detailBox.classList.remove('hidden');
    dateLabel.innerText = new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    if (exercises.length === 0) {
        list.innerHTML = '<p class="hint">No workout logged for this day.</p>';
        return;
    }

    list.innerHTML = exercises.map(ex => `
        <div style="font-size: 0.8rem; padding: 5px 0; border-bottom: 1px solid #f0f0f0;">
            <strong>${ex.name}</strong>: ${ex.sets}x${ex.reps} @ ${ex.weight}${weightUnit}
        </div>
    `).join('');
}

async function copyWorkoutToClipboard() {
    const exercises = workoutData[currentlyViewingDate] || [];
    if (exercises.length === 0) return;

    const dateStr = new Date(currentlyViewingDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    // Format the text
    let shareText = `💪 Workout Summary: ${dateStr}\n`;
    shareText += `--------------------------\n`;

    exercises.forEach(ex => {
        shareText += `• ${ex.name}: ${ex.sets} sets x ${ex.reps} reps @ ${ex.weight}${weightUnit}\n`;
    });

    try {
        await navigator.clipboard.writeText(shareText);
        alert("Workout copied to clipboard! Go paste it in your chat.");
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

function calculate1RM(weight, reps) {
    if (reps == 1) return weight;
    if (reps > 12) return null; // Formula becomes less accurate above 12 reps

    // Brzycki Formula
    const estimate = weight / (1.0278 - (0.0278 * reps));
    return Math.round(estimate * 2) / 2; // Round to nearest 0.5
}

function updateMaxEffortUI(weight, reps) {
    const maxCard = document.getElementById('maxEffortCard');
    const maxVal = document.getElementById('oneRepMaxVal');

    const estimate = calculate1RM(parseFloat(weight), parseInt(reps));

    if (estimate && maxCard) {
        maxCard.classList.remove('hidden');
        maxVal.innerText = `${estimate}${weightUnit}`;
    }
}

// Update your addExercise function to trigger the calculation
function addExercise() {
    const name = document.getElementById('exerciseSearch').value;
    const s = document.getElementById('sets').value;
    const r = document.getElementById('reps').value;
    const w = document.getElementById('weight').value;

    if (!name || !s || !r || !w) return;

    // ... (Your existing PB and saving logic) ...

    // Calculate and show the 1RM for the set just performed
    updateMaxEffortUI(w, r);

    startRestTimer();
    renderWorkout();
}

function updateVolumeStats() {
    const statsRow = document.getElementById('workoutStats');
    const volDisplay = document.getElementById('totalVolumeVal');
    const countDisplay = document.getElementById('totalExVal');

    const dateKey = new Date().toISOString().split('T')[0];
    const todayWorkout = workoutData[dateKey] || [];

    if (todayWorkout.length === 0) {
        statsRow.classList.add('hidden');
        return;
    }

    statsRow.classList.remove('hidden');

    // Calculate total volume
    const totalVolume = todayWorkout.reduce((acc, ex) => {
        return acc + (parseInt(ex.sets) * parseInt(ex.reps) * parseFloat(ex.weight));
    }, 0);

    volDisplay.innerText = `${totalVolume.toLocaleString()}${weightUnit}`;
    countDisplay.innerText = todayWorkout.length;
}

// Call this inside your renderWorkout function
function renderWorkout() {
    // ... existing render logic ...

    updateVolumeStats(); // Add this line at the end
}

// Ensure these run as soon as the page opens
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Gym Data
    if (document.getElementById('workoutCalendar')) {
        renderCalendar();
    }
    if (document.getElementById('exerciseList')) {
        renderWorkout();
    }
});

// --- THE SEARCH FUNCTION ---
function searchExercises(event) {
    const query = event.target.value.toLowerCase();
    const resultsBox = document.getElementById('exerciseResults');

    if (query.length < 2) {
        resultsBox.innerHTML = '';
        resultsBox.classList.add('hidden');
        return;
    }

    // This looks through the gymDB array we created earlier
    const filtered = gymDB.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        resultsBox.classList.remove('hidden');
        resultsBox.innerHTML = filtered.map(ex => `
            <div class="search-item" style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;" 
                 onclick="selectExercise('${ex.name.replace(/'/g, "\\'")}')">
                <strong>${ex.name}</strong><br>
                <small>🔨 ${ex.equipment}</small>
            </div>
        `).join('');
    }
}

// --- THE CALENDAR FUNCTION ---

function updateDashboardTrainingTile() {
    const volEl = document.getElementById('dashWorkoutVol');
    const countEl = document.getElementById('dashExerciseCount');
    if (!volEl || !countEl) return;

    const dateKey = new Date().toISOString().split('T')[0];
    const todayWorkout = workoutData[dateKey] || [];

    if (todayWorkout.length > 0) {
        const totalVolume = todayWorkout.reduce((acc, ex) => {
            return acc + (parseInt(ex.sets) * parseInt(ex.reps) * parseFloat(ex.weight));
        }, 0);

        volEl.innerText = totalVolume.toLocaleString();
        countEl.innerHTML = `<strong>${todayWorkout.length}</strong> exercises completed today`;
        document.getElementById('trainingStatusIcon').innerText = "✅";
    } else {
        volEl.innerText = "0";
        countEl.innerText = "No exercises logged today";
        document.getElementById(
            'trainingStatusIcon').innerText = "💪";
    }
}

// Add this to your existing DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", () => {
    // ... other init calls (loadData, renderCalendar, etc.)
    updateDashboardTrainingTile();
});

// --- EXPORT DATA ---
function exportData() {
    const fullBackup = {
        foodData: JSON.parse(localStorage.getItem('foodData')) || {},
        workoutData: JSON.parse(localStorage.getItem('workoutData')) || {},
        weightHistory: JSON.parse(localStorage.getItem('weightHistory')) || [],
        userSettings: {
            unit: weightUnit,
            goals: localStorage.getItem('dailyGoal') || 2000
        },
        timestamp: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fitness_backup_${new Date().toLocaleDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// --- IMPORT DATA ---
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            // Confirm with user
            if (confirm("This will overwrite your current data with the backup. Proceed?")) {
                localStorage.setItem('foodData', JSON.stringify(imported.foodData));
                localStorage.setItem('workoutData', JSON.stringify(imported.workoutData));
                localStorage.setItem('weightHistory', JSON.stringify(imported.weightHistory));

                alert("Restored successfully! The page will now reload.");
                location.reload();
            }
        } catch (err) {
            alert("Error reading backup file. Make sure it's a valid .json file.");
        }
    };
    reader.readAsText(file);
}

function dismissQuickStart() {
    document.getElementById('quickStartCard').style.display = 'none';
    localStorage.setItem('quickStartDismissed', 'true');
}

// Add this to your main DOMContentLoaded check
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('quickStartDismissed') === 'true') {
        const card = document.getElementById('quickStartCard');
        if (card) card.style.display = 'none';
    }

    // ... existing initializations
});

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update the icon
    const btn = document.getElementById('themeToggle');
    if (btn) btn.innerText = newTheme === 'dark' ? '☀️' : '🌙';
}

// Apply theme immediately on load
(function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    document.addEventListener("DOMContentLoaded", () => {
        const btn = document.getElementById('themeToggle');
        if (btn) btn.innerText = savedTheme === 'dark' ? '☀️' : '🌙';
    });
})();

function updateDashboardWeight() {
    const weightHistory = JSON.parse(localStorage.getItem('weightHistory')) || [];
    const currentWeightEl = document.getElementById('dashCurrentWeight');

    if (weightHistory.length > 0) {
        const latest = weightHistory[weightHistory.length - 1];
        currentWeightEl.innerText = `${latest.weight}${weightUnit}`;

        if (weightHistory.length > 1) {
            const prev = weightHistory[weightHistory.length - 2];
            const diff = (latest.weight - prev.weight).toFixed(1);
            const diffEl = document.getElementById('weightDiff');
            diffEl.innerText = diff > 0 ? `+${diff}${weightUnit} 📈` : `${diff}${weightUnit} 📉`;
            diffEl.style.color = diff > 0 ? "#e74c3c" : "#27ae60";
        }
    }
}

// Call this inside your DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    updateDashboardWeight();
    updateDashboardTrainingTile();
    displayLastSync();
});

// 1. Initial Variables
let isTrainingDay = JSON.parse(localStorage.getItem('isTrainingDay')) || false;
let goals = JSON.parse(localStorage.getItem('userGoals')) || {
    restCals: 1500,
    trainCals: 1800,
    protein: 200,
    fat: 45,
    carbs: 145
};

// 2. Training Mode Toggle
function toggleTrainingMode() {
    const checkbox = document.getElementById('trainingMode');
    const statusText = document.getElementById('trainingStatusText');

    isTrainingDay = checkbox.checked;
    localStorage.setItem('isTrainingDay', isTrainingDay);

    // Update Text and UI
    const currentGoal = isTrainingDay ? goals.trainCals : goals.restCals;
    statusText.innerText = isTrainingDay ?
        `Training Day (${goals.trainCals} kcal)` :
        `Rest Day (${goals.restCals} kcal)`;

    updateCalorieDisplay(); // Recalculate remaining calories
}

// 3. Edit Goals Logic
function toggleEditMode() {
    const boxes = document.querySelectorAll('.edit-box');
    boxes.forEach(box => box.classList.toggle('hidden'));
}

function updateCalorieGoals() {
    const restInput = document.getElementById('goalRestCals').value;
    const trainInput = document.getElementById('goalTrainCals').value;

    if (restInput) goals.restCals = parseInt(restInput);
    if (trainInput) goals.trainCals = parseInt(trainInput);

    saveAndUpdate();
}

function updateGoal(type) {
    const val = document.getElementById(`goal${type}`).value;
    if (val) {
        goals[type.toLowerCase()] = parseInt(val);
        saveAndUpdate();
    }
}

function saveAndUpdate() {
    localStorage.setItem('userGoals', JSON.stringify(goals));
    toggleEditMode(); // Hide inputs
    refreshGoalUI(); // Update numbers on screen
    updateCalorieDisplay(); // Refresh the progress bars
}

// 4. UI Refresh (Run on page load)
function refreshGoalUI() {
    document.getElementById('displayGoalP').innerText = goals.protein;
    document.getElementById('displayGoalF').innerText = goals.fat;
    document.getElementById('displayGoalC').innerText = goals.carbs;

    // Sync the Training Toggle
    const checkbox = document.getElementById('trainingMode');
    if (checkbox) {
        checkbox.checked = isTrainingDay;
        toggleTrainingMode(); // Trigger text update
    }
}

document.addEventListener('DOMContentLoaded', refreshGoalUI);
/**
 * FITNESS PRO - MASTER SCRIPT
 * Handles: Goals, Food Logging, Gym DB, 1RM, Volume, Calendar, Muscle Map, and Backups.
 */

// --- 1. GLOBAL STATE & DATA ---
const weightUnit = localStorage.getItem('weightUnit') || 'kg';
let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};
let foodData = JSON.parse(localStorage.getItem('foodData')) || {};
let weightHistory = JSON.parse(localStorage.getItem('weightHistory')) || [];
let isTrainingDay = JSON.parse(localStorage.getItem('isTrainingDay')) || false;

let goals = JSON.parse(localStorage.getItem('userGoals')) || {
    restCals: 1500,
    trainCals: 1800,
    protein: 200,
    fat: 45,
    carbs: 145
};

const gymDB = [
    { name: "Barbell Bench Press", equipment: "Barbell", muscle: "Chest" },
    { name: "Incline DB Press", equipment: "Dumbbells", muscle: "Chest" },
    { name: "Barbell Squat", equipment: "Barbell", muscle: "Legs" },
    { name: "Leg Press", equipment: "Machine", muscle: "Legs" },
    { name: "Deadlift", equipment: "Barbell", muscle: "Back" },
    { name: "Lat Pulldown", equipment: "Cable", muscle: "Back" },
    { name: "Overhead Press", equipment: "Barbell", muscle: "Shoulders" },
    { name: "Bicep Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Tricep Pushdown", equipment: "Cable", muscle: "Arms" }
];

// --- 2. INITIALIZATION ENGINE ---
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    refreshGoalUI();
    updateCalorieDisplay();

    // Page-Specific Initialization
    if (document.getElementById('weightChart')) initWeightChart();
    if (document.getElementById('workoutCalendar')) renderCalendar();
    if (document.getElementById('muscleMapContainer')) updateMuscleMap();
    if (document.getElementById('dashWorkoutVol')) updateDashboardStats();

    // Global UI Updates
    displayLastSync();
    checkQuickStart();
});

// --- 3. DASHBOARD & GOALS LOGIC ---
function toggleTrainingMode() {
    const checkbox = document.getElementById('trainingMode');
    const statusText = document.getElementById('trainingStatusText');

    isTrainingDay = checkbox ? checkbox.checked : isTrainingDay;
    localStorage.setItem('isTrainingDay', isTrainingDay);

    if (statusText) {
        statusText.innerText = isTrainingDay ?
            `Training Day (${goals.trainCals} kcal)` :
            `Rest Day (${goals.restCals} kcal)`;
    }
    updateCalorieDisplay();
}

function updateCalorieDisplay() {
    const dailyGoal = isTrainingDay ? goals.trainCals : goals.restCals;
    const dateKey = new Date().toISOString().split('T')[0];
    const todayFood = foodData[dateKey] || [];

    const consumed = todayFood.reduce((sum, item) => sum + parseInt(item.calories || 0), 0);
    const remaining = dailyGoal - consumed;

    const remainingEl = document.getElementById('remainingCalories');
    if (remainingEl) {
        remainingEl.innerText = remaining;
        remainingEl.style.color = remaining < 0 ? "#e74c3c" : "var(--primary)";
    }
    updateProgressBars(consumed, dailyGoal);
}

function updateProgressBars(consumed, dailyGoal) {
    // Logic for Protein/Fat/Carb bars
    const dateKey = new Date().toISOString().split('T')[0];
    const todayFood = foodData[dateKey] || [];

    const macros = todayFood.reduce((acc, item) => {
        acc.p += parseInt(item.protein || 0);
        acc.f += parseInt(item.fat || 0);
        acc.c += parseInt(item.carbs || 0);
        return acc;
    }, {p:0, f:0, c:0});

    if(document.getElementById('protein-bar')) {
        document.getElementById('protein-bar').style.width = Math.min((macros.p / goals.protein) * 100, 100) + "%";
        document.getElementById('fat-bar').style.width = Math.min((macros.f / goals.fat) * 100, 100) + "%";
        document.getElementById('carb-bar').style.width = Math.min((macros.c / goals.carbs) * 100, 100) + "%";
    }
}

function toggleEditMode() {
    document.querySelectorAll('.edit-box').forEach(box => box.classList.toggle('hidden'));
}

function updateCalorieGoals() {
    const rest = document.getElementById('goalRestCals').value;
    const train = document.getElementById('goalTrainCals').value;
    if (rest) goals.restCals = parseInt(rest);
    if (train) goals.trainCals = parseInt(train);
    saveAndRefresh();
}

function updateGoal(type) {
    const val = document.getElementById(`goal${type}`).value;
    if (val) {
        goals[type.toLowerCase()] = parseInt(val);
        saveAndRefresh();
    }
}

function saveAndRefresh() {
    localStorage.setItem('userGoals', JSON.stringify(goals));
    toggleEditMode();
    refreshGoalUI();
    updateCalorieDisplay();
}

function refreshGoalUI() {
    const ids = { p: 'displayGoalP', f: 'displayGoalF', c: 'displayGoalC' };
    if (document.getElementById(ids.p)) {
        document.getElementById(ids.p).innerText = goals.protein;
        document.getElementById(ids.f).innerText = goals.fat;
        document.getElementById(ids.c).innerText = goals.carbs;
    }
    const cb = document.getElementById('trainingMode');
    if (cb) {
        cb.checked = isTrainingDay;
        toggleTrainingMode();
    }
}

// --- 4. TRAINING & 1RM LOGIC ---
function searchExercises(event) {
    const query = event.target.value.toLowerCase();
    const resultsBox = document.getElementById('exerciseResults');
    if (!resultsBox) return;
    if (query.length < 2) { resultsBox.classList.add('hidden'); return; }

    const filtered = gymDB.filter(ex => ex.name.toLowerCase().includes(query));
    resultsBox.innerHTML = filtered.map(ex => `
        <div class="search-item" onclick="selectExercise('${ex.name.replace(/'/g, "\\'")}')">
            <strong>${ex.name}</strong> <small>(${ex.equipment})</small>
        </div>
    `).join('');
    resultsBox.classList.remove('hidden');
}

function selectExercise(name) {
    document.getElementById('exerciseSearch').value = name;
    document.getElementById('exerciseResults').classList.add('hidden');
    // Check for PB
    const allSessions = Object.values(workoutData).flat();
    const pb = allSessions.filter(ex => ex.name === name).reduce((max, ex) => Math.max(max, ex.weight), 0);
    const pbEl = document.getElementById('personalBestDisplay');
    if (pbEl) pbEl.innerText = pb > 0 ? `PB: ${pb}${weightUnit}` : "No PB yet";
}

function calculate1RM(weight, reps) {
<<<<<<< HEAD
    if (reps == 1) return weight;
    return Math.round((weight / (1.0278 - (0.0278 * reps))) * 2) / 2;
}

function updateDashboardStats() {
    const dateKey = new Date().toISOString().split('T')[0];
    const todayWorkout = workoutData[dateKey] || [];
    const volEl = document.getElementById('dashWorkoutVol');
    const countEl = document.getElementById('dashExerciseCount');

    if (todayWorkout.length > 0) {
        const vol = todayWorkout.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0);
        if (volEl) volEl.innerText = vol.toLocaleString();
        if (countEl) countEl.innerText = `${todayWorkout.length} exercises logged`;
    }

    // Update Weight Tile
    if (weightHistory.length > 0) {
        const latest = weightHistory[weightHistory.length - 1];
        if (document.getElementById('dashCurrentWeight')) {
            document.getElementById('dashCurrentWeight').innerText = `${latest.weight}${weightUnit}`;
        }
    }
}

=======
    if (reps === 1) return weight;
    return Math.round((weight / (1.0278 - (0.0278 * reps))) * 2) / 2;
}

function addExercise() {
    const name = document.getElementById('exerciseSearch').value;
    const sets = parseInt(document.getElementById('inputSets').value);
    const reps = parseInt(document.getElementById('inputReps').value);
    const weight = parseFloat(document.getElementById('inputWeight').value);

    // 1. Validation
    if (!name || isNaN(sets) || isNaN(reps) || isNaN(weight)) {
        alert("Please fill in all fields (Exercise, Sets, Reps, and Weight).");
        return;
    }

    const dateKey = new Date().toISOString().split('T')[0];

    // 2. Initialize date if it doesn't exist
    if (!workoutData[dateKey]) {
        workoutData[dateKey] = [];
    }

    // 3. Create the entry
    const newEntry = {
        name: name,
        sets: sets,
        reps: reps,
        weight: weight,
        oneRM: calculate1RM(weight, reps),
        timestamp: new Date().getTime()
    };

    // 4. Save to global object and LocalStorage
    workoutData[dateKey].push(newEntry);
    localStorage.setItem('workoutData', JSON.stringify(workoutData));

    // 5. Clear inputs for the next set
    document.getElementById('inputSets').value = '';
    document.getElementById('inputReps').value = '';
    document.getElementById('inputWeight').value = '';

    // 6. Refresh UI across all tabs
    updateDashboardStats();   // Updates Volume on Home tab
    renderTrainingLog();      // Updates the list on Training tab
    updateMuscleMap();        // Updates the chart on Habits tab

    alert(`Added: ${name}`);
}

function renderTrainingLog() {
    const list = document.getElementById('trainingLogList');
    if (!list) return;

    const dateKey = new Date().toISOString().split('T')[0];
    const today = workoutData[dateKey] || [];

    if (today.length === 0) {
        list.innerHTML = `<p class="hint">No exercises logged for today yet.</p>`;
        return;
    }

    list.innerHTML = today.map((ex, index) => `
        <div class="log-item" style="display:flex; justify-content:space-between; padding: 10px; border-bottom: 1px solid #eee;">
            <div>
                <strong>${ex.name}</strong><br>
                <small>${ex.sets} x ${ex.reps} @ ${ex.weight}${weightUnit} (Est. 1RM: ${ex.oneRM})</small>
            </div>
            <button onclick="deleteExercise(${index})" style="color:red; background:none; border:none;">✕</button>
        </div>
    `).join('');
}

function updateDashboardStats() {
    const dateKey = new Date().toISOString().split('T')[0];
    const todayWorkout = workoutData[dateKey] || [];
    const volEl = document.getElementById('dashWorkoutVol');
    const countEl = document.getElementById('dashExerciseCount');

    if (todayWorkout.length > 0) {
        const vol = todayWorkout.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0);
        if (volEl) volEl.innerText = vol.toLocaleString();
        if (countEl) countEl.innerText = `${todayWorkout.length} exercises logged`;
    }

    // Update Weight Tile
    if (weightHistory.length > 0) {
        const latest = weightHistory[weightHistory.length - 1];
        if (document.getElementById('dashCurrentWeight')) {
            document.getElementById('dashCurrentWeight').innerText = `${latest.weight}${weightUnit}`;
        }
    }
}

>>>>>>> cc830f3d90171384b7bba891c7df895e7e97bd6a
// --- 5. ANALYTICS & UTILITIES ---
function renderCalendar() {
    const calendar = document.getElementById('workoutCalendar');
    if (!calendar) return;
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let html = '';
    for (let i = 1; i <= days; i++) {
        const dateKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        const active = workoutData[dateKey] && workoutData[dateKey].length > 0;
        html += `<div class="cal-day ${active ? 'trained' : ''}">${i}</div>`;
    }
    calendar.innerHTML = html;
}

function updateMuscleMap() {
    const container = document.getElementById('muscleMapContainer');
    if (!container) return;
    const totals = {};
    let grandVol = 0;

    Object.values(workoutData).flat().forEach(ex => {
        const muscle = gymDB.find(db => db.name === ex.name)?.muscle || "Other";
        const vol = ex.sets * ex.reps * ex.weight;
        totals[muscle] = (totals[muscle] || 0) + vol;
        grandVol += vol;
    });

    container.innerHTML = Object.entries(totals).map(([m, v]) => `
        <div style="margin-bottom:10px;">
            <small>${m}</small>
            <div class="progress-bg"><div class="progress-fill" style="width:${(v/grandVol)*100}%"></div></div>
        </div>
    `).join('');
}

// --- 6. THEME, BACKUP, & UI ---
function toggleDarkMode() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}

function exportData() {
    const backup = { foodData, workoutData, weightHistory, goals, timestamp: new Date().toLocaleString() };
    localStorage.setItem('lastSyncDate', backup.timestamp);
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fitness_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    displayLastSync();
}

function displayLastSync() {
    const el = document.getElementById('lastSyncTime');
    const saved = localStorage.getItem('lastSyncDate');
    if (el && saved) el.innerText = `Last: ${saved}`;
}

function checkQuickStart() {
    if (localStorage.getItem('quickStartDismissed') === 'true') {
        const qs = document.getElementById('quickStartCard');
        if (qs) qs.style.display = 'none';
    }
}

function dismissQuickStart() {
    const qs = document.getElementById('quickStartCard');
    if (qs) qs.style.display = 'none';
    localStorage.setItem('quickStartDismissed', 'true');
}

function importMFPData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        const headers = lines[0].split(',');

        // Find column indexes (MFP headers usually include 'Date', 'Calories', etc.)
        const dateIdx = headers.findIndex(h => h.includes('Date'));
        const calIdx = headers.findIndex(h => h.includes('Calories'));
        const proIdx = headers.findIndex(h => h.includes('Protein'));
        const fatIdx = headers.findIndex(h => h.includes('Fat'));
        const carbIdx = headers.findIndex(h => h.includes('Carbs'));

        let importCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length < headers.length) continue;

            const date = row[dateIdx]; // Format: YYYY-MM-DD
            const entry = {
                name: "MFP Import",
                calories: parseInt(row[calIdx]) || 0,
                protein: parseInt(row[proIdx]) || 0,
                fat: parseInt(row[fatIdx]) || 0,
                carbs: parseInt(row[carbIdx]) || 0
            };

            // Initialize date array if empty and push
            if (!foodData[date]) foodData[date] = [];
            foodData[date].push(entry);
            importCount++;
            // ... inside importMFPData reader.onload ...
            localStorage.setItem('foodData', JSON.stringify(foodData));
// Automatically clean up after import
            cleanDuplicateFoodEntries();
        }

        localStorage.setItem('foodData', JSON.stringify(foodData));
        alert(`Success! Imported ${importCount} meals from MyFitnessPal.`);
        location.reload();
    };
    reader.readAsText(file);
}

function cleanDuplicateFoodEntries() {
    let removedCount = 0;

    // Loop through every date in your food database
    for (let date in foodData) {
        const uniqueEntries = [];
        const originalCount = foodData[date].length;

        foodData[date].forEach(entry => {
            // Check if an identical entry already exists in our unique list
            const isDuplicate = uniqueEntries.some(u =>
                u.name === entry.name &&
                u.calories === entry.calories &&
                u.protein === entry.protein &&
                u.fat === entry.fat &&
                u.carbs === entry.carbs
            );

            if (!isDuplicate) {
                uniqueEntries.push(entry);
            }
        });

        removedCount += (originalCount - uniqueEntries.length);
        foodData[date] = uniqueEntries;
    }

    if (removedCount > 0) {
        localStorage.setItem('foodData', JSON.stringify(foodData));
        alert(`Cleanup complete! Removed ${removedCount} duplicate entries.`);
        location.reload();
    } else {
        alert("Your database is already clean! No duplicates found.");
    }
}

<<<<<<< HEAD
function switchTab(tabId) {
    // 1. Hide all sections
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.add('hidden'));

    // 2. Show the selected section
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    // 3. Update Nav UI
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        // If the onclick contains our tabId, make it active
=======
// --- 1. CONFIGURATION ---
const tabs = ['home', 'log', 'habits', 'training'];
let touchstartX = 0;
let touchendX = 0;

// --- 2. THE MASTER SWITCH FUNCTION ---
function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    // Show active section
    const activeSection = document.getElementById(tabId);
    if (activeSection) activeSection.classList.remove('hidden');

    // Update Navigation UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
>>>>>>> cc830f3d90171384b7bba891c7df895e7e97bd6a
        if (item.getAttribute('onclick').includes(tabId)) {
            item.classList.add('active');
        }
    });

<<<<<<< HEAD
    // 4. Trigger Page-Specific Refreshes
    // This ensures data is up-to-date when you switch to that tab
    if (tabId === 'home') updateDashboardStats();
    if (tabId === 'log') renderFoodLog();
    if (tabId === 'habits')
    if (tabId === 'training') {
        renderCalendar();
        updateMuscleMap();
    }

    // Save current tab to remember where user was on refresh
    localStorage.setItem('currentTab', tabId);
}

// Add this to your DOMContentLoaded to load the last tab used
=======
    // Page-Specific Refreshes (Triggering the logic we built)
    switch(tabId) {
        case 'home':
            if (typeof updateDashboardStats === "function") updateDashboardStats();
            break;
        case 'log':
            initFoodPage(); // Loads 7-day strip, frequent foods, and logs
            break;
        case 'habits':
            renderCalendar();
            initWeightChart();
            if (typeof updateMuscleMap === "function") updateMuscleMap();
            break;
        case 'training':
            if (typeof renderTrainingLog === "function") renderTrainingLog();
            break;
    }

    localStorage.setItem('currentTab', tabId);
}

// --- 3. SWIPE GESTURE LOGIC ---
// Targeting the main container (Ensure your HTML has id="app-body" or use document)
document.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
}, {passive: true});

document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleGesture();
}, {passive: true});

function handleGesture() {
    const currentTab = localStorage.getItem('currentTab') || 'home';
    const currentIndex = tabs.indexOf(currentTab);
    const threshold = 100;

    // Swipe Left (Move to the Right)
    if (touchendX < touchstartX - threshold && currentIndex < tabs.length - 1) {
        switchTab(tabs[currentIndex + 1]);
    }
    // Swipe Right (Move to the Left)
    if (touchendX > touchstartX + threshold && currentIndex > 0) {
        switchTab(tabs[currentIndex - 1]);
    }
}

// --- 4. INITIALIZATION ---
>>>>>>> cc830f3d90171384b7bba891c7df895e7e97bd6a
document.addEventListener('DOMContentLoaded', () => {
    const lastTab = localStorage.getItem('currentTab') || 'home';
    switchTab(lastTab);
});

<<<<<<< HEAD
// --- SWIPE GESTURE LOGIC ---
let touchstartX = 0;
let touchendX = 0;

const gestureZone = document.getElementById('app-body');
const tabs = ['home', 'log', 'habits', 'training'];

gestureZone.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
});

gestureZone.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleGesture();
});

function handleGesture() {
    const currentTab = localStorage.getItem('currentTab') || 'home';
    const currentIndex = tabs.indexOf(currentTab);

    // Swipe Threshold (minimum distance in pixels)
    const threshold = 100;

    // Swipe Left (Go to next tab)
    if (touchendX < touchstartX - threshold) {
        if (currentIndex < tabs.length - 1) {
            switchTab(tabs[currentIndex + 1]);
        }
    }

    // Swipe Right (Go to previous tab)
    if (touchendX > touchstartX + threshold) {
        if (currentIndex > 0) {
            switchTab(tabs[currentIndex - 1]);
        }
    }
}

function addFoodManually() {
    // ... (logic to get input values) ...

    // Update Global Data
    foodData[dateKey].push(newEntry);
    localStorage.setItem('foodData', JSON.stringify(foodData));

    // REFRESH UI - The key to making it "work"
    updateCalorieDisplay(); // Updates the bars on the 'home' tab
    renderFoodLog();        // Updates the list on the 'log' tab

    // Optional: Auto-switch back to home to see the progress
    // switchTab('home');
=======
function addFoodManually() {
    // 1. Capture all inputs
    const nameEl = document.getElementById('manualName');
    const calEl = document.getElementById('manualCals');
    const proEl = document.getElementById('manualPro');
    const fatEl = document.getElementById('manualFat');
    const carbEl = document.getElementById('manualCarb');

    const name = nameEl.value;
    const cals = parseInt(calEl.value) || 0;
    const p = parseInt(proEl.value) || 0;
    const f = parseInt(fatEl.value) || 0;
    const c = parseInt(carbEl.value) || 0;

    // 2. Validation
    if (!name || cals <= 0) {
        alert("Please enter a food name and calorie amount.");
        return;
    }

    // 3. Update the Database (Using the global activeLogDate)
    if (!foodData[activeLogDate]) foodData[activeLogDate] = [];

    foodData[activeLogDate].push({
        name,
        calories: cals,
        protein: p,
        fat: f,
        carbs: c,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 4. Save to LocalStorage
    localStorage.setItem('foodData', JSON.stringify(foodData));

    // 5. Clear inputs for the next entry
    [nameEl, calEl, proEl, fatEl, carbEl].forEach(el => el.value = '');

    // 6. Refresh ALL UI elements across the app
    renderFoodLog();        // Refresh list on current page
    renderMacroTargets();   // Refresh protein/carb/fat bars
    renderFrequentFoods();  // Update the quick-add buttons
    updateCalorieDisplay(); // Update the home screen dashboard

    console.log("Food added successfully to:", activeLogDate);
>>>>>>> cc830f3d90171384b7bba891c7df895e7e97bd6a
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.log('Service Worker Registration Failed', err));
    });
}

window.addEventListener('online', () => {
    document.getElementById('offlineStatus').style.display = 'none';
});

window.addEventListener('offline', () => {
    document.getElementById('offlineStatus').style.display = 'inline';
});
// --- WATER TRACKER LOGIC ---
let waterData = JSON.parse(localStorage.getItem('waterData')) || {};
const WATER_GOAL = 2000; // You can also add this to your 'goals' object

function changeWater(amount) {
    const dateKey = new Date().toISOString().split('T')[0];
    let current = waterData[dateKey] || 0;

    waterData[dateKey] = Math.max(0, current + amount);
    saveWater();
}

function setWater(amount) {
    changeWater(amount);
}

function saveWater() {
    localStorage.setItem('waterData', JSON.stringify(waterData));
    updateWaterUI();
}

function updateWaterUI() {
    const dateKey = new Date().toISOString().split('T')[0];
    const current = waterData[dateKey] || 0;
    const percentage = Math.min((current / WATER_GOAL) * 100, 100);

    // Update Dashboard
    if (document.getElementById('dashWater')) {
        document.getElementById('dashWater').innerText = current;
        document.getElementById('water-bar-dash').style.width = percentage + "%";
    }

    // Update Log Tab
    if (document.getElementById('logWaterVal')) {
        document.getElementById('logWaterVal').innerText = current;
    }
}

// Add 'updateWaterUI()' to your DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", () => {
    // ... existing init functions
    updateWaterUI();
<<<<<<< HEAD
});
=======
});


// Add this to your Initialization to keep the slider in sync on page load
function syncSliderWithDatabase() {
    const today = new Date().toISOString().split('T')[0];
    const hasWorkout = workoutData[today] && workoutData[today].length > 0;
    const slider = document.getElementById('trainingMode');

    if (slider) {
        slider.checked = hasWorkout;
        // Trigger the text update without re-saving to DB
        const statusText = document.getElementById('trainingStatusText');
        if (statusText) {
            statusText.innerText = hasWorkout ?
                `Training Day (${goals.trainCals} kcal)` :
                `Rest Day (${goals.restCals} kcal)`;
        }
    }
}

function updateMonthlySummary() {
    const summaryEl = document.getElementById('monthlySummary');
    if (!summaryEl) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let workoutCount = 0;
    let totalVol = 0;

    // Filter workoutData for the current month
    Object.keys(workoutData).forEach(date => {
        const d = new Date(date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            workoutCount++;
            workoutData[date].forEach(set => totalVol += (set.sets * set.reps * set.weight));
        }
    });

    summaryEl.innerHTML = `
        <div class="summary-grid" style="display: flex; justify-content: space-around;">
            <div><small>Sessions</small><br><strong>${workoutCount}</strong></div>
            <div><small>Month Volume</small><br><strong>${totalVol.toLocaleString()}</strong></div>
        </div>
    `;
}

let timerInterval;
let timeLeft = 90; // Default 90 seconds

function handleHomeToggle(checkbox) {
    // 1. Update Calorie Goals
    isTrainingDay = checkbox.checked;
    localStorage.setItem('isTrainingDay', isTrainingDay);

    const statusText = document.getElementById('trainingStatusText');
    if (statusText) {
        statusText.innerText = isTrainingDay ?
            `Training Day (${goals.trainCals} kcal)` :
            `Rest Day (${goals.restCals} kcal)`;
    }

    // 2. Toggle Timer Visibility
    const timerUI = document.getElementById('restTimerContainer');
    if (timerUI) timerUI.classList.toggle('hidden', !isTrainingDay);

    // 3. Sync with Calendar/Workout Database
    const today = new Date().toISOString().split('T')[0];

    if (isTrainingDay) {
        if (!workoutData[today] || workoutData[today].length === 0) {
            workoutData[today] = [{
                name: "Trained (Quick Log)",
                sets: 0, reps: 0, weight: 0,
                isQuickLog: true
            }];
        }
    } else {
        // Only delete if it's a placeholder (Quick Log)
        if (workoutData[today] && workoutData[today][0]?.isQuickLog) {
            delete workoutData[today];
            if (typeof resetTimer === "function") resetTimer();
        }
    }

    // 4. Global Refresh
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
    updateCalorieDisplay();
    renderCalendar();
    updateMonthlySummary();
}
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Rest over! Get to work.");
            resetTimer();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 90;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timerDisplay').innerText =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// --- GLOBAL FOOD STATE ---
let activeLogDate = new Date().toISOString().split('T')[0];

function initFoodPage() {
    renderDateStrip();
    renderFoodLog();
    renderFrequentFoods();
}

function renderDateStrip() {
    const strip = document.getElementById('dateStrip');
    if (!strip) return;

    const days = [];
    const today = new Date();

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(d);
    }

    strip.innerHTML = days.map(date => {
        const dKey = date.toISOString().split('T')[0];
        const isSelected = dKey === activeLogDate;
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateNum = date.getDate();

        return `
            <div onclick="selectLogDate('${dKey}')" 
                 style="text-align:center; padding: 10px; cursor:pointer; border-radius:8px; 
                 background: ${isSelected ? 'var(--primary)' : 'transparent'}; 
                 color: ${isSelected ? 'white' : 'inherit'}; flex: 1;">
                <div style="font-size: 0.7rem;">${dayLabel}</div>
                <div style="font-weight: bold;">${dateNum}</div>
            </div>
        `;
    }).join('');
}

function selectLogDate(date) {
    activeLogDate = date;
    const display = document.getElementById('selectedDateDisplay');
    const today = new Date().toISOString().split('T')[0];

    if (display) {
        display.innerText = (date === today) ? "Today" : date;
    }

    renderDateStrip();
    renderFoodLog();
    updateCalorieDisplay(); // Sync Home Screen bars
}

function renderFoodLog() {
    const list = document.getElementById('todayFoodList');
    if (!list) return;

    const meals = foodData[activeLogDate] || [];
    if (meals.length === 0) {
        list.innerHTML = `<p class="hint">No entries for this date.</p>`;
        return;
    }

    list.innerHTML = meals.map((m, index) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:10px;">
            <div>
                <strong>${m.name}</strong><br>
                <small>${m.calories} kcal | P: ${m.protein}g F: ${m.fat}g C: ${m.carbs}g</small>
            </div>
            <button onclick="deleteMeal(${index})" style="background:none; border:none; color:red; font-weight:bold;">✕</button>
        </div>
    `).join('');
}

function deleteMeal(index) {
    foodData[activeLogDate].splice(index, 1);
    localStorage.setItem('foodData', JSON.stringify(foodData));
    renderFoodLog();
    updateCalorieDisplay();
}

function saveWeight() {
    const weight = parseFloat(document.getElementById('weightInput').value);
    const date = new Date().toISOString().split('T')[0];

    if (weight) {
        let weightData = JSON.parse(localStorage.getItem('weightData')) || {};
        weightData[date] = weight;
        localStorage.setItem('weightData', JSON.stringify(weightData));

        initWeightChart(); // Refresh chart immediately
        alert("Weight saved!");
    }
}

function renderMacroTargets() {
    const container = document.getElementById('macroTargetDisplay');
    if (!container) return;

    const meals = foodData[activeLogDate] || [];

    // Calculate totals for the selected date
    const totals = meals.reduce((acc, m) => {
        acc.p += (parseInt(m.protein) || 0);
        acc.f += (parseInt(m.fat) || 0);
        acc.c += (parseInt(m.carbs) || 0);
        return acc;
    }, { p: 0, f: 0, c: 0 });

    const labels = [
        { key: 'P', current: totals.p, goal: goals.protein, color: '#4CAF50' },
        { key: 'F', current: totals.f, goal: goals.fat, color: '#FFC107' },
        { key: 'C', current: totals.c, goal: goals.carbs, color: '#2196F3' }
    ];

    container.innerHTML = labels.map(l => {
        const pct = Math.min((l.current / l.goal) * 100, 100);
        return `
            <div>
                <small style="font-weight:bold;">${l.key}</small>
                <div style="font-size: 0.9rem;">${l.current}g / ${l.goal}g</div>
                <div class="progress-bg" style="height:4px; margin-top:5px; background:#eee;">
                    <div class="progress-fill" style="width:${pct}%; background:${l.color};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderFrequentFoods() {
    const frequentList = document.getElementById('frequentFoodsList');
    if (!frequentList) return;

    const counts = {};
    // 1. Count occurrences across all dates
    Object.values(foodData).flat().forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + 1;
    });

    // 2. Sort and get top 5 unique items
    const sorted = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 5);

    if (sorted.length === 0) {
        frequentList.innerHTML = '<p class="hint">Log more meals to see frequent items!</p>';
        return;
    }

    frequentList.innerHTML = sorted.map(name => {
        // Find the most recent entry for this name to get the macro data
        const itemData = Object.values(foodData).flat().find(i => i.name === name);
        return `
            <button class="tag-btn" onclick='quickAddFood(${JSON.stringify(itemData).replace(/'/g, "&apos;")})'>
                + ${name}
            </button>
        `;
    }).join('');
}

function quickAddFood(item) {
    if (!foodData[activeLogDate]) foodData[activeLogDate] = [];

    // Add the frequent item to the current active date
    foodData[activeLogDate].push({
        ...item,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    localStorage.setItem('foodData', JSON.stringify(foodData));

    // Refresh UI
    renderFoodLog();
    renderMacroTargets();
    updateCalorieDisplay();
    alert(`Added ${item.name}!`);
}

let weightChart; // Global variable to store the chart instance

function initWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx) return;

    // 1. Get and Sort Data
    // Assuming weightData is stored as { "2024-01-20": 85.5, "2024-01-21": 85.2 }
    const weightEntries = JSON.parse(localStorage.getItem('weightData')) || {};
    const sortedDates = Object.keys(weightEntries).sort();
    const weights = sortedDates.map(date => weightEntries[date]);

    // 2. Destroy existing chart to prevent memory leaks/overlap
    if (weightChart) {
        weightChart.destroy();
    }

    // 3. Create the Chart
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Body Weight (kg)',
                data: weights,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4, // Makes the line curvy
                pointRadius: 4,
                pointBackgroundColor: '#4CAF50'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(200, 200, 200, 0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}
>>>>>>> cc830f3d90171384b7bba891c7df895e7e97bd6a

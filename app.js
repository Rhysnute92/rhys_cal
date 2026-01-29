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


/* ================================
   DATE HELPERS
================================ */

export const getToday = () => new Date().toISOString().split('T')[0];
window.getToday = getToday;

/* ================================
   STORAGE HELPERS
================================ */

export const save = (key, data) =>
    localStorage.setItem(key, JSON.stringify(data));

export const load = (key, fallback = null) =>
    JSON.parse(localStorage.getItem(key)) ?? fallback;

/* ================================
   GLOBAL STATE
================================ */

export const weightUnit = localStorage.getItem('weightUnit') || 'kg';

export let workoutData = load('workoutData', {});
export let foodData = load('foodData', {});
export let waterData = load('waterData', {});
export let weightHistory = load('weightHistory', []);

export const WATER_GOAL = 2000;

export const GOALS = {
    REST: { kcal: 1500, protein: 200, carbs: 145, fat: 45 },
    TRAINING: { kcal: 1800, protein: 200, carbs: 220, fat: 45 }
};

export const goals = {
    targetWeight: 75
};

/* ================================
   TRAINING DAY MANAGEMENT
================================ */

export function isTrainingDay(date = getToday()) {
    return localStorage.getItem(`isTraining_${date}`) === 'true';
}

export function toggleTrainingDay(date = getToday()) {
    const key = `isTraining_${date}`;
    const newState = !isTrainingDay(date);
    localStorage.setItem(key, newState);

    updateDailyGoalUI(date);
    syncWorkoutDiaryEntry(date, newState);

    return newState;
}

function syncWorkoutDiaryEntry(date, isTraining) {
    const logKey = `logs_${date}`;
    let logs = load(logKey, []);

    if (isTraining) {
        if (!logs.some(e => e.name === "Workout 💪")) {
            logs.push({
                name: "Workout 💪",
                calories: 0,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    } else {
        logs = logs.filter(e => e.name !== "Workout 💪");
    }

    save(logKey, logs);
}

/* ================================
   DAILY GOAL UI
================================ */

export function getCalorieGoal(date = getToday()) {
    return isTrainingDay(date) ? GOALS.TRAINING.kcal : GOALS.REST.kcal;
}

window.updateDailyGoalUI = function(date = getToday()) {
    const goal = getCalorieGoal(date);
    const training = isTrainingDay(date);

    const goalText = document.getElementById('calorieGoal');
    const statusText = document.getElementById('dayStatus');
    const btn = document.getElementById('trainingBtn');

    if (goalText) goalText.innerText = `${goal} kcal`;

    if (statusText) {
        statusText.innerText = training ? "Training Day" : "Rest Day";
        statusText.classList.toggle('training-active', training);
    }

    if (btn) {
        btn.innerText = training ? "Logged as Workout ✅" : "Mark Training 💪";
        btn.style.background = training ? "#28a745" : "var(--primary)";
    }

    localStorage.setItem(`goal_${date}`, goal);
};

/* ================================
   COPY TODAY DATA
================================ */

window.copyTodayToDate = function () {
    const today = getToday();
    const target = window.currentViewDate;

    if (today === target) return alert("Already viewing today.");

    const todayData = localStorage.getItem(`logs_${today}`);

    if (todayData) {
        localStorage.setItem(`logs_${target}`, todayData);
        if (typeof loadDiaryEntries === "function") loadDiaryEntries();
        alert("Logs copied successfully!");
    } else {
        alert("Nothing to copy.");
    }
};

/* ================================
   NUTRITION TOTALS
================================ */

window.getTotalsForDate = function(dateString) {
    const history = load('foodHistory', {});
    const entries = history[dateString] || [];

    return entries.reduce((acc, item) => {
        acc.p += +item.protein || 0;
        acc.c += +item.carbs || 0;
        acc.f += +item.fats || 0;
        acc.kcal += +item.calories || 0;
        return acc;
    }, { p: 0, c: 0, f: 0, kcal: 0 });
};

/* ================================
   STRENGTH FORMULA
================================ */

export function calculate1RM(weight, reps) {
    if (reps === 1) return weight;
    if (reps > 10) return null; // less accurate
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
}

window.calculate1RM = calculate1RM;

/* ================================
   DISPLAY HELPERS
================================ */

export function getDisplayWeight(kg) {
    return weightUnit === 'lbs'
        ? (kg * 2.20462).toFixed(1)
        : kg.toFixed(1);
}

/* ================================
   EXERCISE DATABASE
================================ */

window.gymDB = {
    Chest: [
        { name: "Barbell Bench Press", equipment: "Barbell" },
        { name: "Incline DB Press", equipment: "Dumbbells" }
    ],
    Legs: [
        { name: "Barbell Squat", equipment: "Barbell" },
        { name: "Leg Press", equipment: "Machine" }
    ],
    Back: [
        { name: "Deadlift", equipment: "Barbell" },
        { name: "Lat Pulldown", equipment: "Machine" }
    ],
    Shoulders: [
        { name: "Overhead Press", equipment: "Barbell" },
        { name: "Lateral Raise", equipment: "Dumbbells" }
    ],
    Arms: [
        { name: "Bicep Curl", equipment: "Dumbbells" },
        { name: "Tricep Pushdown", equipment: "Cable" }
    ],
    Cardio: [
        { name: "Swimming" },
        { name: "Walking" }
    ],
    Core: [
        { name: "Plank" },
        { name: "Crunches" }
    ]
};

window.getAllExerciseNames = () =>
    Object.values(window.gymDB).flat().map(ex => ex.name);

/* ================================
   THEME TOGGLE
================================ */

window.toggleDarkMode = function() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem(
        'theme-preference',
        document.body.classList.contains('dark-theme') ? 'dark' : 'light'
    );
};

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('theme-preference');
    if (saved === 'dark') document.body.classList.add('dark-theme');
    updateDailyGoalUI();
});

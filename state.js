/* ================================
   DATE HELPERS
================================ */
export const getToday = () => new Date().toISOString().split('T')[0];
export const todayKey = getToday; // Alias for training.js compatibility
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
// Example structure in state.js
export const foodData = {
    "2026-02-15": [
        { name: "Oatmeal", calories: 300, protein: 10, carbs: 50, fats: 5 },
        { name: "Chicken Breast", calories: 450, protein: 60, carbs: 0, fats: 8 }
    ]
};export let waterData = load('waterData', {});
export let weightHistory = load('weightHistory', []);

export const WATER_GOAL = 2000;
export const GOALS = {
    REST: { kcal: 1500, protein: 200, carbs: 145, fat: 45 },
    TRAINING: { kcal: 1800, protein: 200, carbs: 220, fat: 45 }
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
   STRENGTH FORMULA
================================ */
export function calculate1RM(weight, reps) {
    if (!weight || !reps) return 0;
    if (reps === 1) return weight;
    // Brzycki Formula
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
}
window.calculate1RM = calculate1RM;

/* ================================
   EXERCISE DATABASE
================================ */
// Updated to match the format expected by training.js (Array of Strings)
export const gymDB = {
    Chest: { icon: "💪", exercises: ["Barbell Bench Press", "Incline DB Press", "Cable Flyes"] },
    Back: { icon: "🚣", exercises: ["Deadlift", "Lat Pulldown", "Bent Over Rows", "Pull Ups"] },
    Legs: { icon: "🦵", exercises: ["Barbell Squat", "Leg Press", "Leg Curls", "Calf Raises"] },
    Shoulders: { icon: "🏛️", exercises: ["Overhead Press", "Lateral Raise", "Rear Delt Flyes"] },
    Arms: { icon: "💪", exercises: ["Bicep Curl", "Tricep Pushdown", "Hammer Curls"] },
    Core: { icon: "🧘", exercises: ["Plank", "Crunches", "Leg Raises"] },
    Cardio: { icon: "🏃", exercises: ["Swimming", "Walking", "Cycling"] }
};

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


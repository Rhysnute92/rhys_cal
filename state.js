import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

/* =========================================
   1. INITIALIZATION & DATABASE CLIENT
   ========================================= */
const SUPABASE_URL = 'https://xlutwqvtecrlxdafaiifu.supabase.co';
const SUPABASE__ANON_KEY = 'sb_publishable_Kb2eAvRNrDqBGfmuv3ct3Q_2li9wW9p';
const supabase = createClient(SUPABASE_URL, SUPABASE__ANON_KEY);

/* =========================================
   2. GLOBAL STATE & LOCAL STORAGE LOADERS
   ========================================= */
// Helpers for cleaner loading
export const load = (key, fallback = null) => JSON.parse(localStorage.getItem(key)) ?? fallback;
export const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
// You must explicitly export the variable
export const state = {
    goals: {
        calories: 1500,
        protein: 0,
        carbs: 0,
        fat: 0
    },
    // ... other state properties
};
// Core Data Exports
export let foodData = load('foodLogs', {});
export let goals = load('userGoals', { trainCals: 1800, restCals: 1500, protein: 200, carbs: 145, fats: 45 });
export let isTrainingDay = load('isTrainingDay', false);
export let workoutData = load('workoutData', {});
export let weightHistory = load('weightHistory', []);
export let dailySteps = load('dailySteps', 0);
export let waterData = load('waterData', {});
export let customTilesHistory = load('customTilesHistory', {});
export let customTileConfig = load('customTileConfig', [{ name: 'Water', unit: 'ml', step: 250, icon: '💧' }]);

// Constants
export const weightUnit = localStorage.getItem('weightUnit') || 'kg';
export const WATER_GOAL = 2000;
export const GOALS = {
    REST: { kcal: 1500, protein: 200, carbs: 145, fat: 45 },
    TRAINING: { kcal: 1800, protein: 200, carbs: 145, fat: 45 }
};

/* =========================================
   3. DATE HELPERS
   ========================================= */
export const getToday = () => new Date().toISOString().split('T')[0];
export const todayKey = getToday; // Alias for training.js compatibility
window.getToday = getToday;

/* =========================================
   4. CLOUD SYNC & AUTHENTICATION
   ========================================= */
export async function authenticate(email, password, type) {
    let result = type === 'signup' 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) throw result.error;
    await loadUserSession();
    return result.data.user;
}

export async function loadUserSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        let { data } = await supabase.from('fitness_data').select('*').single();
        if (data) {
            Object.assign(foodData, data.food_logs);
            Object.assign(goals, data.goals);
            // Add other assignments here
        }
    }
}

export async function saveState() {
    // 1. Local Save
    save('foodLogs', foodData);
    save('userGoals', goals);
    save('isTrainingDay', isTrainingDay);
    save('weightHistory', weightHistory);
    save('dailySteps', dailySteps);
    save('workoutData', workoutData);
    save('customTilesHistory', customTilesHistory);
    save('customTileConfig', customTileConfig);

    // 2. Cloud Save
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('fitness_data').upsert({
            id: user.id,
            food_logs: foodData,
            is_training_day: isTrainingDay,
            goals: goals,
            steps: dailySteps,
            weight_history: weightHistory,
            updated_at: new Date()
        });
    }
}

/* =========================================
   5. LOGIC & MATH HELPERS
   ========================================= */
export function calculate1RM(weight, reps) {
    if (!weight || !reps) return 0;
    if (reps === 1) return weight;
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
}

export function sanitizeInput(value) {
    const clean = String(value).replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

/* =========================================
   6. TRAINING & UI MANAGEMENT
   ======================================== */
export function toggleTrainingDay(date = getToday()) {
    isTrainingDay = !isTrainingDay;
    saveState();
    if (window.updateDailyGoalUI) window.updateDailyGoalUI(date);
    return isTrainingDay;
}

function toggleTrainingMode() {
    const isTraining = document.getElementById('trainingToggle').checked;
    
    // Use the values from your state/settings instead of hardcoded numbers
    const currentGoal = isTraining ? (goals.restCals + 300) : goals.restCals;
    const foodConsumed = parseInt(document.getElementById('displayFood').innerText) || 0;
    const remaining = Math.max(0, currentGoal - foodConsumed);
    
    document.getElementById('displayGoal').innerText = currentGoal;
    document.getElementById('displayRemaining').innerText = remaining;
    
    // Update the chart
    if (calorieChart) {
        calorieChart.data.datasets[0].data = [foodConsumed, remaining];
        calorieChart.update();
    }
}

function loginUser() {
    // ... your validation logic ...
    
    // 1. Set the flag so the app knows you are allowed in
    localStorage.setItem('isLoggedIn', 'true');

    // 2. Redirect to the dashboard
    window.location.href = "index.html"; 
}

export const gymDB = {
    Chest: { icon: "💪", exercises: ["Barbell Bench Press", "Incline DB Press", "Cable Flyes"] },
    Back: { icon: "🚣", exercises: ["Deadlift", "Lat Pulldown", "Bent Over Rows", "Pull Ups"] },
    Legs: { icon: "🦵", exercises: ["Barbell Squat", "Leg Press", "Leg Curls", "Calf Raises"] },
    Shoulders: { icon: "🏛️", exercises: ["Overhead Press", "Lateral Raise", "Rear Delt Flyes"] },
    Arms: { icon: "💪", exercises: ["Bicep Curl", "Tricep Pushdown", "Hammer Curls"] },
    Core: { icon: "🧘", exercises: ["Plank", "Crunches", "Leg Raises"] },
    Cardio: { icon: "🏃", exercises: ["Swimming", "Walking", "Cycling"] }
};

// Password Recovery
export async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/settings.html',
    });
    if (error) throw error;
    return data;
}

export async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
}
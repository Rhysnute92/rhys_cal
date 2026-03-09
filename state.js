import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

/* =========================================
   1. INITIALIZATION & DATABASE CLIENT
   ========================================= */
const SUPABASE_URL = 'https://xlutwqvtecrlxdafaiifu.supabase.co';
const SUPABASE__ANON_KEY = 'sb_publishable_Kb2eAvRNrDqBGfmuv3ct3Q_2li9wW9p';
export const supabase = createClient(SUPABASE_URL, SUPABASE__ANON_KEY);

/* =========================================
   2. GLOBAL STATE & LOCAL STORAGE LOADERS
   ========================================= */
export const load = (key, fallback = null) => JSON.parse(localStorage.getItem(key)) ?? fallback;
export const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Core Data Exports
export let foodData = load('foodLogs', {});
export let goals = load('userGoals', { trainCals: 1800, restCals: 1500, protein: 200, carbs: 145, fats: 45 });
export let isTrainingDay = load('isTrainingDay', false);
export let workoutData = load('workoutData', {});
export let weightHistory = load('weightHistory', []);
export let dailySteps = load('dailySteps', 0);

/* =========================================
   3. DATE & GOAL HELPERS
   ========================================= */
export const getToday = () => new Date().toISOString().split('T')[0];
export const todayKey = getToday; 

/**
 * Returns the calorie goal based on the current training toggle.
 */
export const getCurrentCalorieGoal = () => {
    return isTrainingDay ? goals.trainCals : goals.restCals;
};

/* =========================================
   4. CLOUD SYNC
   ========================================= */
export async function saveState() {
    // 1. Local Save
    save('foodLogs', foodData);
    save('userGoals', goals);
    save('isTrainingDay', isTrainingDay);
    save('weightHistory', weightHistory);
    save('workoutData', workoutData);
    save('dailySteps', dailySteps);

    // 2. Cloud Save (Supabase)
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
   5. TOGGLE LOGIC
   ======================================== */
export function toggleTrainingDay() {
    isTrainingDay = !isTrainingDay;
    saveState();
    // This allows other pages (like index or log) to react to the change
    if (window.render) window.render(); 
    return isTrainingDay;
}
// --- Global State ---
let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let dailyGoalCals = 1800;

// --- Global Functions ---
function loadData() {
    const dateKey = document.getElementById('date')?.value || new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('day_' + dateKey));
    if (saved) {
        mealFoods = saved.mealFoods;
        dailyGoalCals = saved.dailyGoalCals;
    }
}

function saveData() {
    const dateKey = document.getElementById('date')?.value || new Date().toISOString().split('T')[0];
    localStorage.setItem('day_' + dateKey, JSON.stringify({ mealFoods, dailyGoalCals }));
}
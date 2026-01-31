/* ================================
   GLOBAL STATE & CONFIG
================================ */

export const weightUnit = localStorage.getItem('weightUnit') || 'kg';

export let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};
export let foodData = JSON.parse(localStorage.getItem('foodData')) || {};
export let waterData = JSON.parse(localStorage.getItem('waterData')) || {};
export let isTrainingDay = JSON.parse(localStorage.getItem('isTrainingDay')) || false;

export let goals = JSON.parse(localStorage.getItem('userGoals')) || {
    restCals: 1500,
    trainCals: 1800,
    protein: 200,
    fat: 45,
    carbs: 145
};

export const WATER_GOAL = 2000;

export const gymDB = [
    { name: "Barbell Bench Press", equipment: "Barbell", muscle: "Chest" },
    { name: "Incline DB Press", equipment: "Dumbbells", muscle: "Chest" },
    { name: "Barbell Squat", equipment: "Barbell", muscle: "Legs" },
    { name: "Deadlift", equipment: "Barbell", muscle: "Back" },
    { name: "Overhead Press", equipment: "Barbell", muscle: "Shoulders" },
    { name: "Bicep Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Tricep Pushdown", equipment: "Cable", muscle: "Arms" }
];

export let activeLogDate = new Date().toISOString().split('T')[0];

/* ================================
   HELPERS
================================ */

export function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function todayKey() {
    return new Date().toISOString().split('T')[0];
}

export function getDisplayWeight(kg) {
    return weightUnit === 'lbs'
        ? (kg * 2.20462).toFixed(1)
        : kg.toFixed(1);
}

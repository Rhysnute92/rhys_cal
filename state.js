/* ================================
   GLOBAL STATE & CONFIG
================================ */

// Manages unit preference and persistent data from localStorage
export const weightUnit = localStorage.getItem('weightUnit') || 'kg';

export let workoutData = JSON.parse(localStorage.getItem('workoutData')) || {};
export let foodData = JSON.parse(localStorage.getItem('foodData')) || {};
export let waterData = JSON.parse(localStorage.getItem('waterData')) || {};
export let weightHistory = JSON.parse(localStorage.getItem('weightHistory')) || [];
export let isTrainingDay = JSON.parse(localStorage.getItem('isTrainingDay')) || false;

// Fixed Goals as requested: 1500 (Rest) / 1800 (Train)
// Macros are locked at 200g P, 145g C, 45g F for both modes
export let goals = {
    restCals: 1500,
    trainCals: 1800,
    protein: 200,
    carbs: 145,
    fat: 45,
    targetWeight: 75 // Added target weight for the comparison chart
};

export const WATER_GOAL = 2000;

// Expanded Exercise Database including Cardio (Swimming/Walking)
export const gymDB = [
    { name: "Swimming", equipment: "Pool", muscle: "Full Body (Cardio)" },
    { name: "Walking", equipment: "None", muscle: "Legs (Cardio)" },
    { name: "Barbell Bench Press", equipment: "Barbell", muscle: "Chest" },
    { name: "Incline DB Press", equipment: "Dumbbells", muscle: "Chest" },
    { name: "Barbell Squat", equipment: "Barbell", muscle: "Legs" },
    { name: "Leg Press", equipment: "Machine", muscle: "Legs" },
    { name: "Deadlift", equipment: "Barbell", muscle: "Back" },
    { name: "Bent Over Row", equipment: "Barbell", muscle: "Back" },
    { name: "Lat Pulldown", equipment: "Machine", muscle: "Back" },
    { name: "Overhead Press", equipment: "Barbell", muscle: "Shoulders" },
    { name: "Lateral Raise", equipment: "Dumbbells", muscle: "Shoulders" },
    { name: "Bicep Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Tricep Pushdown", equipment: "Cable", muscle: "Arms" },
    { name: "Hammer Curl", equipment: "Dumbbells", muscle: "Arms" },
    { name: "Skull Crushers", equipment: "Barbell", muscle: "Arms" }
];

export let activeLogDate = new Date().toISOString().split('T')[0];

/* ================================
   HELPERS
================================ */

// Saves state to localStorage to ensure data persists on refresh
export function saveState(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Utility to get the current date key (YYYY-MM-DD)
export function todayKey() {
    return new Date().toISOString().split('T')[0];
}

// Handles conversion for weight display
export function getDisplayWeight(kg) {
    return weightUnit === 'lbs'
        ? (kg * 2.20462).toFixed(1)
        : kg.toFixed(1);
}
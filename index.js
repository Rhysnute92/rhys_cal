import { goals, foodData, isTrainingDay, todayKey, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

window.toggleTrainingMode = function () {
    const toggle = document.getElementById('trainingToggle');
    // Important: We must update the value in state.js logic
    localStorage.setItem('isTrainingDay', toggle.checked);
    // Reload page or re-run updateUI to see changes
    location.reload();
};

function updateUI() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalFood = meals.reduce((sum, item) => sum + Number(item.calories), 0);

    // Logic: If isTrainingDay is true, use trainCals, else use restCals
    const currentGoal = isTrainingDay ? (goals.restCals + 300) : goals.restCals;
    const remaining = Math.max(0, currentGoal - totalFood);

    if (document.getElementById('displayGoal')) document.getElementById('displayGoal').innerText = currentGoal;
    if (document.getElementById('displayFood')) document.getElementById('displayFood').innerText = totalFood;
    if (document.getElementById('displayRemaining')) document.getElementById('displayRemaining').innerText = remaining;
}
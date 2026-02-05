/* ui.js */
import { goals, foodData, isTrainingDay, weightHistory, todayKey, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    initCharts();
});

export function updateDashboard() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totals = meals.reduce((acc, m) => ({
        cals: acc.cals + (m.calories || 0),
        p: acc.p + (m.protein || 0),
        c: acc.c + (m.carbs || 0),
        f: acc.f + (m.fats || 0)
    }), { cals: 0, p: 0, c: 0, f: 0 });

    const currentGoal = isTrainingDay ? goals.trainCals : goals.restCals;

    // Update Text Elements
    if(document.getElementById('dashCals')) document.getElementById('dashCals').innerText = totals.cals;
    if(document.getElementById('calGoal')) document.getElementById('calGoal').innerText = currentGoal;

    // Update Progress Bar
    const pct = Math.min((totals.cals / currentGoal) * 100, 100);
    if(document.getElementById('cal-bar')) document.getElementById('cal-bar').style.width = pct + '%';

    renderCharts(totals);
}

window.toggleTrainingMode = function() {
    const currentState = JSON.parse(localStorage.getItem('isTrainingDay')) || false;
    localStorage.setItem('isTrainingDay', JSON.stringify(!currentState));
    location.reload(); // Refresh to apply new calorie targets
};

function renderCharts(totals) {
    // 1. Macro Pie Chart
    const pieCtx = document.getElementById('macroPieChart')?.getContext('2d');
    if (pieCtx) {
        new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Protein', 'Carbs', 'Fats'],
                datasets: [{
                    data: [totals.p, totals.c, totals.f],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
                }]
            }
        });
    }

    // 2. 7-Day Weight Comparison
    const weightCtx = document.getElementById('weightComparisonChart')?.getContext('2d');
    if (weightCtx) {
        const last7 = weightHistory.slice(-7);
        new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: last7.map(d => d.date),
                datasets: [{
                    label: 'Weight',
                    data: last7.map(d => d.weight),
                    borderColor: '#4CAF50'
                }, {
                    label: 'Target',
                    data: new Array(last7.length).fill(goals.targetWeight),
                    borderColor: 'red',
                    borderDash: [5, 5]
                }]
            }
        });
    }
}
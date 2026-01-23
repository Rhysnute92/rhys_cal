let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let restGoal = 1500, trainGoal = 1800;
let proteinGoal = 200, fatGoal = 45, carbGoal = 145;
let isTrainingDay = false;

document.addEventListener("DOMContentLoaded", loadData);

function loadData() {
    const dateKey = new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('day_' + dateKey));
    if (saved) {
        mealFoods = saved.mealFoods || mealFoods;
        restGoal = saved.restGoal || 1500;
        trainGoal = saved.trainGoal || 1800;
        proteinGoal = saved.proteinGoal || 200;
        fatGoal = saved.fatGoal || 45;
        carbGoal = saved.carbGoal || 145;
        isTrainingDay = saved.isTrainingDay || false;
    }
    document.getElementById('trainingMode').checked = isTrainingDay;
    updateGoalDisplays();
    updateDailyTotals();
}

function toggleTrainingMode() {
    isTrainingDay = document.getElementById('trainingMode').checked;
    const statusText = document.getElementById('trainingStatusText');
    statusText.innerText = isTrainingDay ? `Training Day (${trainGoal} kcal)` : `Rest Day (${restGoal} kcal)`;
    saveData();
    updateDailyTotals();
}

function updateDailyTotals() {
    let totals = { cal: 0, p: 0, f: 0, c: 0 };
    Object.values(mealFoods).flat().forEach(f => {
        totals.cal += (parseInt(f.calories) || 0);
        totals.p += (parseInt(f.protein) || 0);
        totals.f += (parseInt(f.fat) || 0);
        totals.c += (parseInt(f.carbs) || 0);
    });

    const activeGoal = isTrainingDay ? trainGoal : restGoal;
    const remEl = document.getElementById('remainingCalories');
    const rem = activeGoal - totals.cal;
    remEl.innerText = rem;
    remEl.style.color = rem < 0 ? "#ff4444" : "#4CAF50";

    setBar('protein-bar', totals.p, proteinGoal);
    setBar('fat-bar', totals.f, fatGoal);
    setBar('carb-bar', totals.c, carbGoal);

    if (window.Chart) drawCharts(totals.p, totals.f, totals.c);
}

function updateCalorieGoals() {
    const restInput = document.getElementById('goalRestCals').value;
    const trainInput = document.getElementById('goalTrainCals').value;

    if (restInput) restGoal = parseInt(restInput);
    if (trainInput) trainGoal = parseInt(trainInput);

    saveData();
    toggleTrainingMode(); // Refreshes text and math
}

function updateGoal(type) {
    const val = parseInt(document.getElementById(`goal${type}`).value);
    if (!val) return;
    if (type === 'Protein') proteinGoal = val;
    if (type === 'Fat') fatGoal = val;
    if (type === 'Carbs') carbGoal = val;
    saveData();
    updateGoalDisplays();
    updateDailyTotals();
}

function setBar(id, cur, goal) {
    document.getElementById(id).style.width = Math.min((cur / goal) * 100, 100) + "%";
}

function toggleEditMode() {
    document.querySelectorAll('.edit-box').forEach(box => box.classList.toggle('hidden'));
}

function updateGoalDisplays() {
    document.getElementById('displayGoalP').innerText = proteinGoal;
    document.getElementById('displayGoalF').innerText = fatGoal;
    document.getElementById('displayGoalC').innerText = carbGoal;
}

function saveData() {
    const dateKey = new Date().toISOString().split('T')[0];
    localStorage.setItem('day_' + dateKey, JSON.stringify({
        mealFoods, restGoal, trainGoal, proteinGoal, fatGoal, carbGoal, isTrainingDay
    }));
}

function drawCharts(p, f, c) {
    const ctx = document.getElementById('macroChart')?.getContext('2d');
    if (!ctx) return;
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Fat', 'Carbs'],
            datasets: [{ data: [p*4, f*9, c*4], backgroundColor: ['#4CAF50', '#FF9800', '#2196F3'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}

function generateWeeklyTable() {
    const body = document.getElementById('weeklySummaryBody');
    if (!body) return;

    body.innerHTML = '';
    const now = new Date();

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem('day_' + dateKey));

        if (data && data.mealFoods) {
            Object.keys(data.mealFoods).forEach(cat => {
                data.mealFoods[cat].forEach(food => {
                    const row = `<tr>
                        <td>${d.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</td>
                        <td>${cat}</td>
                        <td>${food.name}</td>
                        <td>${food.calories}</td>
                    </tr>`;
                    body.innerHTML += row;
                });
            });
        }
    }
}

function addFood() {
    const name = document.getElementById('foodName').value;
    const calories = parseInt(document.getElementById('foodCalories').value);
    const cat = document.getElementById('mealCategory').value;

    if (!name || isNaN(calories)) return alert("Please enter a name and calorie count.");

    const entry = {
        name,
        calories,
        protein: parseInt(document.getElementById('protein').value) || 0,
        fat: parseInt(document.getElementById('fat').value) || 0,
        carbs: parseInt(document.getElementById('carbs').value) || 0
    };

    mealFoods[cat].push(entry);
    saveData();
    updateMealDisplay(cat);
    updateDailyTotals();

    // Clear inputs
    ['foodName','foodCalories','protein','fat','carbs'].forEach(id => document.getElementById(id).value = '');
}
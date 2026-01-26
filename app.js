// 1. Global State Management
let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Drinks: [], Snack: [] };
let restGoal = 1500, trainGoal = 1800;
let proteinGoal = 200, fatGoal = 45, carbGoal = 145;
let isTrainingDay = false;

// 2. Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadData();
    // If on the Database page, populate the table
    if (document.getElementById('weeklySummaryBody')) {
        generateWeeklyTable();
    }
});

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

    // Sync UI elements if they exist on the current page
    const trainToggle = document.getElementById('trainingMode');
    if (trainToggle) trainToggle.checked = isTrainingDay;

    updateGoalDisplays();
    updateDailyTotals();
}

function saveData() {
    const dateKey = new Date().toISOString().split('T')[0];
    const dataToSave = {
        mealFoods, restGoal, trainGoal, proteinGoal, fatGoal, carbGoal, isTrainingDay
    };
    localStorage.setItem('day_' + dateKey, JSON.stringify(dataToSave));
}

// 3. Goal & Mode Logic
function toggleTrainingMode() {
    const trainToggle = document.getElementById('trainingMode');
    if (!trainToggle) return;

    isTrainingDay = trainToggle.checked;
    const statusText = document.getElementById('trainingStatusText');
    if (statusText) {
        statusText.innerText = isTrainingDay ? `Training Day (${trainGoal} kcal)` : `Rest Day (${restGoal} kcal)`;
    }

    saveData();
    updateDailyTotals();
}

function updateCalorieGoals() {
    const restInput = document.getElementById('goalRestCals');
    const trainInput = document.getElementById('goalTrainCals');

    if (restInput && restInput.value) restGoal = parseInt(restInput.value);
    if (trainInput && trainInput.value) trainGoal = parseInt(trainInput.value);

    saveData();
    toggleTrainingMode(); // Refreshes text and math
}

function updateGoal(type) {
    const input = document.getElementById(`goal${type}`);
    if (!input || !input.value) return;

    const val = parseInt(input.value);
    if (type === 'Protein') proteinGoal = val;
    if (type === 'Fat') fatGoal = val;
    if (type === 'Carbs') carbGoal = val;

    saveData();
    updateGoalDisplays();
    updateDailyTotals();
    input.value = ''; // Clear input
}

// 4. Calculations & UI Updates
function updateDailyTotals() {
    let totals = { cal: 0, p: 0, f: 0, c: 0 };

    // Sum all categories (including Drinks)
    Object.values(mealFoods).flat().forEach(f => {
        totals.cal += (parseInt(f.calories) || 0);
        totals.p += (parseInt(f.protein) || 0);
        totals.f += (parseInt(f.fat) || 0);
        totals.c += (parseInt(f.carbs) || 0);
    });

    const activeGoal = isTrainingDay ? trainGoal : restGoal;

    // Update Remaining Calories
    const remEl = document.getElementById('remainingCalories');
    if (remEl) {
        const rem = activeGoal - totals.cal;
        remEl.innerText = rem;
        remEl.style.color = rem < 0 ? "#ff4444" : "#4CAF50";
    }

    // Update Progress Bars
    setBar('protein-bar', totals.p, proteinGoal);
    setBar('fat-bar', totals.f, fatGoal);
    setBar('carb-bar', totals.c, carbGoal);

    // Update Chart if on Dashboard
    if (document.getElementById('macroChart')) {
        drawCharts(totals.p, totals.f, totals.c);
    }
}

function setBar(id, cur, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min((cur / goal) * 100, 100) + "%";
}

function updateGoalDisplays() {
    const displays = {
        'displayGoalP': proteinGoal,
        'displayGoalF': fatGoal,
        'displayGoalC': carbGoal
    };
    Object.entries(displays).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    });
}

function toggleEditMode() {
    document.querySelectorAll('.edit-box').forEach(box => box.classList.toggle('hidden'));
}

// 5. Data Visualization (Chart.js)
function drawCharts(p, f, c) {
    const ctx = document.getElementById('macroChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Fat', 'Carbs'],
            datasets: [{
                data: [p * 4, f * 9, c * 4],
                backgroundColor: ['#4CAF50', '#FF9800', '#2196F3']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// 6. Database / History Generation
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
            Object.entries(data.mealFoods).forEach(([cat, foods]) => {
                foods.forEach(food => {
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

function startScanner() {
    const viewport = document.getElementById('interactive');
    viewport.style.display = "block";

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: viewport,
            constraints: { facingMode: "environment" } // Uses back camera
        },
        decoder: {
            readers: ["ean_reader", "upc_reader"] // Standard food barcode formats
        }
    }, function(err) {
        if (err) { console.error(err); return; }
        Quagga.start();
    });

    Quagga.onDetected((data) => {
        const code = data.codeResult.code;
        // 1. Stop scanning once found
        Quagga.stop();
        viewport.style.display = "none";

        // 2. Play a small beep (optional) or alert
        alert("Barcode Detected: " + code);

        // 3. Auto-fill the name (In a real app, you'd fetch from an API like OpenFoodFacts)
        document.getElementById('foodName').value = "Scanned Item (" + code + ")";

        // You would typically use a fetch() here to get nutritional data
        // fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
    });
}
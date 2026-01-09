    // --- STATE ---
    let foodDatabase = JSON.parse(localStorage.getItem('foodDatabase')) || [
        { name: "Chicken Breast", calories: 165, protein: 31, fat: 3.6, carbs: 0 },
        { name: "Rice (100g)", calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
        { name: "Egg", calories: 70, protein: 6, fat: 5, carbs: 0.6 }
    ];

    let mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Tea: [], Snack: [] };
    let dailyGoalCals = 1800;
    let proteinGoal = 200;
    let macroChart, mealChart, weeklyChart;

    const dateInput = document.getElementById('date');

    // --- INIT ---
    document.addEventListener("DOMContentLoaded", () => {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
        buildCalendar(today);
        loadData();
    });

    function buildCalendar(currentDate) {
        const calendarDiv = document.getElementById('calendar');
        calendarDiv.innerHTML = '';
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const btn = document.createElement('button');
            btn.textContent = day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
            btn.onclick = () => {
                dateInput.value = day.toISOString().split('T')[0];
                document.querySelectorAll('.calendar button').forEach(b => b.classList.remove('active-day'));
                btn.classList.add('active-day');
                loadData();
            };
            if (day.toDateString() === currentDate.toDateString()) btn.classList.add('active-day');
            calendarDiv.appendChild(btn);
        }
    }

    // --- CORE LOGIC ---
    function setDailyGoal() {
        const base = parseInt(document.getElementById('baseCalories').value) || 0;
        const extra = parseInt(document.getElementById('trainingCalories').value) || 0;
        const isTraining = document.getElementById('isTraining').value;
        dailyGoalCals = base + (isTraining === 'yes' ? extra : 0);
        saveData();
        updateDailyTotals();
    }

    function searchFood() {
        const query = document.getElementById('foodName').value.toLowerCase();
        const suggestionsDiv = document.getElementById('suggestions');
        suggestionsDiv.innerHTML = '';
        if (query.length === 0) return;
        foodDatabase.filter(f => f.name.toLowerCase().includes(query)).forEach(food => {
            const div = document.createElement('div');
            div.textContent = food.name;
            div.onclick = () => {
                document.getElementById('foodName').value = food.name;
                document.getElementById('foodCalories').value = food.calories;
                document.getElementById('protein').value = food.protein;
                document.getElementById('fat').value = food.fat;
                document.getElementById('carbs').value = food.carbs;
                suggestionsDiv.innerHTML = '';
            };
            suggestionsDiv.appendChild(div);
        });
    }

    function addFood() {
        const category = document.getElementById('mealCategory').value;
        const food = {
            name: document.getElementById('foodName').value,
            calories: parseInt(document.getElementById('foodCalories').value) || 0,
            protein: parseInt(document.getElementById('protein').value) || 0,
            fat: parseInt(document.getElementById('fat').value) || 0,
            carbs: parseInt(document.getElementById('carbs').value) || 0
        };
        if (!food.name || food.calories <= 0) return alert('Invalid entry');

        mealFoods[category].push(food);
        updateMealDisplay(category);
        saveData();
    }

    function updateMealDisplay(category) {
        const list = document.getElementById(category + 'List');
        list.innerHTML = '';
        mealFoods[category].forEach((food, index) => {
            const li = document.createElement('li');
            li.innerHTML = `${food.name} (${food.calories} kcal) <button onclick="removeFood('${category}', ${index})">x</button>`;
            list.appendChild(li);
        });
        updateDailyTotals();
    }

    function removeFood(category, index) {
        mealFoods[category].splice(index, 1);
        updateMealDisplay(category);
        saveData();
    }

    function updateDailyTotals() {
        let total = { cal: 0, p: 0, f: 0, c: 0 };
        Object.values(mealFoods).flat().forEach(f => {
            total.cal += f.calories; total.p += f.protein; total.f += f.fat; total.c += f.carbs;
        });

        document.getElementById('dailyGoal').innerText = `Goal: ${dailyGoalCals} kcal`;
        document.getElementById('remainingCalories').innerText = `Remaining: ${dailyGoalCals - total.cal} kcal`;
        document.getElementById('protein-remaining').innerText = `Protein Remaining: ${Math.max(0, proteinGoal - total.p)}g`;
        document.getElementById('dailyTotals').innerText = `Total -> Cals: ${total.cal} | P: ${total.p}g | F: ${total.f}g | C: ${total.c}g`;

        drawCharts(total.p, total.f, total.c);
    }

    // --- STORAGE ---
    function saveData() {
        const dateKey = dateInput.value;
        const data = { mealFoods, dailyGoalCals };
        localStorage.setItem('day_' + dateKey, JSON.stringify(data));
    }

    function loadData() {
        const dateKey = dateInput.value;
        const saved = JSON.parse(localStorage.getItem('day_' + dateKey));
        if (saved) {
            mealFoods = saved.mealFoods || { Breakfast: [], Lunch: [], Dinner: [], Tea: [], Snack: [] };
            dailyGoalCals = saved.dailyGoalCals || 1800;
        } else {
            mealFoods = { Breakfast: [], Lunch: [], Dinner: [], Tea: [], Snack: [] };
        }
        Object.keys(mealFoods).forEach(updateMealDisplay);
    }

    // --- CHARTS ---
    function drawCharts(p, f, c) {
        const ctxMacro = document.getElementById('macroChart').getContext('2d');
        if (macroChart) macroChart.destroy();
        macroChart = new Chart(ctxMacro, {
            type: 'doughnut',
            data: {
                labels: ['Protein', 'Fat', 'Carbs'],
                datasets: [{ data: [p*4, f*9, c*4], backgroundColor: ['#4CAF50', '#FF9800', '#2196F3'] }]
            }
        });
    }

    function exportToPDF() {
        window.print();
    }

    function exportToCSV() {
        let csv = "Category,Name,Calories,Protein,Fat,Carbs\n";
        for (let cat in mealFoods) {
            mealFoods[cat].forEach(f => {
                csv += `${cat},${f.name},${f.calories},${f.protein},${f.fat},${f.carbs}\n`;
            });
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Log_${dateInput.value}.csv`;
        a.click();
    }
    // --- DYNAMIC GOAL LOGIC ---
    document.getElementById('isTraining').addEventListener('change', function() {
        const baseInput = document.getElementById('baseCalories');
        const isTraining = this.value;

        if (isTraining === 'no') {
            baseInput.value = 1500;
        } else {
            // Optional: Reset to a higher default if "yes" is selected
            baseInput.value = 1800;
        }

        // Automatically recalculate goals when the dropdown changes
        setDailyGoal();
    });

    // 1. Listen for dropdown changes to update the base input automatically
    document.getElementById('isTraining').addEventListener('change', function() {
        const baseInput = document.getElementById('baseCalories');

        // Logic: No = 1500, Yes = 1800
        if (this.value === 'no') {
            baseInput.value = 1500;
        } else {
            baseInput.value = 1800;
        }

        // 2. Immediately update the total goals and save
        setDailyGoal();
    });

    // 3. The master function to calculate and display goals
    function setDailyGoal() {
        const base = parseInt(document.getElementById('baseCalories').value) || 0;
        const extra = parseInt(document.getElementById('trainingCalories').value) || 0;
        const isTraining = document.getElementById('isTraining').value;

        // Calculate total: If 'yes', add extra. If 'no', just base.
        dailyGoalCals = base + (isTraining === 'yes' ? extra : 0);

        // Update the UI Text
        document.getElementById('dailyGoal').innerText = `Daily Goal: ${dailyGoalCals} kcal`;

        // Save to LocalStorage and refresh calculations
        saveData();
        updateDailyTotals();
    }
    function updateDailyTotals() {
        let total = { cal: 0, p: 0, f: 0, c: 0 };
        Object.values(mealFoods).flat().forEach(f => {
            total.cal += f.calories; total.p += f.protein; total.f += f.fat; total.c += f.carbs;
        });

        // Update Text
        document.getElementById('remainingCalories').innerText = `Remaining: ${dailyGoalCals - total.cal} kcal`;
        document.getElementById('protein-remaining').innerText = `Protein Remaining: ${Math.max(0, proteinGoal - total.p)}g`;

        // Update Progress Bar
        const proteinPercent = Math.min((total.p / proteinGoal) * 100, 100);
        document.getElementById('protein-bar').style.width = proteinPercent + "%";

        drawCharts(total.p, total.f, total.c);
    }
import { gymDB, workoutData, save, todayKey, getToday, isTrainingDay, load, GOALS, calculate1RM } from './state.js';

let restInterval;
let selectedRestTime = 60;

document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons();
    renderWorkoutLog();
    initWeightChart();
    updateChartSelector();
});

/* --- CATEGORY & EXERCISE UI --- */
function renderCategoryButtons() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(gymDB).forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `pill ${index === 0 ? 'active' : ''}`;
        btn.innerHTML = `<span>${gymDB[cat].icon || ''}</span> ${cat}`;
        btn.onclick = () => window.filterExercises(cat);
        grid.appendChild(btn);
    });
    window.filterExercises(Object.keys(gymDB)[0]);
}

window.filterExercises = function(category) {
    const select = document.getElementById('exerciseSelect');
    if (!select) return;
    select.innerHTML = '';
    const categoryData = gymDB[category];
    const exercises = Array.isArray(categoryData) ? categoryData : categoryData.exercises;
    exercises.forEach(exName => {
        const opt = document.createElement('option');
        opt.value = exName;
        opt.innerText = exName;
        select.appendChild(opt);
    });
    document.querySelectorAll('.pill').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(category));
    });
};

/* --- LOGGING & TIMER --- */
window.setRest = function(seconds) {
    selectedRestTime = seconds;
    document.querySelectorAll('.rest-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.innerText) === seconds);
    });
};

window.showLive1RM = function() {
    const w = document.getElementById('weightLifted').value;
    const r = document.getElementById('repsDone').value;
    const display = document.getElementById('live1RM');
    if (w > 0 && r > 0) {
        display.innerText = `Est. 1RM: ${calculate1RM(w, r)}kg`;
    } else {
        display.innerText = "";
    }
};

window.saveExercise = function() {
    const name = document.getElementById('exerciseSelect').value;
    const weightInput = document.getElementById('weightLifted');
    const repsInput = document.getElementById('repsDone');
    const weight = parseFloat(weightInput.value) || 0;
    const reps = parseInt(repsInput.value) || 0;

    if (!name || !reps) {
        alert("Enter reps and exercise!");
        return;
    }

    const today = todayKey();
    if (!workoutData[today]) workoutData[today] = [];
    
    workoutData[today].push({
        name,
        reps,
        weight,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    save('workoutData', workoutData);
    renderWorkoutLog();
    updateChartSelector();
    window.startRestTimer(selectedRestTime);
    
    repsInput.value = "";
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};

window.startRestTimer = function(seconds) {
    const container = document.getElementById('timerContainer');
    const clock = document.getElementById('timerClock');
    const beep = document.getElementById('beepSound');
    container.style.display = 'flex';
    let timeLeft = seconds;
    clearInterval(restInterval);
    restInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        clock.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(restInterval);
            container.style.display = 'none';
            if (beep) beep.play().catch(() => {});
            if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
        }
    }, 1000);
};

window.stopTimer = function() {
    clearInterval(restInterval);
    document.getElementById('timerContainer').style.display = 'none';
};

/* --- HISTORY & CHARTS --- */
function renderWorkoutLog() {
    const container = document.getElementById('exerciseHistoryList');
    if (!container) return;
    const sessions = workoutData[todayKey()] || [];
    container.innerHTML = sessions.map((s, i) => `
        <div class="history-item">
            <div><strong>${s.name}</strong><br><small>${s.reps} @ ${s.weight}kg — ${s.time}</small></div>
            <button class="delete-btn" onclick="window.deleteWorkout(${i})">✕</button>
        </div>
    `).join('');
}

window.deleteWorkout = function(index) {
    workoutData[todayKey()].splice(index, 1);
    save('workoutData', workoutData);
    renderWorkoutLog();
};

function updateChartSelector() {
    const selector = document.getElementById('chartExerciseSelector');
    if (!selector) return;
    const logged = new Set();
    Object.values(workoutData).flat().forEach(s => logged.add(s.name));
    selector.innerHTML = Array.from(logged).map(n => `<option value="${n}">${n}</option>`).join('');
    if (logged.size > 0) window.renderStrengthChart();
}

window.renderStrengthChart = function() {
    const canvas = document.getElementById('strengthChart');
    const selectedEx = document.getElementById('chartExerciseSelector').value;
    if (!canvas || !selectedEx) return;
    let history = [];
    Object.keys(workoutData).forEach(date => {
        workoutData[date].forEach(s => {
            if (s.name === selectedEx) history.push({ date, estMax: calculate1RM(s.weight, s.reps) });
        });
    });
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    const chartStatus = Chart.getChart("strengthChart");
    if (chartStatus) chartStatus.destroy();
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: history.map(h => h.date.split('-').slice(1).join('/')),
            datasets: [{ label: '1RM', data: history.map(h => h.estMax), borderColor: '#FFD700', fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

function initWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;
    const history = JSON.parse(localStorage.getItem('weightHistory')) || [];
    const chartStatus = Chart.getChart("weightChart");
    if (chartStatus) chartStatus.destroy();
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: history.slice(-7).map(d => d.date.split('-').slice(1).join('/')),
            datasets: [{ label: 'Weight', data: history.slice(-7).map(d => d.weight), borderColor: '#4dbdff', fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

window.saveBodyWeight = function() {
    const w = parseFloat(document.getElementById('bodyWeight').value);
    if (!w) return;
    const history = JSON.parse(localStorage.getItem('weightHistory')) || [];
    history.push({ date: getToday(), weight: w });
    localStorage.setItem('weightHistory', JSON.stringify(history));
    initWeightChart();
};

window.filterExercises = function(category) {
    const select = document.getElementById('exerciseSelect');
    if (!select) return;

    select.innerHTML = '';
    const categoryData = gymDB[category];
    
    // This line handles the { icon, exercises } structure
    const exercises = categoryData.exercises; 

    exercises.forEach(exName => {
        const opt = document.createElement('option');
        opt.value = exName;
        opt.innerText = exName;
        select.appendChild(opt);
    });

    document.querySelectorAll('.pill').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(category));
    });
};

/* ================================
   WEEKLY SUMMARY CHART
================================ */
window.renderWeeklySummary = function() {
    const canvas = document.getElementById('weeklySummaryChart');
    if (!canvas) return;

    const foodHistory = load('foodHistory', {});
    const labels = [];
    const intakeData = [];
    const goalData = [];

    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // 1. Label (e.g., "15/02")
        labels.push(dateStr.split('-').slice(1).reverse().join('/'));

        // 2. Calculate Actual Intake
        const dayEntries = foodHistory[dateStr] || [];
        const totalIntake = dayEntries.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
        intakeData.push(totalIntake);

        // 3. Calculate Daily Goal
        const dailyGoal = isTrainingDay(dateStr) ? GOALS.TRAINING.kcal : GOALS.REST.kcal;
        goalData.push(dailyGoal);
    }

    const chartStatus = Chart.getChart("weeklySummaryChart");
    if (chartStatus) chartStatus.destroy();

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Actual Intake',
                    data: intakeData,
                    backgroundColor: '#4dbdff',
                    borderRadius: 5
                },
                {
                    label: 'Daily Target',
                    data: goalData,
                    type: 'line',
                    borderColor: '#ff5252',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'kcal' } }
            }
        }
    });

    // Simple Status Message
    const totalDiff = intakeData.reduce((a, b, i) => a + (b - goalData[i]), 0);
    const msg = document.getElementById('weeklyStatusMsg');
    if (msg) {
        msg.innerText = totalDiff > 0 
            ? `Weekly Surplus: +${Math.round(totalDiff)} kcal` 
            : `Weekly Deficit: ${Math.round(totalDiff)} kcal`;
        msg.style.color = totalDiff > 0 ? '#ffb347' : '#28a745';
    }
};

// Call this in your DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... your other init functions
    renderWeeklySummary(); 
});

/* ================================
   MACRO PIE CHART
================================ */
window.renderMacroPieChart = function() {
    const canvas = document.getElementById('macroPieChart');
    if (!canvas) return;

    const foodHistory = load('foodHistory', {});
    let totals = { p: 0, c: 0, f: 0 };

    // Aggregate last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayEntries = foodHistory[dateStr] || [];
        dayEntries.forEach(item => {
            totals.p += (Number(item.protein) || 0);
            totals.c += (Number(item.carbs) || 0);
            totals.f += (Number(item.fats) || 0);
        });
    }

    const chartStatus = Chart.getChart("macroPieChart");
    if (chartStatus) chartStatus.destroy();

    // Avoid rendering if no data
    if (totals.p === 0 && totals.c === 0 && totals.f === 0) {
        document.getElementById('macroAnalysis').innerText = "Log some food to see your macro split!";
        return;
    }

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fats'],
            datasets: [{
                data: [totals.p, totals.c, totals.f],
                backgroundColor: ['#4dbdff', '#ffcc33', '#ff5252'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Provide helpful feedback based on protein intake
    const totalMacros = totals.p + totals.c + totals.f;
    const pPct = Math.round((totals.p / totalMacros) * 100);
    const analysis = document.getElementById('macroAnalysis');
    
    let feedback = `Your current split is <strong>${pPct}% Protein</strong>. `;
    if (pPct < 25) {
        feedback += "Try increasing protein to support muscle recovery.";
    } else {
        feedback += "Great protein ratio for maintaining lean mass!";
    }
    analysis.innerHTML = feedback;
};

// Add to your DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... other charts
    renderMacroPieChart();
});
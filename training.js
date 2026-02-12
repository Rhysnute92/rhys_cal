import { gymDB, workoutData, save, todayKey, weightHistory, getToday, calculate1RM } from './state.js';

/* ================================
   INITIALIZATION
================================ */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize the category buttons (The 2-per-row grid)
    renderCategoryButtons();
    
    // 2. Load the initial workout log for today
    renderWorkoutLog();
    
    // 3. Initialize the weight chart
    initWeightChart();
});

/* ================================
   EXERCISE SELECTION (CATEGORY GRID)
================================ */

// Dynamically creates the buttons from your gymDB in state.js
function renderCategoryButtons() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    Object.keys(gymDB).forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `pill ${index === 0 ? 'active' : ''}`;
        btn.innerHTML = `<span>${gymDB[cat].icon}</span> ${cat}`;
        btn.onclick = () => filterExercises(cat);
        grid.appendChild(btn);
    });

    // Default to the first category (e.g., Chest)
    filterExercises(Object.keys(gymDB)[0]);
}

window.filterExercises = function(category) {
    const select = document.getElementById('exerciseSelect');
    if (!select) return;

    select.innerHTML = '';
    const categoryData = gymDB[category];
    
    // Handle both array format and object-with-icon format
    const exercises = Array.isArray(categoryData) ? categoryData : categoryData.exercises;

    exercises.forEach(exName => {
        const opt = document.createElement('option');
        opt.value = exName;
        opt.innerText = exName;
        select.appendChild(opt);
    });

    // Update active visual state for buttons
    document.querySelectorAll('.pill').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(category));
    });
};

/* ================================
   LOGGING EXERCISES
================================ */

// This saves the set from the Manual Form
window.saveExercise = function() {
    const name = document.getElementById('exerciseSelect').value;
    const weight = document.getElementById('weightLifted').value;
    const reps = document.getElementById('repsDone').value;

    if (!name || !reps) {
        alert("Please select an exercise and enter reps.");
        return;
    }

    logWorkout(name, 1, reps, weight); // Logging 1 set at a time
    
    // Clear inputs for next set
    document.getElementById('repsDone').value = "";
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};

function logWorkout(name, sets, reps, weight) {
    const today = todayKey();
    if (!workoutData[today]) workoutData[today] = [];

    workoutData[today].push({
        name,
        sets: parseInt(sets),
        reps: parseInt(reps),
        weight: parseFloat(weight) || 0,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    save('workoutData', workoutData);
    renderWorkoutLog();
}

export function renderWorkoutLog() {
    const container = document.getElementById('exerciseHistoryList');
    if (!container) return;

    const today = todayKey();
    const sessions = workoutData[today] || [];

    if (sessions.length === 0) {
        container.innerHTML = '<p class="empty-msg">No exercises logged today.</p>';
        return;
    }

    container.innerHTML = sessions.map((s, index) => `
        <div class="history-item">
            <div>
                <strong>${s.name}</strong><br>
                <small>${s.reps} reps @ ${s.weight}kg — ${s.time}</small>
            </div>
            <button class="delete-btn" onclick="deleteWorkout(${index})">✕</button>
        </div>
    `).join('');
}

window.deleteWorkout = function(index) {
    const today = todayKey();
    workoutData[today].splice(index, 1);
    save('workoutData', workoutData);
    renderWorkoutLog();
};

/* ================================
   WEIGHT TRACKING & CHARTS
================================ */

window.saveBodyWeight = function() {
    const weightInput = document.getElementById('bodyWeight');
    const weight = parseFloat(weightInput.value);

    if (!weight) return;

    const history = JSON.parse(localStorage.getItem('weightHistory')) || [];
    history.push({
        date: getToday(),
        weight: weight
    });
    
    localStorage.setItem('weightHistory', JSON.stringify(history));
    alert("Weight Logged!");
    initWeightChart(); // Refresh chart
};

function initWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;

    const history = JSON.parse(localStorage.getItem('weightHistory')) || [];
    const last7Days = history.slice(-7);
    const targetWeight = 75;

    // Destroy existing chart if it exists to prevent overlap
    const chartStatus = Chart.getChart("weightChart");
    if (chartStatus != undefined) {
        chartStatus.destroy();
    }

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date.split('-').slice(1).join('/')),
            datasets: [
                {
                    label: 'Weight',
                    data: last7Days.map(d => d.weight),
                    borderColor: '#4dbdff',
                    backgroundColor: 'rgba(77, 189, 255, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Target',
                    data: new Array(last7Days.length).fill(targetWeight),
                    borderColor: '#FF5252',
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

/* ================================
   STRENGTH HELPERS
================================ */
window.showLive1RM = function () {
    const w = document.getElementById('weightLifted').value;
    const r = document.getElementById('repsDone').value;
    const display = document.getElementById('live1RM');

    if (w > 0 && r > 0) {
        const est = calculate1RM(w, r);
        display.innerText = `Est. 1RM: ${est}kg`;
    } else {
        display.innerText = "";
    }
};

// Helper to check if this lift is a Personal Best
function checkPB(exerciseName, newWeight) {
    const allSessions = Object.values(workoutData).flat();
    
    // Filter for previous lifts of the same exercise
    const previousLifts = allSessions.filter(s => s.name === exerciseName);
    
    if (previousLifts.length === 0) return false; // First time doing it isn't a "new" PB

    // Find the highest previous weight
    const maxWeight = Math.max(...previousLifts.map(s => s.weight || 0));

    return newWeight > maxWeight;
}

window.saveExercise = function() {
    const name = document.getElementById('exerciseSelect').value;
    const weightInput = document.getElementById('weightLifted');
    const repsInput = document.getElementById('repsDone');
    
    const weight = parseFloat(weightInput.value) || 0;
    const reps = parseInt(repsInput.value) || 0;

    if (!name || !reps) {
        alert("Please select an exercise and enter reps.");
        return;
    }

    // 1. Check for PB BEFORE saving the new data
    const isPB = checkPB(name, weight);

    // 2. Save the data
    logWorkout(name, 1, reps, weight);

    // 3. Trigger PB Celebration if true
    if (isPB) {
        triggerPBCelebration(name, weight);
    }

    // Clear inputs
    repsInput.value = "";
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};

function triggerPBCelebration(name, weight) {
    // 1. Double Vibrate
    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);

    // 2. Visual Alert
    const toast = document.createElement('div');
    toast.className = 'pb-toast';
    toast.innerHTML = `
        <span>🔥 NEW PB! 🔥</span>
        <p>${weight}kg on ${name}</p>
    `;
    document.body.appendChild(toast);

    // 3. Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

/* Inside renderWorkoutLog map function */
const isThisPB = checkPB(s.name, s.weight); // Note: This check logic needs to be careful with current index

// Updated HTML inside the loop:
container.innerHTML = sessions.map((s, index) => `
    <div class="history-item ${checkPB(s.name, s.weight) ? 'pb-highlight' : ''}">
        <div>
            <strong>${s.name} ${checkPB(s.name, s.weight) ? '⭐' : ''}</strong><br>
            <small>${s.reps} reps @ ${s.weight}kg — ${s.time}</small>
        </div>
        <button class="delete-btn" onclick="deleteWorkout(${index})">✕</button>
    </div>
`).join('');

/* training.js - 1RM Chart Logic */

// Populate the chart's exercise selector with everything you've ever logged
function updateChartSelector() {
    const selector = document.getElementById('chartExerciseSelector');
    if (!selector) return;

    // Get unique exercise names from workoutData
    const loggedExercises = new Set();
    Object.values(workoutData).flat().forEach(s => loggedExercises.add(s.name));

    selector.innerHTML = Array.from(loggedExercises).map(name => 
        `<option value="${name}">${name}</option>`
    ).join('');
    
    // Auto-render if we have data
    if (loggedExercises.size > 0) renderStrengthChart();
}

window.renderStrengthChart = function() {
    const canvas = document.getElementById('strengthChart');
    if (!canvas) return;

    const selectedEx = document.getElementById('chartExerciseSelector').value;
    
    // 1. Gather all data for this exercise across all dates
    let history = [];
    Object.keys(workoutData).forEach(date => {
        workoutData[date].forEach(session => {
            if (session.name === selectedEx) {
                const estMax = calculate1RM(session.weight, session.reps);
                history.push({ date, estMax });
            }
        });
    });

    // 2. Sort by date
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Render Chart
    const chartStatus = Chart.getChart("strengthChart");
    if (chartStatus) chartStatus.destroy();

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: history.map(h => h.date.split('-').slice(1).join('/')),
            datasets: [{
                label: 'Est. 1RM (kg)',
                data: history.map(h => h.estMax),
                borderColor: '#FFD700', // Gold for strength
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, title: { display: true, text: 'kg' } }
            }
        }
    });
};

// Update the chart initialization in your DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons();
    renderWorkoutLog();
    initWeightChart();
    updateChartSelector(); // Added this
});

/* Update your existing saveExercise function */
window.saveExercise = function() {
    // ... (previous logic for weight, reps, PB check) ...

    logWorkout(name, 1, reps, weight);

    if (isPB) {
        triggerPBCelebration(name, weight);
    }

    // NEW: Refresh the chart selector and chart
    updateChartSelector(); 
    renderStrengthChart();

    repsInput.value = "";
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};
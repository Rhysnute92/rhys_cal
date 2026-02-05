import { gymDB, workoutData, save, todayKey, isTrainingDay, weightHistory } from './state.js';

/* ================================
   INITIALIZATION
================================ */
document.addEventListener('DOMContentLoaded', () => {
    renderExerciseList();
    renderWorkoutLog();
    initWeightChart();
});

/* ================================
   EXERCISE DATABASE & SEARCH
================================ */
// Includes Swimming and Walking as requested
export function renderExerciseList(filter = '') {
    const container = document.getElementById('exerciseResults');
    if (!container) return;

    const filtered = gymDB.filter(ex =>
        ex.name.toLowerCase().includes(filter.toLowerCase()) ||
        ex.muscle.toLowerCase().includes(filter.toLowerCase())
    );

    container.innerHTML = filtered.map(ex => `
        <div class="search-item" onclick="selectExercise('${ex.name}')">
            <div>
                <strong>${ex.name}</strong><br>
                <small>${ex.equipment} • ${ex.muscle}</small>
            </div>
            <button class="tag-btn">+</button>
        </div>
    `).join('');
}

window.selectExercise = function(name) {
    const sets = prompt(`How many sets for ${name}?`, "3");
    const reps = prompt(`How many reps/minutes?`, "10");
    const weight = prompt(`Weight (kg) or Intensity (1-10)?`, "0");

    if (sets && reps) {
        logWorkout(name, sets, reps, weight);
    }
};

/* ================================
   WORKOUT LOGGING
================================ */
function logWorkout(name, sets, reps, weight) {
    const today = todayKey();
    if (!workoutData[today]) workoutData[today] = [];

    workoutData[today].push({
        name,
        sets: parseInt(sets),
        reps: parseInt(reps),
        weight: parseFloat(weight),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    save('workoutData', workoutData);
    renderWorkoutLog();
}

export function renderWorkoutLog() {
    const container = document.getElementById('activeWorkoutList');
    if (!container) return;

    const today = todayKey();
    const sessions = workoutData[today] || [];

    container.innerHTML = sessions.map((s, index) => `
        <div class="meal-item">
            <div>
                <strong>${s.name}</strong><br>
                <small>${s.sets} sets x ${s.reps} (${s.weight}kg)</small>
            </div>
            <button class="delete-btn" onclick="deleteWorkout(${index})">✕</button>
        </div>
    `).join('');
}

/* ================================
   WEIGHT & TARGET COMPARISON
=============================== */
// Logic for the 7-day weight comparison chart
function initWeightChart() {
    const ctx = document.getElementById('historyChart');
    if (!ctx) return;

    const last7Days = weightHistory.slice(-7);
    const targetWeight = 75; // Set as requested

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date),
            datasets: [
                {
                    label: 'Actual Weight',
                    data: last7Days.map(d => d.weight),
                    borderColor: '#4CAF50',
                    tension: 0.1
                },
                {
                    label: 'Target Weight',
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
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

window.deleteWorkout = function(index) {
    const today = todayKey();
    workoutData[today].splice(index, 1);
    save('workoutData', workoutData);
    renderWorkoutLog();
};
import { gymDB, workoutData, save, todayKey, getToday, calculate1RM } from './state.js';

// Add at the top of your file with other variables
let selectedRestTime = 60; 

/* ================================
   REST TOGGLE LOGIC
================================ */
window.setRest = function(seconds) {
    selectedRestTime = seconds;
    
    // Update UI active state
    document.querySelectorAll('.rest-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.innerText) === seconds);
    });
};



document.addEventListener('DOMContentLoaded', () => {
    renderCategoryButtons();
    renderWorkoutLog();
    initWeightChart();
    updateChartSelector();
});

/* --- UI RENDERING --- */
function renderCategoryButtons() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    Object.keys(gymDB).forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `pill ${index === 0 ? 'active' : ''}`;
        btn.innerHTML = `<span>${gymDB[cat].icon || ''}</span> ${cat}`;
        btn.onclick = () => filterExercises(cat);
        grid.appendChild(btn);
    });
    filterExercises(Object.keys(gymDB)[0]);
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

/* --- LOGGING & PB LOGIC --- */
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

    /* ================================
   UPDATED REST TIMER WITH SOUND
================================ */
window.startRestTimer = function(seconds = 60) {
    const container = document.getElementById('timerContainer');
    const clock = document.getElementById('timerClock');
    const beep = document.getElementById('beepSound'); // Select the audio
    
    if (!container || !clock) return;

    container.style.display = 'flex';
    let timeLeft = seconds;
    
    clearInterval(restInterval);

    restInterval = setInterval(() => {
        timeLeft--;
        
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        clock.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;

        // When the timer finishes
        if (timeLeft <= 0) {
            clearInterval(restInterval);
            container.style.display = 'none';
            
            // 1. Play the sound
            if (beep) {
                beep.play().catch(e => console.log("Audio play blocked by browser."));
            }

            // 2. Vibrate
            if (window.navigator.vibrate) {
                window.navigator.vibrate([200, 100, 200]);
            }
        }
    }, 1000);
};


    const isPB = checkPB(name, weight);
    
    // Log data
    const today = todayKey();
    if (!workoutData[today]) workoutData[today] = [];
    workoutData[today].push({
        name,
        reps,
        weight,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    save('workoutData', workoutData);
    
    if (isPB) triggerPBCelebration(name, weight);

    renderWorkoutLog();
    updateChartSelector();
    renderStrengthChart();
    
    repsInput.value = "";
    if (window.navigator.vibrate) window.navigator.vibrate(20);
};

function checkPB(exerciseName, newWeight) {
    const allSessions = Object.values(workoutData).flat();
    const previousLifts = allSessions.filter(s => s.name === exerciseName);
    if (previousLifts.length === 0) return false;
    const maxWeight = Math.max(...previousLifts.map(s => s.weight || 0));
    return newWeight > maxWeight;
}

/* --- CHARTS --- */
function initWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;
    const history = JSON.parse(localStorage.getItem('weightHistory')) || [];
    const last7Days = history.slice(-7);

    const chartStatus = Chart.getChart("weightChart");
    if (chartStatus) chartStatus.destroy();

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date.split('-').slice(1).join('/')),
            datasets: [{
                label: 'Weight',
                data: last7Days.map(d => d.weight),
                borderColor: '#4dbdff',
                backgroundColor: 'rgba(77, 189, 255, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

window.renderStrengthChart = function() {
    const canvas = document.getElementById('strengthChart');
    const selectedEx = document.getElementById('chartExerciseSelector').value;
    if (!canvas || !selectedEx) return;

    let history = [];
    Object.keys(workoutData).forEach(date => {
        workoutData[date].forEach(session => {
            if (session.name === selectedEx) {
                history.push({ date, estMax: calculate1RM(session.weight, session.reps) });
            }
        });
    });

    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    const chartStatus = Chart.getChart("strengthChart");
    if (chartStatus) chartStatus.destroy();

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: history.map(h => h.date.split('-').slice(1).join('/')),
            datasets: [{
                label: 'Est. 1RM (kg)',
                data: history.map(h => h.estMax),
                borderColor: '#FFD700',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};
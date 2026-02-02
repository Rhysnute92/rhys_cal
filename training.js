import {workoutData, save, todayKey, gymDB, isTrainingDay, goals} from './state.js';

/* ================================
   TRAINING LOGIC
================================ */

export function calculate1RM(weight, reps) {
    return reps === 1
        ? weight
        : Math.round((weight / (1.0278 - (0.0278 * reps))) * 2) / 2;
}

export function addExercise({ name, sets, reps, weight }) {
    const date = todayKey();
    if (!workoutData[date]) workoutData[date] = [];

    workoutData[date].push({
        name, sets, reps, weight,
        oneRM: calculate1RM(weight, reps),
        timestamp: Date.now()
    });

    save('workoutData', workoutData);
    renderTrainingLog();
    renderCalendar();
    updateMuscleMap();
}

export function renderTrainingLog() {
    const dateInput = document.getElementById('trainingDateInput');
    const list = document.getElementById('trainingLogList');
    if (!dateInput || !list) return;

    const session = workoutData[dateInput.value] || [];

    if (!session.length) {
        list.innerHTML = `<p class="hint">No session logged.</p>`;
        return;
    }

    list.innerHTML = session.map((ex, i) => `
        <div class="card">
            <div>
                <strong>${ex.name}</strong><br>
                <small>${ex.sets}×${ex.reps} @ ${ex.weight}</small>
            </div>
            <button onclick="deleteSet('${dateInput.value}',${i})">✕</button>
        </div>
    `).join('');
}

/* ================================
   CALENDAR & ANALYTICS
================================ */

export function renderCalendar() {
    const el = document.getElementById('workoutCalendar');
    if (!el) return;

    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    el.innerHTML = Array.from({ length: days }, (_, i) => {
        const d = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
        return `<div class="cal-day ${workoutData[d] ? 'trained':''}">${i+1}</div>`;
    }).join('');
}

export function updateMuscleMap() {
    const el = document.getElementById('muscleMapContainer');
    if (!el) return;

    const totals = {};
    let totalVol = 0;

    Object.values(workoutData).flat().forEach(ex => {
        const muscle = gymDB.find(g => g.name === ex.name)?.muscle || 'Other';
        const vol = ex.sets * ex.reps * ex.weight;
        totals[muscle] = (totals[muscle] || 0) + vol;
        totalVol += vol;
    });

    el.innerHTML = Object.entries(totals).map(([m,v]) => `
        <div>
            <small>${m}</small>
            <div class="progress-bg">
                <div class="progress-fill" style="width:${(v/totalVol)*100}%"></div>
            </div>
        </div>
    `).join('');
}

export function logSet(exerciseName, weight, reps) {
    if (!workoutData[activeLogDate]) workoutData[activeLogDate] = [];

    const exerciseInfo = gymDB.find(ex => ex.name === exerciseName) || { muscle: 'Other' };

    workoutData[activeLogDate].push({
        name: exerciseName,
        muscle: exerciseInfo.muscle,
        weight,
        reps,
        timestamp: new Date().getTime()
    });

    save('workoutData', workoutData);
    renderMuscleMap();
}

export function renderMuscleMap() {
    const container = document.querySelector('.muscleMapContainer');
    if (!container) return;

    const muscles = {};
    Object.values(workoutData).flat().forEach(set => {
        const info = gymDB.find(ex => ex.name === set.name);
        const muscle = info ? info.muscle : 'Other';
        muscles[muscle] = (muscles[muscle] || 0) + 1;
    });

    container.innerHTML = Object.entries(muscles).map(([name, count]) => `
        <div class="muscle-stat">
            <span>${name}</span>
            <div class="progress-bg"><div class="progress-fill" style="width: ${count * 10}%"></div></div>
        </div>
    `).join('');
}

// --- TIMER STATE MANAGEMENT ---
let sessionInterval;
let restInterval;
let sessionStartTime;
let restTimeLeft = 0;

/**
 * SESSION TIMER LOGIC
 */
function startSessionTimer() {
    if (sessionInterval) return;
    sessionStartTime = parseInt(localStorage.getItem('activeSessionStart')) || Date.now();
    localStorage.setItem('activeSessionStart', sessionStartTime);

    document.getElementById('sessionTimerDisplay').style.display = 'block';

    sessionInterval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('sessionTimerText').innerText =
            `Session: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function finishWorkout() {
    if(!confirm("Finish workout and stop timer?")) return;
    clearInterval(sessionInterval);
    sessionInterval = null;
    localStorage.removeItem('activeSessionStart');
    document.getElementById('sessionTimerDisplay').style.display = 'none';
    completeRest(); // Close rest timer too
    alert("Workout complete! Great job.");
}

/**
 * REST TIMER LOGIC
 */
function startRestTimer(seconds = 60) {
    if (restInterval) clearInterval(restInterval);
    restTimeLeft = seconds;
    document.getElementById('restTimerDisplay').style.display = 'block';

    updateRestUI();

    restInterval = setInterval(() => {
        restTimeLeft--;
        updateRestUI();
        if (restTimeLeft <= 0) completeRest();
    }, 1000);
}

function updateRestUI() {
    const mins = Math.floor(restTimeLeft / 60);
    const secs = restTimeLeft % 60;
    document.getElementById('restTimerText').innerText = `Rest: ${mins}:${secs.toString().padStart(2, '0')}`;
}

function adjustRestTime(seconds) {
    restTimeLeft += seconds;
    if (restTimeLeft < 0) restTimeLeft = 0;
    updateRestUI();
}

function resetRestTimer() {
    startRestTimer(60);
}

function completeRest() {
    clearInterval(restInterval);
    restInterval = null;
    document.getElementById('restTimerDisplay').style.display = 'none';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
import { 
    goals, 
    foodData, 
    isTrainingDay, 
    todayKey, 
    getCurrentCalorieGoal, 
    toggleTrainingDay, 
    // auth
} from './state.js';

let calorieChart;

/* --- Initialization --- */
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initChart();
    refreshDashboard();
});

/* --- Authentication Handling --- */
window.checkAuth = function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const splash = document.getElementById('splash-screen');
    const mainContent = document.querySelector('.main-dashboard');
    const header = document.querySelector('.app-header');

    if (isLoggedIn) {
        if (splash) splash.style.display = 'none';
        header?.classList.remove('header-hidden');
        mainContent?.classList.remove('content-hidden');
    } else {
        if (splash) splash.style.display = 'flex';
        header?.classList.add('header-hidden');
        mainContent?.classList.add('content-hidden');
    }
};

/* --- UI Update Logic --- */
function refreshDashboard() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalFood = meals.reduce((sum, item) => sum + Number(item.calories || 0), 0);

    const currentGoal = getCurrentCalorieGoal();
    const remaining = Math.max(0, currentGoal - totalFood);

    // Sync Text
    const uiMap = {
        'displayGoal': currentGoal,
        'displayFood': totalFood,
        'displayRemaining': remaining,
        'day-type-text': isTrainingDay ? "Training Day" : "Rest Day"
    };

    Object.entries(uiMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    });

    // Sync Toggle
    const toggle = document.getElementById('trainingToggle');
    if (toggle) toggle.checked = isTrainingDay;

    // Update Chart
    if (calorieChart) {
        calorieChart.data.datasets[0].data = [totalFood, remaining];
        calorieChart.update();
    }
}

window.handleTrainingToggle = function() {
    toggleTrainingDay(); // From state.js
    refreshDashboard();
};

/* --- Chart.js Setup --- */
function initChart() {
    const ctx = document.getElementById('calorieChart')?.getContext('2d');
    if (!ctx) return;
    
    calorieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consumed', 'Remaining'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#2ecc71', '#f0f0f0'],
                borderWidth: 0,
                cutout: '80%',
                borderRadius: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

/* --- Global Action Handlers --- */
window.handleAuth = (type) => {
    if (type === 'login') {
        localStorage.setItem('isLoggedIn', 'true');
        window.checkAuth();
    }
};

window.openAuthModal = () => document.getElementById('authModal').classList.remove('modal-hidden');
window.closeAuthModal = () => document.getElementById('authModal').classList.add('modal-hidden');
window.addNewTile = () => document.getElementById('addTileModal').classList.remove('modal-hidden');
window.closeModal = () => document.getElementById('addTileModal').classList.add('modal-hidden');

window.saveNewTile = function() {
    const type = document.getElementById('tileType').value;
    const grid = document.getElementById('mainGrid');
    const card = document.createElement('div');
    card.className = 'card action-tile animated-fade-in';
    
    const icons = { water: '💧', sleep: '🌙', gym: '🏋️‍♂️' };
    card.innerHTML = `<div class="tile-icon">${icons[type]}</div><h4>${type}</h4>`;
    grid.appendChild(card);
    window.closeModal();
};
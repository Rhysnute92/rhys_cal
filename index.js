import { goals, foodData, isTrainingDay, todayKey, saveState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
});

window.toggleTrainingMode = function () {
    const toggle = document.getElementById('trainingToggle');
    // Important: We must update the value in state.js logic
    localStorage.setItem('isTrainingDay', toggle.checked);
    // Reload page or re-run updateUI to see changes
    location.reload();
};

function updateUI() {
    const today = todayKey();
    const meals = foodData[today] || [];
    const totalFood = meals.reduce((sum, item) => sum + Number(item.calories), 0);

    // Logic: If isTrainingDay is true, use trainCals, else use restCals
    const currentGoal = isTrainingDay ? (goals.restCals + 300) : goals.restCals;
    const remaining = Math.max(0, currentGoal - totalFood);

    if (document.getElementById('displayGoal')) document.getElementById('displayGoal').innerText = currentGoal;
    if (document.getElementById('displayFood')) document.getElementById('displayFood').innerText = totalFood;
    if (document.getElementById('displayRemaining')) document.getElementById('displayRemaining').innerText = remaining;
}

function addNewTile() {
    const tileType = document.getElementById('tileType').value;
    const mainGrid = document.getElementById('mainGrid');
    
    // Create a wrapper div for the new card
    const card = document.createElement('div');
    card.className = 'card stat-card animated-fade-in';
    
    // Define the content based on selection
    let content = '';
    
    switch(tileType) {
        case 'water':
            content = `
                <div class="tile-header"><h4>Water</h4> <span>💧</span></div>
                <div class="stat-val"><span id="waterCount">0</span> <small>ml</small></div>
                <button onclick="updateWater(250)" class="btn-text-small">+ 250ml</button>
            `;
            break;
        case 'sleep':
            content = `
                <div class="tile-header"><h4>Sleep</h4> <span>🌙</span></div>
                <div class="stat-val">0 <small>hrs</small></div>
                <div class="progress-bar"><div class="fill" style="width: 70%"></div></div>
            `;
            break;
        case 'gym':
            content = `
                <div class="tile-header"><h4>Gym</h4> <span>🏋️‍♂️</span></div>
                <div class="stat-val">Push Day</div>
                <p style="font-size: 0.7rem; color: #666;">Last: 2 days ago</p>
            `;
            break;
        default:
            content = `<div class="tile-header"><h4>New Tile</h4></div><p>Content coming soon!</p>`;
    }
    
    card.innerHTML = content;
    mainGrid.appendChild(card);
    
    // Close the modal after adding
    closeModal();
}

// Helper to close modal
function closeModal() {
    document.getElementById('addTileModal').style.display = 'none';
}
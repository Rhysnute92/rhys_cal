import { goals, saveState, updatePassword } from './state.js';

// Check if we are returning from a password reset email
window.onload = async () => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        const newPass = prompt("Please enter your new password:");
        if (newPass) {
            try {
                await updatePassword(newPass);
                alert("Password updated successfully!");
            } catch (err) {
                alert("Error: " + err.message);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load existing goals into inputs
    const g = JSON.parse(localStorage.getItem('userGoals')) || goals;
    document.getElementById('goalKcal').value = g.restCals || 1800;
    document.getElementById('goalP').value = g.protein || 200;
    document.getElementById('goalC').value = g.carbs || 145;
    document.getElementById('goalF').value = g.fats || 45;

    // 2. Initialize Tile Size
    const savedSize = localStorage.getItem('tileSize') || 160;
    document.getElementById('sizeSlider').value = savedSize;
    document.getElementById('sizeValue').innerText = `${savedSize}px`;

    // 3. Initialize Theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkBtn').innerText = "☀️ Switch to Light Mode";
    }
});

// --- Goal Management ---
window.saveGoals = function() {
    const newGoals = {
        restCals: parseInt(document.getElementById('goalKcal').value),
        trainCals: parseInt(document.getElementById('goalKcal').value) + 500, // Default buffer
        protein: parseInt(document.getElementById('goalP').value),
        carbs: parseInt(document.getElementById('goalC').value),
        fats: parseInt(document.getElementById('goalF').value)
    };

    localStorage.setItem('userGoals', JSON.stringify(newGoals));
    alert("Goals saved successfully!");
};

// --- Appearance ---
window.changeTileSize = function(val) {
    document.getElementById('sizeValue').innerText = `${val}px`;
    localStorage.setItem('tileSize', val);
    // This affects the dashboard-grid gap/min-height via CSS variables if you use them
};

window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('darkBtn').innerText = isDark ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode";
};

// --- Dashboard Management ---
window.resetTiles = function() {
    if(confirm("Reset dashboard layout to default?")) {
        localStorage.removeItem('activeTiles');
        localStorage.removeItem('customTiles');
        alert("Dashboard reset! Refreshing...");
        window.location.href = 'index.html';
    }
};

// --- Data Export (Your CSV Function) ---
window.exportDataToCSV = function() {
    const data = {
        Food: JSON.parse(localStorage.getItem('foodLogs')) || {},
        Weight: JSON.parse(localStorage.getItem('weightHistory')) || [],
        Steps: JSON.parse(localStorage.getItem('stepsLog')) || {},
        Sleep: JSON.parse(localStorage.getItem('sleepLog')) || {}
    };

    let csvContent = "data:text/csv;charset=utf-8,Category,Date,Value/Details\n";

    for (let date in data.Food) {
        data.Food[date].forEach(item => {
            csvContent += `Food,${date},"${item.name} (${item.calories}kcal)"\n`;
        });
    }

    data.Weight.forEach(entry => {
        csvContent += `Weight,${entry.date},${entry.weight}kg\n`;
    });

    for (let date in data.Steps) csvContent += `Steps,${date},${data.Steps[date]}\n`;
    for (let date in data.Sleep) csvContent += `Sleep,${date},${data.Sleep[date]}hrs\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fitness_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.confirmWipeData = function() {
    // First Confirmation
    const firstCheck = confirm("Are you sure you want to delete ALL data? This includes food logs, weight history, and settings.");
    
    if (firstCheck) {
        // Second Confirmation with a requirement
        const secondCheck = prompt("To confirm, please type 'DELETE' in the box below:");
        
        if (secondCheck === "DELETE") {
            localStorage.clear();
            alert("All data has been erased. The app will now restart.");
            window.location.href = 'index.html';
        } else {
            alert("Confirmation failed. Data was not deleted.");
        }
    }
};

window.exportDataToCSV = function() {
    const history = JSON.parse(localStorage.getItem('customTilesHistory')) || {};
    let csvContent = "data:text/csv;charset=utf-8,Category,Date,Value\n";

    // Add Custom Trackers to CSV
    for (const date in history) {
        for (const trackerName in history[date]) {
            csvContent += `Tracker - ${trackerName},${date},${history[date][trackerName]}\n`;
        }
    }

    // ... append your existing Food and Weight logic ...
};
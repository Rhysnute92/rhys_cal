/* log.js */
import { foodData, todayKey, saveState } from './state.js';

async function fetchFoodByBarcode(code) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await response.json();

        if (data.status === 1) {
            const p = data.product;
            const scannedItem = {
                name: p.product_name || "Unknown",
                protein: p.nutriments.proteins_100g || 0,
                carbs: p.nutriments.carbohydrates_100g || 0,
                fats: p.nutriments.fat_100g || 0,
                calories: Math.round(p.nutriments['energy-kcal_100g'] || 0)
            };

            // TRIGGER THE FORM UPDATE
            fillManualForm(scannedItem);

            // Haptic Feedback for success
            if (window.navigator.vibrate) window.navigator.vibrate(200);
        }
    } catch (err) {
        console.error("Scanner Error:", err);
    }
}

// This listens for a successful barcode scan
Quagga.onDetected(function(data) {
    const code = data.codeResult.code;

    // 1. Give haptic feedback (vibrate)
    if (window.navigator.vibrate) window.navigator.vibrate(200);

    // 2. Turn off the camera
    stopScanner();

    // 3. Search for the product
    fetchFoodByBarcode(code);
});

/* --- handleSearch Logic --- */
window.handleSearch = function(event) {
    const query = event.target.value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    // 1. Clear results if the search bar is empty
    if (!query) {
        resultsContainer.innerHTML = '';
        return;
    }

    // 2. Filter the database (assuming gymDB or a foodDB is imported)
    // Here we filter by name or muscle/category
    const matches = gymDB.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.muscle && item.muscle.toLowerCase().includes(query))
    );

    // 3. Generate the HTML for the dropdown
    resultsContainer.innerHTML = matches.map(item => `
        <div class="search-item" onclick="selectSearchItem('${item.name}')">
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.muscle || 'Food'}</small>
            </div>
            <span class="plus-icon">+</span>
        </div>
    `).join('');
};

window.selectSearchItem = function(name) {
    // Logic to fill the form with the selected item
    document.getElementById('foodSearch').value = name;
    document.getElementById('searchResults').innerHTML = ''; // Clear results

    // If it's a known food with macros, you'd call fillManualForm(item) here
};

export function addFood(item) {
    const today = todayKey();
    if (!foodData[today]) foodData[today] = [];

    foodData[today].push({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        time: new Date().toLocaleTimeString()
    });

    saveState();
    renderFoodLog();
}

function renderFoodLog() {
    const list = document.getElementById('activeMealList');
    const today = todayKey();
    const meals = foodData[today] || [];

    list.innerHTML = meals.map(m => `
        <div class="meal-item">
            <div><strong>${m.name}</strong><br><small>${m.calories} kcal</small></div>
            <div>P:${m.protein} C:${m.carbs} F:${m.fats}</div>
        </div>
    `).join('');
}

/* --- Barcode Scanner Logic --- */

window.startScanner = function() {
    document.getElementById('scannerOverlay').style.display = 'block';

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {facingMode: "environment"}
        },
        decoder: {readers: ["ean_reader", "ean_8_reader", "upc_reader"]}
    }, function (err) {
        if (err) {
            console.error(err);
            return;
        }
        Quagga.start();
    });

    window.stopScanner = function () {
        let Quagga;
        Quagga.stop();
        document.getElementById('scannerOverlay').style.display = 'none';
    };

    async function fetchProductByBarcode(barcode) {
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();

            if (data.status === 1) {
                const product = data.product;
                const newItem = {
                    name: product.product_name || "Unknown Product",
                    calories: Math.round(product.nutriments['energy-kcal_100g'] || 0),
                    protein: product.nutriments.proteins_100g || 0,
                    carbs: product.nutriments.carbohydrates_100g || 0,
                    fats: product.nutriments.fat_100g || 0
                };

                // Pass the data to the form
                fillManualForm(newItem);
            } else {
                alert("Product not found. Try manual entry.");
            }
        } catch (error) {
            console.error("API Error:", error);
        }
    }

    function fillManualForm(item) {
        document.getElementById('foodSearch').value = item.name;
        // Assuming you have input IDs for these:
        if (document.getElementById('manualP')) document.getElementById('manualP').value = item.protein;
        if (document.getElementById('manualC')) document.getElementById('manualC').value = item.carbs;
        if (document.getElementById('manualF')) document.getElementById('manualF').value = item.fats;
        if (document.getElementById('manualCal')) document.getElementById('manualCal').value = item.calories;
    }

    function hapticFeedback() {
        if (window.navigator.vibrate) window.navigator.vibrate(200);
    }
}
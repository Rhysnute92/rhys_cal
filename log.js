import { state, saveState, todayKey } from "./state.js";

/* -------------------------------------------------------
 * 1. UI CACHE (populated after DOMContentLoaded)
 * -----------------------------------------------------*/
let ui = {};

/* -------------------------------------------------------
 * 2. HELPERS
 * -----------------------------------------------------*/
const getActiveDate = () =>
    ui.datePicker?.value || todayKey();

const resetInputs = () => {
    ["foodName", "calories", "protein", "carbs", "fat"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
};

/* -------------------------------------------------------
 * 3. BARCODE SCANNER
 * -----------------------------------------------------*/
window.startBarcodeScanner = function () {
    const overlay = document.getElementById("cameraOverlay");
    if (!overlay) return;

    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    Quagga.init(
        {
            inputStream: {
                type: "LiveStream",
                target: document.querySelector("#interactive"),
                constraints: { facingMode: "environment" }
            },
            decoder: {
                readers: ["ean_reader", "upc_reader", "ean_8_reader"]
            }
        },
        err => {
            if (err) {
                console.error("Quagga Init Error:", err);
                return;
            }
            Quagga.start();
        }
    );

    Quagga.onDetected(res => {
        window.stopScanner();
        lookupBarcode(res.codeResult.code);
    });
};

window.stopScanner = function () {
    Quagga.stop();
    const overlay = document.getElementById("cameraOverlay");
    if (overlay) overlay.classList.add("hidden");
    document.body.style.overflow = "auto";
};

async function lookupBarcode(code) {
    try {
        const res = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${code}.json`
        );
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;
            document.getElementById("foodName").value =
                p.product_name || "";
            document.getElementById("calories").value =
                p.nutriments["energy-kcal_100g"] || 0;
            document.getElementById("protein").value =
                p.nutriments.proteins_100g || 0;
            document.getElementById("carbs").value =
                p.nutriments.carbohydrates_100g || 0;
            document.getElementById("fat").value =
                p.nutriments.fat_100g || 0;
        }
    } catch (e) {
        console.error("Lookup failed", e);
    }
}

/* -------------------------------------------------------
 * 4. ENTRY MANAGEMENT
 * -----------------------------------------------------*/
window.saveEntry = function () {
    const name = document.getElementById("foodName").value;
    const cals = parseInt(document.getElementById("calories").value) || 0;
    const p = parseInt(document.getElementById("protein").value) || 0;
    const c = parseInt(document.getElementById("carbs").value) || 0;
    const f = parseInt(document.getElementById("fat").value) || 0;

    if (!name || cals <= 0) {
        alert("Please enter a name and calories.");
        return;
    }

    const dateKey = getActiveDate();
    if (!state.foodLogs[dateKey]) state.foodLogs[dateKey] = [];

    state.foodLogs[dateKey].push({
        id: Date.now(),
        name,
        calories: cals,
        protein: p,
        carbs: c,
        fat: f
    });

    saveState();
    resetInputs();
    render();
};

window.deleteEntry = function (id) {
    const dateKey = getActiveDate();
    state.foodLogs[dateKey] = state.foodLogs[dateKey].filter(
        item => item.id !== id
    );
    saveState();
    render();
};

/* -------------------------------------------------------
 * 5. PROGRESS RING
 * -----------------------------------------------------*/
function updateProgressRing(current, goal = state.dailyGoal || 1800) {
    const circle = document.querySelector(".progress-ring__circle");
    if (!circle) return;

    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    const percent = Math.min((current / goal) * 100, 100);
    const offset = circumference - (percent / 100) * circumference;

    circle.style.strokeDashoffset = offset;
}

/* -------------------------------------------------------
 * 6. RENDER
 * -----------------------------------------------------*/
function render() {
    const dateKey = getActiveDate();
    const entries = state.foodLogs[dateKey] || [];
    const goals = state.macroGoals || {
        protein: 200,
        carbs: 150,
        fat: 50
    };

    const totals = { cal: 0, p: 0, c: 0, f: 0 };

    /* --- LIST --- */
    if (ui.foodList) {
        ui.foodList.innerHTML = entries.length
            ? ""
            : `<p class="text-muted">No food logged yet.</p>`;

        entries.forEach(item => {
            totals.cal += item.calories;
            totals.p += item.protein || 0;
            totals.c += item.carbs || 0;
            totals.f += item.fat || 0;

            const div = document.createElement("div");
            div.className = "food-item";
            div.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${item.calories} kcal</small>
                </div>
                <button onclick="deleteEntry(${item.id})" class="btn-delete">✕</button>
            `;
            ui.foodList.appendChild(div);
        });
    }

    /* --- TOTAL CALS --- */
    if (ui.dayTotalText) ui.dayTotalText.innerText = `${totals.cal} kcal`;

    updateProgressRing(totals.cal);

    /* --- SUMMARY TABLE --- */
    const summaryBody = document.getElementById("summary-body");
    if (summaryBody) {
        const rows = [
            { label: "Protein", goal: goals.protein, actual: totals.p },
            { label: "Carbs", goal: goals.carbs, actual: totals.c },
            { label: "Fat", goal: goals.fat, actual: totals.f }
        ];

        summaryBody.innerHTML = rows
            .map(r => {
                const left = Math.max(r.goal - r.actual, 0);
                return `
                    <tr>
                        <td><strong>${r.label}</strong></td>
                        <td>${r.goal}g</td>
                        <td>${r.actual}g</td>
                        <td class="${left === 0 ? "text-success" : ""}">${left}g</td>
                    </tr>
                `;
            })
            .join("");
    }
}

/* -------------------------------------------------------
 * 7. GOALS
 * -----------------------------------------------------*/
window.toggleGoals = function () {
    const editor = document.getElementById("goals-editor");
    if (editor) editor.classList.toggle("hidden");
};

window.saveGoals = function () {
    const p = parseInt(document.getElementById("goalP").value) || 200;
    const c = parseInt(document.getElementById("goalC").value) || 150;
    const f = parseInt(document.getElementById("goalF").value) || 50;

    const newCalGoal = p * 4 + c * 4 + f * 9;

    state.dailyGoal = newCalGoal;
    state.macroGoals = { protein: p, carbs: c, fat: f };

    saveState();
    window.toggleGoals();
    render();

    alert(`Goal updated to ${newCalGoal} kcal!`);
};

/* -------------------------------------------------------
 * 8. QUICK ADD
 * -----------------------------------------------------*/
window.quickAdd = function (name, p, c, f) {
    const calories = p * 4 + c * 4 + f * 9;

    const dateKey = getActiveDate();
    if (!state.foodLogs[dateKey]) state.foodLogs[dateKey] = [];

    state.foodLogs[dateKey].push({
        id: Date.now(),
        name,
        calories,
        protein: p,
        carbs: c,
        fat: f
    });

    saveState();
    render();
};

/* -------------------------------------------------------
 * 9. COPY FROM YESTERDAY
 * -----------------------------------------------------*/
window.copyFromYesterday = function () {
    const currentDate = getActiveDate();
    const currentItems = state.foodLogs[currentDate] || [];

    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    const yesterdayKey = d.toISOString().split("T")[0];

    const yesterdayItems = state.foodLogs[yesterdayKey] || [];

    if (yesterdayItems.length === 0) {
        alert("No entries found for " + yesterdayKey);
        return;
    }

    if (currentItems.length > 0) {
        if (!confirm("Add yesterday's items to today?")) return;
    }

    const cloned = yesterdayItems.map(item => ({
        ...item,
        id: Date.now() + Math.random()
    }));

    state.foodLogs[currentDate] = [...currentItems, ...cloned];
    saveState();
    render();

    alert(`Copied ${cloned.length} items from ${yesterdayKey}`);
};

/* -------------------------------------------------------
 * 10. INIT
 * -----------------------------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    ui = {
        datePicker: document.getElementById("datePicker"),
        foodList: document.getElementById("foodList"),
        dayTotalText: document.getElementById("dayTotal")
    };

    if (ui.datePicker) {
        ui.datePicker.value = todayKey();
        ui.datePicker.addEventListener("change", render);
    }

    /* --- Macro auto-calculation --- */
    ["protein", "carbs", "fat"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", () => {
            const p = parseInt(document.getElementById("protein").value) || 0;
            const c = parseInt(document.getElementById("carbs").value) || 0;
            const f = parseInt(document.getElementById("fat").value) || 0;

            document.getElementById("calories").value =
                p * 4 + c * 4 + f * 9;
        });
    });

    render();
});

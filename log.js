import {
    foodData, goals, activeLogDate,
    save, todayKey
} from './state.js';

/* ================================
   FOOD LOG INITIALIZATION
================================ */

export function initFoodPage() {
    renderDateStrip();
    renderFoodLog();
    renderMacroTargets();
    renderFrequentFoods();
}

/* ================================
   DATE STRIP
================================ */

export function renderDateStrip() {
    const strip = document.getElementById('dateStrip');
    if (!strip) return;

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return d;
    });

    strip.innerHTML = days.map(d => {
        const key = d.toISOString().split('T')[0];
        const selected = key === activeLogDate;

        return `
            <div onclick="selectLogDate('${key}')"
                 class="date-pill ${selected ? 'active' : ''}">
                <small>${d.toLocaleDateString(undefined,{weekday:'short'})}</small>
                <strong>${d.getDate()}</strong>
            </div>
        `;
    }).join('');
}

export function selectLogDate(date) {
    window.activeLogDate = date;
    renderDateStrip();
    renderFoodLog();
    renderMacroTargets();
}

/* ================================
   FOOD CRUD
================================ */

export function addFoodManually({ name, calories, protein, fat, carbs }) {
    if (!name || calories <= 0) return alert("Invalid food entry");

    if (!foodData[activeLogDate]) foodData[activeLogDate] = [];

    foodData[activeLogDate].push({
        name,
        calories,
        protein,
        fat,
        carbs,
        time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    });

    save('foodData', foodData);
    renderFoodLog();
    renderMacroTargets();
}

export function deleteMeal(index) {
    foodData[activeLogDate].splice(index, 1);
    save('foodData', foodData);
    renderFoodLog();
    renderMacroTargets();
}

/* ================================
   MACROS
================================ */

export function renderMacroTargets() {
    const el = document.getElementById('macroTargetDisplay');
    if (!el) return;

    const meals = foodData[activeLogDate] || [];

    const totals = meals.reduce((a,m)=>({
        p: a.p + (m.protein||0),
        f: a.f + (m.fat||0),
        c: a.c + (m.carbs||0)
    }),{p:0,f:0,c:0});

    el.innerHTML = [
        ['P', totals.p, goals.protein],
        ['F', totals.f, goals.fat],
        ['C', totals.c, goals.carbs]
    ].map(([k,v,g])=>`
        <div>
            <strong>${k}</strong>
            <div>${v} / ${g}g</div>
            <div class="progress-bg">
                <div class="progress-fill" style="width:${Math.min((v/g)*100,100)}%"></div>
            </div>
        </div>
    `).join('');
}

/* ================================
   FREQUENT FOODS
================================ */

export function renderFrequentFoods() {
    const el = document.getElementById('frequentFoodsList');
    if (!el) return;

    const counts = {};
    Object.values(foodData).flat().forEach(f => {
        counts[f.name] = (counts[f.name] || 0) + 1;
    });

    const top = Object.keys(counts)
        .sort((a,b)=>counts[b]-counts[a])
        .slice(0,5);

    el.innerHTML = top.length
        ? top.map(name=>`
            <button onclick="quickAddFood('${name}')">+ ${name}</button>
        `).join('')
        : `<p class="hint">No frequent foods yet</p>`;
}

export function quickAddFood(name) {
    const item = Object.values(foodData).flat().reverse()
        .find(f=>f.name===name);
    if (!item) return;

    addFoodManually(item);
}

/* ================================
   MFP IMPORT + DEDUPE
================================ */

export function cleanDuplicateFoodEntries() {
    let removed = 0;

    Object.keys(foodData).forEach(date => {
        const unique = [];
        foodData[date].forEach(e => {
            if (!unique.some(u =>
                u.name===e.name &&
                u.calories===e.calories &&
                u.protein===e.protein &&
                u.fat===e.fat &&
                u.carbs===e.carbs
            )) unique.push(e);
        });
        removed += foodData[date].length - unique.length;
        foodData[date] = unique;
    });

    if (removed) save('foodData', foodData);
}

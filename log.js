import { foodData, saveState, todayKey } from "./state";

Quagga.offDetected();
Quagga.onDetected(result => {
    if (!scanning) return;
    scanning = false;
    stopScanner();
    lookupBarcode(result.codeResult.code);
});

// ---------- STORAGE ----------
const STORAGE_KEY = "foodEntries";
const GOAL_KEY = "macroGoals";

let editingIndex = null;

// ---------- UTIL ----------
const today = () => new Date().toISOString().split("T")[0];

const getEntries = () => foodData[todayKey()] || [];
const saveEntries = data => {
    foodData[todayKey()] = data;
    saveState();
};

document.getElementById('scanMealBtn').addEventListener('click', function() {
    // 1. Logic to open camera
    alert("Opening camera for AI meal recognition...");
    
    // In a real app, you'd use:
    // const imageCapture = new ImageCapture(videoTrack);
    
    // 2. Placeholder for API call
    console.log("Identifying food from image...");
});

const getGoals = () => JSON.parse(localStorage.getItem(GOAL_KEY)) || {protein:200, carbs:145, fat:45};

// ---------- CLOUD SYNC (Firebase ready) ----------
function syncCloud(data){
    // INSERT Firebase or Supabase sync here
}

// ---------- DATE ----------
datePicker.value = today();
datePicker.onchange = render;

// ---------- SCANNER ----------
let scanning=false;

window.startCamera=()=>{
    document.body.classList.add("scanning");    
    scannerOverlay.style.display="block";

Quagga.init({
    inputStream: {
        type: "LiveStream",
        target: document.querySelector("#interactive"),
        willReadFrequently: true,
        constraints: {
            facingMode: "environment"
        }
    },
    locator: {
        patchSize: "medium",
        halfSample: true
    },
    numOfWorkers: navigator.hardwareConcurrency || 4,
    frequency: 10,
    decoder: {
        readers: ["ean_reader", "ean_8_reader", "upc_reader"]
    },
    locate: true
}, err => {
    if (!err) {
        Quagga.start();
        scanning = true;
    }
});


 Quagga.onDetected(async res=>{
  stopScanner();
  lookupBarcode(res.codeResult.code);
 });
};

Quagga.offDetected();   // prevents stacking listeners
Quagga.onDetected(result => {
    stopScanner();
    lookupBarcode(result.codeResult.code);
});

window.stopScanner=()=>{
    document.body.classList.remove("scanning");
 scannerOverlay.style.display="none";

 if(scanning) {
    Quagga.stop();
    scanning = false;
};
}

// ---------- BARCODE LOOKUP ----------
async function lookupBarcode(code){
 const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
 const data = await res.json();

 if(data.status===1){
  const p=data.product;
  foodName.value=p.product_name || "";
  calories.value=p.nutriments["energy-kcal_100g"] || 0;
  protein.value=p.nutriments.proteins_100g || 0;
  carbs.value=p.nutriments.carbohydrates_100g || 0;
  fat.value=p.nutriments.fat_100g || 0;
 }

 entryForm.classList.remove("hidden");
}

// ---------- SAVE ENTRY ----------
window.saveEntry=()=>{
 const entry={
  name:foodName.value,
  calories:+calories.value,
  protein:+protein.value,
  carbs:+carbs.value,
  fat:+fat.value,
  meal:mealType.value,
  date:datePicker.value
 };

 let entries=getEntries();

 if(editingIndex!==null){
  entries[editingIndex]=entry;
  editingIndex=null;
 }else{
  entries.push(entry);
 }

 saveEntries(entries);
 entryForm.classList.add("hidden");
 render();
};

// ---------- EDIT / DELETE ----------
function editEntry(i){
 const e=getEntries()[i];
 editingIndex=i;

 foodName.value=e.name;
 calories.value=e.calories;
 protein.value=e.protein;
 carbs.value=e.carbs;
 fat.value=e.fat;
 mealType.value=e.meal;

 entryForm.classList.remove("hidden");
}

function deleteEntry(i){
 let entries=getEntries();
 entries.splice(i,1);
 saveEntries(entries);
 render();
}

// ---------- GOALS ----------
window.saveGoals=()=>{
 const goals={
  protein:+goalP.value,
  carbs:+goalC.value,
  fat:+goalF.value
 };
 localStorage.setItem(GOAL_KEY,JSON.stringify(goals));
 render();
};

// ---------- RENDER ----------
let pieChart, weekChart;

function render(){
 const date=datePicker.value;
 const entries=getEntries().filter(e=>e.date===date);
 logList.innerHTML="";

 let totals={cal:0,p:0,c:0,f:0};

 entries.forEach((e,i)=>{
  totals.cal+=e.calories;
  totals.p+=e.protein;
  totals.c+=e.carbs;
  totals.f+=e.fat;

  const div=document.createElement("div");
  div.className="log-item";
  div.innerHTML=`
   <strong>${e.name}</strong>
   <small>${e.calories} kcal</small>
   <button onclick="editEntry(${i})">✏️</button>
   <button onclick="deleteEntry(${i})">🗑</button>
  `;
  logList.appendChild(div);
 });

 updateMacroDisplay(totals);
 drawPie(totals);
 drawWeekly();
}

// ---------- MACROS ----------
function updateMacroDisplay(totals) {
    const goals = getGoals();

    if (!goals) return;

    const remainP = Math.max(goals.protein - totals.p, 0);
    const remainC = Math.max(goals.carbs - totals.c, 0);
    const remainF = Math.max(goals.fat - totals.f, 0);

    document.getElementById("pConsumed").textContent = totals.p.toFixed(0) + "g";
    document.getElementById("cConsumed").textContent = totals.c.toFixed(0) + "g";
    document.getElementById("fConsumed").textContent = totals.f.toFixed(0) + "g";

    document.getElementById("pRemaining").textContent = remainP + "g left";
    document.getElementById("cRemaining").textContent = remainC + "g left";
    document.getElementById("fRemaining").textContent = remainF + "g left";
}

// ---------- PIE CHART ----------
function drawPie(t){
 if(pieChart) pieChart.destroy();

 pieChart=new Chart(macroPie,{
  type:"pie",
  data:{
   labels:["Protein","Carbs","Fat"],
   datasets:[{data:[t.p,t.c,t.f]}]
  }
 });
}

// ---------- WEEKLY ----------
function drawWeekly(){
 const entries=getEntries();
 const days=[];
 const values=[];

 for(let i=6;i>=0;i--){
  const d=new Date();
  d.setDate(d.getDate()-i);
  const ds=d.toISOString().split("T")[0];

  const total=entries
   .filter(e=>e.date===ds)
   .reduce((s,e)=>s+e.calories,0);

  days.push(d.getDate());
  values.push(total);
 }

 if(weekChart) weekChart.destroy();

 weekChart=new Chart(weeklyChart,{
  type:"bar",
  data:{labels:days,datasets:[{data:values}]}
 });
}

// ---------- PWA INSTALL ----------
if("serviceWorker" in navigator){
 navigator.serviceWorker.register("sw.js");
}

// ---------- INIT ----------
render();

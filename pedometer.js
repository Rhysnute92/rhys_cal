import { state } from './state.js';

let lastAcceleration = { x: 0, y: 0, z: 0 };
let stepCount = 0;
const threshold = 12; // Adjust this sensitivity (higher = harder to trigger)

export function startPedometer() {
    if (!window.DeviceMotionEvent) {
        alert("Pedometer not supported on this device/browser.");
        return;
    }

    window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;

        // Calculate the magnitude of the movement
        const deltaX = Math.abs(lastAcceleration.x - acc.x);
        const deltaY = Math.abs(lastAcceleration.y - acc.y);
        const deltaZ = Math.abs(lastAcceleration.z - acc.z);

        // If movement exceeds threshold, count a step
        if ((deltaX + deltaY + deltaZ) > threshold) {
            stepCount++;
            updateStepUI(stepCount);
        }

        lastAcceleration = { x: acc.x, y: acc.y, z: acc.z };
    });
}

function updateStepUI(count) {
    const stepDisplay = document.getElementById('step-count'); // Ensure your HTML has this ID
    if (stepDisplay) {
        stepDisplay.innerText = count;
        
        // Update global state and save
        state.steps = count;
        localStorage.setItem('fitness_state', JSON.stringify(state));
    }
}

// Crucial: Expose to the button in your HTML
window.startPedometer = startPedometer;

export { initPedonmeter };
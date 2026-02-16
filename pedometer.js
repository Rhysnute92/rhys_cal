export function initPedometer(onStepDetected) {
    if ('Accelerometer' in window) {
        try {
            const sensor = new Accelerometer({ frequency: 60 });
            let lastMagnitude = 0;
            let stepThreshold = 12; // Sensitivity: Adjust based on testing

            sensor.addEventListener('reading', () => {
                // Calculate total movement magnitude
                const magnitude = Math.sqrt(sensor.x ** 2 + sensor.y ** 2 + sensor.z ** 2);
                const delta = magnitude - lastMagnitude;

                // Detect a "spike" in movement typical of a footfall
                if (delta > stepThreshold) {
                    onStepDetected();
                }
                lastMagnitude = magnitude;
            });

            sensor.start();
        } catch (err) {
            console.error("Step counting not supported on this device.");
        }
    } else {
        console.log("Accelerometer API not found.");
    }
}

export function startPedometer(onStep) {
    if ('Accelerometer' in window) {
        // 60Hz frequency for high accuracy
        const sensor = new Accelerometer({ frequency: 60 });
        let lastMag = 0;
        const threshold = 12.5; // "Pro" sensitivity - adjust based on testing

        sensor.addEventListener('reading', () => {
            // Calculate Vector Magnitude: sqrt(x^2 + y^2 + z^2)
            const magnitude = Math.sqrt(sensor.x**2 + sensor.y**2 + sensor.z**2);
            const delta = magnitude - lastMag;

            // Detect the "spike" of a footfall
            if (delta > threshold) {
                onStep();
            }
            lastMag = magnitude;
        });

        sensor.start();
    } else {
        console.warn("Device does not support hardware step counting.");
    }
}
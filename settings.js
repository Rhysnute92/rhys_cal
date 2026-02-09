window.exportDataToCSV = function() {
    // Collect all relevant logs
    const data = {
        Food: JSON.parse(localStorage.getItem('foodHistory')) || {},
        Weight: JSON.parse(localStorage.getItem('weightHistory')) || [],
        Steps: JSON.parse(localStorage.getItem('stepsLog')) || {},
        Sleep: JSON.parse(localStorage.getItem('sleepLog')) || {}
    };

    let csvContent = "data:text/csv;charset=utf-8,Category,Date,Value/Details\n";

    // Format Food Log
    for (let date in data.Food) {
        data.Food[date].forEach(item => {
            csvContent += `Food,${date},"${item.name} (${item.calories}kcal)"\n`;
        });
    }

    // Format Weight
    data.Weight.forEach(entry => {
        csvContent += `Weight,${entry.date},${entry.weight}kg\n`;
    });

    // Format Steps & Sleep
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
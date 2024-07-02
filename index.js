let equityCurveChart;

const infoDialog = document.getElementById("infoDialog");
const disclaimerDialog = document.getElementById("disclaimerDialog");
const infoBtn = document.getElementById("infoButton");
const disclaimerBtn = document.getElementById("disclaimerButton");
const closeButtons = document.querySelectorAll(".close-dialog");

infoBtn.addEventListener('click', () => {
    infoDialog.showModal();
});

disclaimerBtn.addEventListener('click', () => {
    disclaimerDialog.showModal();
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        button.closest('dialog').close();
    });
});

// Close the dialog if clicked outside
[infoDialog, disclaimerDialog].forEach(dialog => {
    dialog.addEventListener('click', (e) => {
        const dialogDimensions = dialog.getBoundingClientRect();
        if (
            e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom
        ) {
            dialog.close();
        }
    });
});

const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

function toggleTheme() {
    if (document.body.getAttribute("data-theme") === "dark") {
        document.body.setAttribute("data-theme", "light");
    } else {
        document.body.setAttribute("data-theme", "dark");
    }
}

themeToggle.addEventListener("click", toggleTheme);

// Set initial theme based on user's preference
if (prefersDarkScheme.matches) {
    document.body.setAttribute("data-theme", "dark");
} else {
    document.body.setAttribute("data-theme", "light");
}
    

document.getElementById('rorForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const loadingBar = document.getElementById('loading-bar');
    const loadingBarProgress = loadingBar.querySelector('.loading-bar-progress');
    
    loadingBar.classList.remove('hidden');
    loadingBarProgress.style.width = '0%';
    
    const accountBalance = parseFloat(document.getElementById('accountBalance').value);
    const riskPerTrade = parseFloat(document.getElementById('riskPerTrade').value) / 100;
    const rewardPerTrade = parseFloat(document.getElementById('rewardPerTrade').value) / 100;
    const winRate = parseFloat(document.getElementById('winRate').value) / 100;
    const numberOfTrades = parseInt(document.getElementById('numberOfTrades').value);

    await new Promise(resolve => setTimeout(resolve, 500));
    loadingBarProgress.style.width = '33%';

    const riskResults = calculateRiskOfRuin(accountBalance, riskPerTrade, rewardPerTrade, winRate, numberOfTrades);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    loadingBarProgress.style.width = '66%';

    const equityCurves = simulateMultipleEquityCurves(accountBalance, riskPerTrade, rewardPerTrade, winRate, numberOfTrades, 3);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    loadingBarProgress.style.width = '100%';

    updateResultTable(riskResults);
    updateEquityCurveChart(equityCurves);

    await new Promise(resolve => setTimeout(resolve, 300));
    loadingBar.classList.add('hidden');

    document.getElementById('result').classList.remove('hidden');
    document.getElementById('result').classList.add('fade-in');
});

function calculateRiskOfRuin(initialBalance, riskPerTrade, rewardPerTrade, winRate, numberOfTrades) {
    const simulations = 100000;
    let ruinCount = 0;
    let drawdown30Count = 0;
    let drawdown50Count = 0;
    let minBalance = initialBalance;
    let totalFinalBalance = 0;

    const ruinThreshold = initialBalance * 0.01;

    for (let i = 0; i < simulations; i++) {
        let balance = initialBalance;
        let maxDrawdown = 0;
        
        for (let trade = 0; trade < numberOfTrades; trade++) {
            if (Math.random() < winRate) {
                balance += balance * rewardPerTrade;
            } else {
                balance -= balance * riskPerTrade;
            }
            
            if (balance <= ruinThreshold) {
                ruinCount++;
                break;
            }
            
            let drawdown = (initialBalance - balance) / initialBalance;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
        
        if (maxDrawdown >= 0.3) drawdown30Count++;
        if (maxDrawdown >= 0.5) drawdown50Count++;
        
        minBalance = Math.min(minBalance, balance);
        totalFinalBalance += balance;
    }


    return {
        strictRiskOfRuin: (ruinCount / simulations) * 100,
        riskOf30PercentDrawdown: (drawdown30Count / simulations) * 100,
        riskOf50PercentDrawdown: (drawdown50Count / simulations) * 100,
        minBalanceReached: minBalance,
        averageFinalBalance: totalFinalBalance / simulations
    };
}

function updateResultTable(results) {
    const tableBody = document.querySelector('#resultTable tbody');
    tableBody.innerHTML = '';

    const rows = [
        ['Strict Risk of Ruin', results.strictRiskOfRuin.toFixed(4) + '%'],
        ['Risk of 30% Drawdown', results.riskOf30PercentDrawdown.toFixed(2) + '%'],
        ['Risk of 50% Drawdown', results.riskOf50PercentDrawdown.toFixed(2) + '%'],
        ['Minimum Balance Reached', '$' + results.minBalanceReached.toFixed(2)],
        ['Average Final Balance', '$' + results.averageFinalBalance.toFixed(2)]
    ];

    rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, index) => {
            const td = document.createElement('td');
            td.textContent = cell;
            if (index === 0) {
                td.setAttribute('data-label', 'Metric');
            } else {
                td.setAttribute('data-label', 'Value');
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

function simulateMultipleEquityCurves(initialBalance, riskPerTrade, rewardPerTrade, winRate, numberOfTrades, simulations = 3) {
    let equityCurves = [];
    
    for (let sim = 0; sim < simulations; sim++) {
        let balance = initialBalance;
        const equityCurve = [initialBalance];

        for (let trade = 0; trade < numberOfTrades; trade++) {
            if (Math.random() < winRate) {
                balance += balance * rewardPerTrade;
            } else {
                balance -= balance * riskPerTrade;
            }
            equityCurve.push(balance);
        }
        
        equityCurves.push(equityCurve);
    }

    return equityCurves;
}

function updateEquityCurveChart(equityCurves) {
    const ctx = document.getElementById('equityCurveChart').getContext('2d');
    
    if (equityCurveChart) {
        equityCurveChart.destroy();
    }

    const colors = [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
    ];

    const datasets = equityCurves.map((curve, index) => ({
        label: `Simulation ${index + 1}`,
        data: curve,
        borderColor: colors[index],
        backgroundColor: 'transparent',
        borderWidth: 1,
        tension: 0.1,
        pointRadius: 0
    }));

    const isDarkMode = document.body.getAttribute("data-theme") === "dark";
    const textColor = isDarkMode ? '#e2e8f0' : '#2d3748';

    equityCurveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: equityCurves[0].length }, (_, i) => i),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Trades',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Account Balance',
                        color: textColor
                    },
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Equity Curve Simulations',
                    color: textColor
                },
                legend: {
                    display: true,
                    labels: {
                        color: textColor
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}
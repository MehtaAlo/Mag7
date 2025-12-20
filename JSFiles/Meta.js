// --- CONFIGURATION ---
// !!! IMPORTANT: Get your free key from Alpha Vantage and paste it here
const API_KEY = "";
const SYMBOL = "META";

// --- Mock static-but-random fundamentals (generated once per page load) ---
const mockFundamentals = {
    peRatio: (25 + Math.random() * 10).toFixed(1),                 // Meta-like placeholder
    marketCap: Math.floor(900000000000 + Math.random() * 100000000000), // ~$900B–$1T
    fiftyTwoWeekHighMultiplier: 1.10 + Math.random() * 0.1
};

// A simple formatter for large numbers (e.g., 123456789 becomes 123.5M)
function formatLargeNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    return num.toLocaleString();
}

let chart = null;

// 1. Fetches real-time price and key daily stats (Alpha Vantage Quote)
async function getMETAQuote() {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${SYMBOL}&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Alpha Vantage Quote API request failed');

        const data = await response.json();
        const quote = data['Global Quote'];

        if (!quote || Object.keys(quote).length === 0) {
            document.getElementById("price").textContent = "API Error/No Data";
            console.error("Alpha Vantage returned no quote data:", data);
            return;
        }

        const price = parseFloat(quote['05. price']);
        const high = parseFloat(quote['03. high']);
        const low = parseFloat(quote['04. low']);
        const volume = parseInt(quote['06. volume']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

        const peRatio = mockFundamentals.peRatio;
        const marketCap = formatLargeNumber(mockFundamentals.marketCap);
        const fiftyTwoWeekHigh = "$" + (price * mockFundamentals.fiftyTwoWeekHighMultiplier).toFixed(2);

        document.getElementById("price").textContent = "$" + price.toFixed(2);

        const changeElement = document.getElementById("change");
        if (change >= 0) {
            changeElement.style.color = "#00ff6a";
            changeElement.textContent = "+" + change.toFixed(2) + " (+" + changePercent.toFixed(2) + "%)";
        } else {
            changeElement.style.color = "#ff4f4f";
            changeElement.textContent = change.toFixed(2) + " (" + changePercent.toFixed(2) + "%)";
        }

        document.getElementById("dayHigh").textContent = "$" + high.toFixed(2);
        document.getElementById("dayLow").textContent = "$" + low.toFixed(2);
        document.getElementById("volume").textContent = formatLargeNumber(volume);
        document.getElementById("peRatio").textContent = peRatio;
        document.getElementById("marketCap").textContent = marketCap;
        document.getElementById("fiftyTwoWeekHigh").textContent = fiftyTwoWeekHigh;

    } catch (error) {
        console.error("Error fetching META quote:", error);
        document.getElementById("price").textContent = "Error loading price";
    }
}


// 2. Fetches historical data for the chart
async function getMETAHistory() {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${SYMBOL}&interval=5min&outputsize=full&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Alpha Vantage History API request failed');

        const data = await response.json();
        const timeSeries = data['Time Series (5min)'];

        if (!timeSeries) {
            console.error("Alpha Vantage returned no time series data:", data);
            createChart(["No Data"], [0]);
            return;
        }

        const allTimestamps = Object.keys(timeSeries).sort();
        const chartTimestamps = allTimestamps.slice(-96);

        const labels = chartTimestamps.map(ts => {
            const timePart = ts.split(' ')[1];
            const [hour, minute] = timePart.split(':');
            return new Date(0, 0, 0, hour, minute).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        });

        const prices = chartTimestamps.map(ts =>
            parseFloat(timeSeries[ts]['4. close'])
        );

        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = prices;
            chart.update();
        } else {
            createChart(labels, prices);
        }

    } catch (error) {
        console.error("Error fetching META history:", error);
        createChart(["N/A"], [0]);
    }
}


// 3. Initializes the Chart.js chart
function createChart(labels, data) {
    let ctx = document.getElementById("metaChart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "META Price (Last Day)",
                data: data,
                borderColor: '#00b4db',
                backgroundColor: 'rgba(0, 180, 219, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0,
                fill: 'origin'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    ticks: { color: "white", maxRotation: 45, minRotation: 45 },
                    grid: { color: '#2d333b' }
                },
                y: {
                    ticks: { color: "white" },
                    grid: { color: '#2d333b' }
                }
            },
            plugins: {
                legend: { labels: { color: "white" }},
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}


// --- INITIALIZATION ---
getMETAQuote();
setInterval(getMETAQuote, 30000);
getMETAHistory();

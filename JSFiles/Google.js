// --- CONFIGURATION ---
const API_KEY = "";
const SYMBOL = "GOOGL";

// Mocked fundamentals (stable per refresh)
const mockFundamentals = {
    peRatio: (60 + Math.random() * 10).toFixed(1), // 60–70
    marketCap: Math.floor(3000000000000 + Math.random() * 300000000000), // $3.0T–$3.3T
    fiftyTwoWeekHighMultiplier: 1.15 + Math.random() * 0.1 // 1.15–1.25
};

// Formatter for large numbers
function formatLargeNumber(num) {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    return num.toLocaleString();
}

let chart = null;

// --- CHART UPDATE FROM LIVE PRICE ---
function updateChartFromPrice(price) {
    if (!chart) return;

    const label = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(price);

    // Keep last 60 points
    if (chart.data.labels.length > 60) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update("none");
}

// --- CREATE CHART ONCE ---
function createChart() {
    const ctx = document.getElementById("googlChart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "GOOGL Price",
                data: [],
                borderColor: "#00b4db",
                backgroundColor: "rgba(0,180,219,0.2)",
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0,
                fill: "origin"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: false,
            scales: {
                x: {
                    ticks: { color: "white" },
                    grid: { color: "#2d333b" }
                },
                y: {
                    ticks: { color: "white" },
                    grid: { color: "#2d333b" },
                    suggestedMin: 150,
                    suggestedMax: 200
                }
            },
            plugins: {
                legend: { labels: { color: "white" } },
                tooltip: { mode: "index", intersect: false }
            }
        }

    });
}

// --- FETCH REAL-TIME QUOTE ---
async function getGOOGLQuote() {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${SYMBOL}&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Quote API failed");

        const data = await response.json();
        const quote = data["Global Quote"];

        if (!quote || Object.keys(quote).length === 0) {
            document.getElementById("price").textContent = "API Error";
            return;
        }

        const price = parseFloat(quote["05. price"]);
        const high = parseFloat(quote["03. high"]);
        const low = parseFloat(quote["04. low"]);
        const volume = parseInt(quote["06. volume"]);
        const change = parseFloat(quote["09. change"]);
        const changePercent = parseFloat(quote["10. change percent"].replace("%", ""));

        // --- UI Updates ---
        document.getElementById("price").textContent = "$" + price.toFixed(2);

        const changeEl = document.getElementById("change");
        if (change >= 0) {
            changeEl.style.color = "#00ff6a";
            changeEl.textContent = `+${change.toFixed(2)} (+${changePercent.toFixed(2)}%)`;
        } else {
            changeEl.style.color = "#ff4f4f";
            changeEl.textContent = `${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
        }

        document.getElementById("dayHigh").textContent = "$" + high.toFixed(2);
        document.getElementById("dayLow").textContent = "$" + low.toFixed(2);
        document.getElementById("volume").textContent = formatLargeNumber(volume);

        document.getElementById("peRatio").textContent = mockFundamentals.peRatio;
        document.getElementById("marketCap").textContent = formatLargeNumber(mockFundamentals.marketCap);
        document.getElementById("fiftyTwoWeekHigh").textContent =
            "$" + (price * mockFundamentals.fiftyTwoWeekHighMultiplier).toFixed(2);

        // --- CHART UPDATE ---
        updateChartFromPrice(price);

    } catch (err) {
        console.error(err);
        document.getElementById("price").textContent = "Error";
    }
}

// --- INIT ---
createChart();
getGOOGLQuote();
setInterval(getGOOGLQuote, 30000);


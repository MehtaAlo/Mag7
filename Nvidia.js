// --- CONFIGURATION ---
// !!! IMPORTANT: Get your free key from Alpha Vantage and paste it here
const API_KEY = "";
const SYMBOL = "NVDA";


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
async function getNVDAQuote() {
    // FUNCTION: GLOBAL_QUOTE
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${SYMBOL}&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Alpha Vantage Quote API request failed');

        const data = await response.json();
        const quote = data['Global Quote'];

        // --- Check for errors or missing data ---
        if (!quote || Object.keys(quote).length === 0) {
            document.getElementById("price").textContent = "API Error/No Data";
            console.error("Alpha Vantage returned no quote data:", data);
            return;
        }

        // Alpha Vantage Data Mapping
        const price = parseFloat(quote['05. price']);
        const open = parseFloat(quote['02. open']);
        const high = parseFloat(quote['03. high']);
        const low = parseFloat(quote['04. low']);
        const volume = parseInt(quote['06. volume']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

        // P/E Ratio and Market Cap are not in GLOBAL_QUOTE, need separate fetch for comprehensive data
        // For now, we will use placeholders or 'N/A' for metrics not available in this specific, real-time endpoint.
        const peRatio = 'N/A (Separate API Call)';
        const marketCap = 'N/A (Separate API Call)';
        const fiftyTwoWeekHigh = 'N/A (Separate API Call)';


        // --- Update Price & Change ---
        document.getElementById("price").textContent = "$" + price.toFixed(2);
        
        const changeElement = document.getElementById("change");
        
        if (change >= 0) {
            changeElement.style.color = "#00ff6a";
            changeElement.textContent = "+" + change.toFixed(2) + " (+" + changePercent.toFixed(2) + "%)";
        } else {
            changeElement.style.color = "#ff4f4f";
            changeElement.textContent = change.toFixed(2) + " (" + changePercent.toFixed(2) + "%)";
        }

        // --- Update Key Statistics ---
        document.getElementById("dayHigh").textContent = "$" + high.toFixed(2);
        document.getElementById("dayLow").textContent = "$" + low.toFixed(2);
        document.getElementById("volume").textContent = formatLargeNumber(volume);
        document.getElementById("peRatio").textContent = peRatio;
        document.getElementById("marketCap").textContent = marketCap;
        document.getElementById("fiftyTwoWeekHigh").textContent = fiftyTwoWeekHigh;

    } catch (error) {
        console.error("Error fetching NVDA quote:", error);
        document.getElementById("price").textContent = "Error loading price";
    }
}


// 2. Fetches historical data for the chart (Alpha Vantage Time Series)
async function getNVDAHistory() {
    // FUNCTION: TIME_SERIES_INTRADAY (e.g., 5-minute intervals for the last day)
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${SYMBOL}&interval=5min&outputsize=full&apikey=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Alpha Vantage History API request failed');

        const data = await response.json();
        
        const timeSeries = data['Time Series (5min)'];
        
        // --- Check for errors or missing data ---
        if (!timeSeries) {
            console.error("Alpha Vantage returned no time series data:", data);
            createChart(["No Data"], [0]); // Show a blank chart on failure
            return;
        }

        // Process data for Chart.js (get the last 8-10 hours of data)
        const allTimestamps = Object.keys(timeSeries).sort(); // Sort timestamps
        const chartTimestamps = allTimestamps.slice(-96); // Get last 96 entries (8 hours * 12 per hour)

        const labels = chartTimestamps.map(ts => {
            // Format time string (e.g., "2025-11-14 16:00:00") to "04:00 PM"
            const timePart = ts.split(' ')[1];
            const [hour, minute] = timePart.split(':');
            return new Date(0, 0, 0, hour, minute).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });

        const prices = chartTimestamps.map(ts => {
            // Get the closing price for each interval
            return parseFloat(timeSeries[ts]['4. close']);
        });
        
        // Check if the chart already exists and update it, otherwise create it
        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = prices;
            chart.update();
        } else {
            createChart(labels, prices);
        }

    } catch (error) {
        console.error("Error fetching NVDA history:", error);
        createChart(["N/A"], [0]);
    }
}

// 3. Initializes the Chart.js chart
function createChart(labels, data) {
    let ctx = document.getElementById("nvdaChart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "NVDA Price (Last Day)",
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

// Update price and key stats instantly, then every 60 sec (Alpha Vantage free tier limit)
getNVDAQuote();
// NOTE: The Alpha Vantage free tier has a limit of 5 API calls per minute.
// We set the interval longer than 12 seconds (60 seconds / 5 calls) to be safe.
setInterval(getNVDAQuote, 30000); // Update every 30 seconds

// Fetch historical data for the chart once (historical data doesn't update frequently)
getNVDAHistory();
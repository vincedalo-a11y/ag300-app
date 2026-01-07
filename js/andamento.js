// ===== ANDAMENTO TOOL =====
let andamentoData = [];
let selectedTool = '';
let selectedMonths = 6;

// Ordine status dal basso (UP) all'alto (USD)
const statusOrder = [
    'UP',
    'WARM IDLE',
    'STARTUP',
    'FACILITY',
    'MON',
    'ENG',
    'HOLD',
    'ENG-EVAL',
    'HOLD-SPC',
    'QUAL',
    'PM',
    'REPAIR-WAIT',
    'USD'
];

// Colori per ogni status
const statusColors = {
    'UP': '#00ff00',
    'WARM IDLE': '#f2f2f2',
    'STARTUP': '#bfbfbf',
    'FACILITY': '#ffc0cb',
    'MON': '#b5e6a2',
    'ENG': '#008040',
    'HOLD': '#ffc000',
    'ENG-EVAL': '#ccffff',
    'HOLD-SPC': '#ccffff',
    'QUAL': '#ffff00',
    'PM': '#00b0f0',
    'REPAIR-WAIT': '#e49edd',
    'USD': '#ff0000'
};

// Render pagina andamento
async function renderAndamentoPage() {
    const main = document.getElementById('mainContent');
    
    // Carica i tool dal JSON
    const tools = (typeof passdownToolsData !== 'undefined' && passdownToolsData.length > 0) 
        ? passdownToolsData 
        : [];
    
    main.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">📈 Andamento Tool</h1>
            <p class="page-subtitle">Visualizza lo storico status di un tool</p>
        </div>
        
        <div class="card andamento-controls">
            <div class="andamento-selectors">
                <div class="andamento-select-group">
                    <label class="form-label">Seleziona Tool</label>
                    <select class="form-control" id="selectTool">
                        <option value="">-- Seleziona un tool --</option>
                        ${tools.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                
                <div class="andamento-select-group">
                    <label class="form-label">Periodo</label>
                    <select class="form-control" id="selectMonths">
                        <option value="3">3 mesi</option>
                        <option value="6" selected>6 mesi</option>
                        <option value="12">12 mesi</option>
                        <option value="18">18 mesi</option>
                        <option value="24">24 mesi</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" id="btnGenerateChart">📊 Genera Grafico</button>
            </div>
        </div>
        
        <div class="card andamento-chart-container" id="chartContainer" style="display: none;">
            <div class="andamento-chart-header">
                <h2 id="chartTitle"></h2>
            </div>
            <canvas id="andamentoChart"></canvas>
        </div>
        
        <!-- Popup dettagli -->
        <div class="andamento-popup" id="andamentoPopup" style="display: none;">
            <div class="andamento-popup-content">
                <button class="andamento-popup-close" id="closePopup">&times;</button>
                <h3 id="popupTitle"></h3>
                <div class="andamento-popup-details">
                    <div class="popup-row">
                        <strong>Status:</strong>
                        <span id="popupStatus"></span>
                    </div>
                    <div class="popup-row">
                        <strong>Shift:</strong>
                        <span id="popupShift"></span>
                    </div>
                    <div class="popup-row">
                        <strong>Workers:</strong>
                        <span id="popupWorkers"></span>
                    </div>
                    <div class="popup-row">
                        <strong>Problem Statement:</strong>
                        <p id="popupPS"></p>
                    </div>
                    <div class="popup-row">
                        <strong>Actions Done:</strong>
                        <p id="popupAD"></p>
                    </div>
                    <div class="popup-row">
                        <strong>To Do:</strong>
                        <p id="popupTD"></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setupAndamentoEvents();
}

// Setup eventi
function setupAndamentoEvents() {
    document.getElementById('btnGenerateChart')?.addEventListener('click', generateChart);
    document.getElementById('closePopup')?.addEventListener('click', () => {
        document.getElementById('andamentoPopup').style.display = 'none';
    });
    
    // Chiudi popup cliccando fuori
    document.getElementById('andamentoPopup')?.addEventListener('click', (e) => {
        if (e.target.id === 'andamentoPopup') {
            e.target.style.display = 'none';
        }
    });
}

// Genera il grafico
async function generateChart() {
    selectedTool = document.getElementById('selectTool').value;
    selectedMonths = parseInt(document.getElementById('selectMonths').value);
    
    if (!selectedTool) {
        alert('Seleziona un tool!');
        return;
    }
    
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.style.display = 'block';
    document.getElementById('chartTitle').textContent = `Andamento ${selectedTool} - Ultimi ${selectedMonths} mesi`;
    
    // Calcola data inizio
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - selectedMonths);
    
    // Carica dati dal database
    const data = await loadAndamentoData(selectedTool, startDate, endDate);
    
    // Genera tutti i giorni nel range
    const allDays = generateDateRange(startDate, endDate);
    
    // Mappa i dati ai giorni
    const chartData = mapDataToDays(allDays, data);
    
    // Crea il grafico
    createChart(chartData);
}

// Carica dati dal database
async function loadAndamentoData(tool, startDate, endDate) {
    try {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const { data, error } = await db
            .from('passdowns')
            .select('*')
            .eq('tool', tool)
            .gte('data', startStr)
            .lte('data', endStr)
            .order('data', { ascending: true })
            .order('shift', { ascending: true });
        
        if (error) throw error;
        
        andamentoData = data || [];
        return andamentoData;
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        return [];
    }
}

// Genera range di date
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
        dates.push({
            date: current.toISOString().split('T')[0],
            shift: 'DAY'
        });
        dates.push({
            date: current.toISOString().split('T')[0],
            shift: 'NIGHT'
        });
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// Mappa i dati ai giorni
function mapDataToDays(allDays, data) {
    const dataMap = {};
    
    // Crea mappa dei dati esistenti
    data.forEach(record => {
        const key = `${record.data}_${record.shift}`;
        dataMap[key] = record;
    });
    
    // Mappa tutti i giorni
    return allDays.map(day => {
        const key = `${day.date}_${day.shift}`;
        const record = dataMap[key];
        
        if (record) {
            return {
                date: day.date,
                shift: day.shift,
                status: record.status || 'UP',
                statusIndex: statusOrder.indexOf(record.status || 'UP'),
                hasData: true,
                record: record
            };
        } else {
            return {
                date: day.date,
                shift: day.shift,
                status: 'UP',
                statusIndex: 0,
                hasData: false,
                record: null
            };
        }
    });
}

// Crea il grafico
let andamentoChart = null;

function createChart(chartData) {
    const ctx = document.getElementById('andamentoChart').getContext('2d');
    
    // Distruggi grafico esistente
    if (andamentoChart) {
        andamentoChart.destroy();
    }
    
    // Prepara labels e data
    const labels = chartData.map(d => {
        const date = new Date(d.date);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const shiftLabel = d.shift === 'DAY' ? 'D' : 'N';
        return `${day}/${month} ${shiftLabel}`;
    });
    
    const dataPoints = chartData.map(d => d.statusIndex);
    const colors = chartData.map(d => statusColors[d.status] || '#888888');
    
    andamentoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedTool,
                data: dataPoints,
                borderColor: '#0a84ff',
                backgroundColor: colors,
                pointBackgroundColor: colors,
                pointBorderColor: colors,
                pointRadius: 2,
                pointHoverRadius: 6,
                fill: false,
                tension: 0,
                stepped: 'before'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: true,
                mode: 'point'
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const point = chartData[index];
                    showPointDetails(point);
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Data',
                        color: '#ffffff'
                    },
                    ticks: {
                        color: '#aaaaaa',
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 30
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Status',
                        color: '#ffffff'
                    },
                    min: -0.5,
                    max: statusOrder.length - 0.5,
                    ticks: {
                        color: '#aaaaaa',
                        stepSize: 1,
                        callback: function(value) {
                            return statusOrder[value] || '';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = chartData[context.dataIndex];
                            return `Status: ${point.status}`;
                        },
                        afterLabel: function(context) {
                            const point = chartData[context.dataIndex];
                            if (point.hasData && point.record) {
                                const ps = point.record.problem_statement || 'N/A';
                                const psShort = ps.length > 50 ? ps.substring(0, 50) + '...' : ps;
                                return [`PS: ${psShort}`, '', 'Clicca per dettagli'];
                            }
                            return 'Nessun dato (default UP)';
                        }
                    }
                }
            }
        }
    });
}

// Mostra dettagli punto
function showPointDetails(point) {
    const popup = document.getElementById('andamentoPopup');
    const displayDate = convertToDisplayDate(point.date);
    
    document.getElementById('popupTitle').textContent = `${displayDate} - ${point.shift}`;
    document.getElementById('popupStatus').innerHTML = `<span style="background-color: ${statusColors[point.status]}; color: ${getContrastTextColor(statusColors[point.status])}; padding: 2px 8px; border-radius: 10px;">${point.status}</span>`;
    document.getElementById('popupShift').textContent = point.shift;
    
    if (point.hasData && point.record) {
        document.getElementById('popupWorkers').textContent = point.record.workers || 'N/A';
        document.getElementById('popupPS').textContent = point.record.problem_statement || 'N/A';
        document.getElementById('popupAD').textContent = point.record.actions_done || 'N/A';
        document.getElementById('popupTD').textContent = point.record.to_do || 'N/A';
    } else {
        document.getElementById('popupWorkers').textContent = 'Nessun dato registrato';
        document.getElementById('popupPS').textContent = 'Nessun dato registrato';
        document.getElementById('popupAD').textContent = 'Nessun dato registrato';
        document.getElementById('popupTD').textContent = 'Nessun dato registrato';
    }
    
    popup.style.display = 'flex';
}

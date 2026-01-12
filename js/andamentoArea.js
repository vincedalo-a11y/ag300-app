// ===== ANDAMENTO AREA =====
let areaToolsData = [];
let areaCharts = {};
let selectedAreaMonths = 6;

// Colori per ogni status (stessi di andamento tool)
const areaStatusColors = {
    'UP': '#00ff00',
    'UP-DATA': '#00cc00',
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

// Render pagina andamento area
async function renderAndamentoAreaPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">🏭 Andamento Area</h1>
            <p class="page-subtitle">Distribuzione status per tutti i tool</p>
        </div>
        
        <div class="card area-controls">
            <div class="area-selectors">
                <div class="area-select-group">
                    <label class="form-label">Periodo</label>
                    <select class="form-control" id="selectAreaMonths">
                        <option value="0.25">Ultima settimana</option>
                        <option value="0.5">Ultime 2 settimane</option>
                        <option value="1" selected>Ultimo mese</option>
                        <option value="3">Ultimi 3 mesi</option>
                    </select>
                </div>
                
                <button class="btn btn-primary btn-lg" id="btnGenerateArea">
                    📊 Genera Grafici
                </button>
            </div>
            
            <div class="area-info" id="areaInfo" style="display: none;">
                <span id="areaToolCount"></span>
                <span id="areaPeriodInfo"></span>
            </div>
        </div>
        
        <div id="areaLoading" style="display: none;">
            <div class="card">
                <div class="loading-area">
                    <div class="loading-spinner"></div>
                    <p>Caricamento dati in corso...</p>
                    <p class="loading-progress" id="loadingProgress"></p>
                </div>
            </div>
        </div>
        
        <div class="area-charts-grid" id="areaChartsGrid"></div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="navigateTo('home')">← Torna alla Home</button>
        </div>
    `;
    
    setupAndamentoAreaEvents();
}

// Setup eventi
function setupAndamentoAreaEvents() {
    document.getElementById('btnGenerateArea')?.addEventListener('click', generateAreaCharts);
}

// Genera tutti i grafici
async function generateAreaCharts() {
    selectedAreaMonths = parseFloat(document.getElementById('selectAreaMonths').value);
    
    // Mostra loading
    document.getElementById('areaLoading').style.display = 'block';
    document.getElementById('areaChartsGrid').innerHTML = '';
    document.getElementById('areaInfo').style.display = 'none';
    
    // Carica lista tool
    let tools = [];
    try {
        if (typeof passdownToolsData !== 'undefined' && passdownToolsData.length > 0) {
            tools = passdownToolsData;
        } else {
            const response = await fetch('data/tools.json');
            tools = await response.json();
        }
    } catch (e) {
        console.error('Errore caricamento tools:', e);
        alert('Errore nel caricamento della lista tool');
        document.getElementById('areaLoading').style.display = 'none';
        return;
    }
    
    // Calcola date in base al periodo selezionato
    const endDate = new Date();
    const startDate = new Date();
    
    if (selectedAreaMonths < 1) {
        // Settimane: 0.25 = 1 settimana, 0.5 = 2 settimane
        const weeks = selectedAreaMonths * 4;
        startDate.setDate(startDate.getDate() - (weeks * 7));
    } else {
        // Mesi
        startDate.setMonth(startDate.getMonth() - selectedAreaMonths);
    }
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Etichetta periodo per display
    let periodLabel = '';
    if (selectedAreaMonths === 0.25) periodLabel = '1 settimana';
    else if (selectedAreaMonths === 0.5) periodLabel = '2 settimane';
    else if (selectedAreaMonths === 1) periodLabel = '1 mese';
    else periodLabel = `${selectedAreaMonths} mesi`;
    
    // Carica tutti i dati in una sola query
    document.getElementById('loadingProgress').textContent = 'Caricamento dati dal database...';
    
    let allData = [];
    try {
        const { data, error } = await db
            .from('passdowns')
            .select('tool, status, problem_statement, actions_done, to_do')
            .gte('data', startStr)
            .lte('data', endStr);
        
        if (error) throw error;
        allData = data || [];
    } catch (error) {
        console.error('Errore caricamento dati:', error);
        alert('Errore nel caricamento dei dati');
        document.getElementById('areaLoading').style.display = 'none';
        return;
    }
    
    document.getElementById('loadingProgress').textContent = `Elaborazione ${tools.length} tool...`;
    
    // Calcola il numero totale di turni nel periodo
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalShifts = totalDays * 2; // DAY + NIGHT
    
    // Raggruppa dati per tool
    const dataByTool = {};
    allData.forEach(record => {
        if (!dataByTool[record.tool]) {
            dataByTool[record.tool] = [];
        }
        dataByTool[record.tool].push(record);
    });
    
    // Prepara dati per ogni tool
    const toolsStats = [];
    
    for (const tool of tools) {
        const toolRecords = dataByTool[tool] || [];
        const stats = calculateToolStats(toolRecords, totalShifts);
        toolsStats.push({
            tool: tool,
            stats: stats,
            totalRecords: toolRecords.length,
            totalShifts: totalShifts
        });
    }
    
    // Ordina in ordine alfabetico per nome tool
    toolsStats.sort((a, b) => a.tool.localeCompare(b.tool));
    
    // Nascondi loading
    document.getElementById('areaLoading').style.display = 'none';
    
    // Mostra info
    document.getElementById('areaInfo').style.display = 'flex';
    document.getElementById('areaToolCount').textContent = `${tools.length} tool`;
    document.getElementById('areaPeriodInfo').textContent = `Periodo: ${formatDateShort(startDate)} - ${formatDateShort(endDate)} (${totalShifts} turni, ${periodLabel})`;
    
    // Genera griglia grafici
    renderAreaChartsGrid(toolsStats);
}

// Calcola statistiche per un tool
function calculateToolStats(records, totalShifts) {
    const statusCount = {};
    
    // Conta ogni status
    records.forEach(record => {
        let status = record.status || 'UP';
        
        // Se UP ma ha commenti, conta come UP-DATA
        if (status === 'UP' && (record.problem_statement || record.actions_done || record.to_do)) {
            status = 'UP-DATA';
        }
        
        statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    // Calcola turni UP di default (non registrati = UP)
    const recordedShifts = records.length;
    const defaultUpShifts = totalShifts - recordedShifts;
    
    if (defaultUpShifts > 0) {
        statusCount['UP'] = (statusCount['UP'] || 0) + defaultUpShifts;
    }
    
    // Converti in array con percentuali
    const stats = [];
    for (const [status, count] of Object.entries(statusCount)) {
        const percentage = (count / totalShifts) * 100;
        stats.push({
            status: status,
            count: count,
            percentage: percentage
        });
    }
    
    // Ordina per percentuale decrescente
    stats.sort((a, b) => b.percentage - a.percentage);
    
    return stats;
}

// Render griglia grafici
function renderAreaChartsGrid(toolsStats) {
    const grid = document.getElementById('areaChartsGrid');
    
    // Distruggi grafici esistenti
    Object.values(areaCharts).forEach(chart => chart.destroy());
    areaCharts = {};
    
    let html = '';
    
    toolsStats.forEach((toolData, index) => {
        // Calcola % UP totale (UP + UP-DATA)
        const upPercentage = toolData.stats
            .filter(s => s.status === 'UP' || s.status === 'UP-DATA')
            .reduce((sum, s) => sum + s.percentage, 0);
        
        // Determina colore card basato su % UP
        let cardClass = 'area-chart-card';
        if (upPercentage < 70) {
            cardClass += ' card-critical';
        } else if (upPercentage < 85) {
            cardClass += ' card-warning';
        } else {
            cardClass += ' card-good';
        }
        
        html += `
            <div class="${cardClass}">
                <div class="area-chart-header">
                    <h3 class="area-chart-title">${toolData.tool}</h3>
                    <span class="area-chart-uptime">${upPercentage.toFixed(1)}% UP</span>
                </div>
                <div class="area-chart-wrapper">
                    <canvas id="areaChart_${index}"></canvas>
                </div>
                <div class="area-chart-legend" id="legend_${index}"></div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    
    // Crea grafici dopo render DOM
    setTimeout(() => {
        toolsStats.forEach((toolData, index) => {
            createPieChart(toolData, index);
        });
    }, 100);
}

// Crea singolo grafico a torta
function createPieChart(toolData, index) {
    const ctx = document.getElementById(`areaChart_${index}`);
    if (!ctx) return;
    
    const stats = toolData.stats;
    
    // Prepara dati per Chart.js
    const labels = stats.map(s => s.status);
    const data = stats.map(s => s.percentage);
    const colors = stats.map(s => areaStatusColors[s.status] || '#888888');
    
    areaCharts[index] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#1a1a2e',
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '50%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const stat = stats[context.dataIndex];
                            const displayLabel = stat.status === 'UP-DATA' ? 'UP (con dati)' : stat.status;
                            return `${displayLabel}: ${stat.percentage.toFixed(1)}% (${stat.count} turni)`;
                        }
                    }
                }
            }
        }
    });
    
    // Genera legenda custom
    renderChartLegend(stats, index);
}

// Render legenda custom
function renderChartLegend(stats, index) {
    const legendDiv = document.getElementById(`legend_${index}`);
    if (!legendDiv) return;
    
    // Mostra solo i primi 5 status (più significativi)
    const topStats = stats.slice(0, 5);
    
    let html = '';
    topStats.forEach(stat => {
        const color = areaStatusColors[stat.status] || '#888888';
        
        // Label più leggibile per UP-DATA
        const displayLabel = stat.status === 'UP-DATA' ? 'UP (con dati)' : stat.status;
        
        html += `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${color};"></span>
                <span class="legend-label">${displayLabel}</span>
                <span class="legend-value">${stat.percentage.toFixed(1)}%</span>
            </div>
        `;
    });
    
    // Se ci sono altri status, mostra "Altri"
    if (stats.length > 5) {
        const othersPercentage = stats.slice(5).reduce((sum, s) => sum + s.percentage, 0);
        if (othersPercentage > 0) {
            html += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: #888888;"></span>
                    <span class="legend-label">Altri</span>
                    <span class="legend-value">${othersPercentage.toFixed(1)}%</span>
                </div>
            `;
        }
    }
    
    legendDiv.innerHTML = html;
}

// Utility: formatta data breve
function formatDateShort(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Utility: contrasto testo (se non già definita)
function getContrastTextColorArea(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}
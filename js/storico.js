// ===== STORICO PASSDOWN =====
let storicoData = [];
let storicoFilters = {
    tool: [],
    status: '',
    data: '',
    shift: '',
    workers: '',
    problemStatement: '',
    actionsDone: '',
    toDo: ''
};
let storicoSort = {
    column: 'id',
    direction: 'desc'
};

// Carica tutti i dati dal database
async function loadStoricoData() {
    try {
        let allData = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const { data, error } = await db
                .from('passdowns')
                .select('*')
                .order('id', { ascending: false })
                .range(from, from + pageSize - 1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
                hasMore = data.length === pageSize;
            } else {
                hasMore = false;
            }
        }
        
        storicoData = allData;
        return { success: true, data: storicoData };
    } catch (error) {
        console.error('Errore caricamento storico:', error);
        return { success: false, error: error.message };
    }
}

// Render pagina storico
async function renderStoricoPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="loading">Caricamento storico...</div>`;
    
    const result = await loadStoricoData();
    
    if (!result.success) {
        main.innerHTML = `
            <div class="card">
                <div class="placeholder-content">
                    <div class="placeholder-icon">❌</div>
                    <div class="placeholder-text">Errore nel caricamento dello storico</div>
                </div>
            </div>
        `;
        return;
    }
    
    main.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">📚 Storico Passdown</h1>
            <p class="page-subtitle">${storicoData.length} record totali</p>
        </div>
        
        <div class="card storico-card">
            <div class="storico-toolbar">
                <button class="btn btn-secondary" id="btnResetFilters">🔄 Reset Filtri</button>
                <button class="btn btn-secondary" id="btnExportCSV">📥 Esporta CSV</button>
                <span class="storico-count" id="storicoCount">${storicoData.length} record</span>
            </div>
            
            <div class="storico-table-container">
                <table class="storico-table" id="storicoTable">
                    <thead>
                        <tr class="storico-header-row">
                            <th class="sortable sort-desc" data-column="id">ID</th>
                            <th class="sortable" data-column="data">Data</th>
                            <th class="sortable" data-column="shift">Shift</th>
                            <th class="sortable" data-column="tool">Tool</th>
                            <th class="sortable" data-column="status">Status</th>
                            <th class="sortable" data-column="workers">Workers</th>
                            <th>Problem Statement</th>
                            <th>Actions Done</th>
                            <th>To Do</th>
                        </tr>
                        <tr class="storico-filter-row">
                            <th></th>
                            <th><input type="date" class="filter-input" id="filterData"></th>
                            <th>
                                <select class="filter-input" id="filterShift">
                                    <option value="">Tutti</option>
                                    <option value="DAY">DAY</option>
                                    <option value="NIGHT">NIGHT</option>
                                </select>
                            </th>
                            <th>
                                <div class="multi-select-container" id="toolFilterContainer">
                                    <div class="multi-select-display" id="toolFilterDisplay">Tutti</div>
                                    <div class="multi-select-dropdown" id="toolFilterDropdown">
                                        <div class="multi-select-actions">
                                            <button type="button" class="multi-select-btn" id="btnSelectAllTools">Tutti</button>
                                            <button type="button" class="multi-select-btn" id="btnClearTools">Nessuno</button>
                                        </div>
                                        <div class="multi-select-options" id="toolFilterOptions"></div>
                                    </div>
                                </div>
                            </th>
                            <th>
                                <select class="filter-input" id="filterStatus">
                                    <option value="">Tutti</option>
                                </select>
                            </th>
                            <th><input type="text" class="filter-input" id="filterWorkers" placeholder="Workers..."></th>
                            <th><input type="text" class="filter-input" id="filterPS" placeholder="PS..."></th>
                            <th><input type="text" class="filter-input" id="filterAD" placeholder="AD..."></th>
                            <th><input type="text" class="filter-input" id="filterTD" placeholder="TD..."></th>
                        </tr>
                    </thead>
                    <tbody id="storicoBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    populateStatusFilter();
    populateToolFilter();
    renderStoricoTable();
    setupStoricoEvents();
}

// Popola il filtro status con valori unici
function populateStatusFilter() {
    const statusSet = new Set(storicoData.map(row => row.status).filter(s => s));
    const select = document.getElementById('filterStatus');
    
    [...statusSet].sort().forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        select.appendChild(option);
    });
}

// Popola il filtro tool con i tool dal JSON
function populateToolFilter() {
    const optionsContainer = document.getElementById('toolFilterOptions');
    
    // Usa passdownToolsData se disponibile, altrimenti estrai dai dati
    const tools = (typeof passdownToolsData !== 'undefined' && passdownToolsData.length > 0) 
        ? passdownToolsData 
        : [...new Set(storicoData.map(row => row.tool).filter(t => t))].sort();
    
    tools.forEach(tool => {
        const label = document.createElement('label');
        label.className = 'multi-select-option';
        label.innerHTML = `
            <input type="checkbox" value="${tool}" checked>
            <span>${tool}</span>
        `;
        optionsContainer.appendChild(label);
    });
    
    // Inizialmente tutti selezionati (nessun filtro)
    storicoFilters.tool = [];
}

// Aggiorna display del filtro tool
function updateToolFilterDisplay() {
    const display = document.getElementById('toolFilterDisplay');
    const checkboxes = document.querySelectorAll('#toolFilterOptions input[type="checkbox"]');
    const checked = [...checkboxes].filter(cb => cb.checked);
    
    if (checked.length === 0) {
        display.textContent = 'Nessuno';
        storicoFilters.tool = ['__NONE__']; // Filtro speciale per nessun risultato
    } else if (checked.length === checkboxes.length) {
        display.textContent = 'Tutti';
        storicoFilters.tool = [];
    } else if (checked.length <= 2) {
        display.textContent = checked.map(cb => cb.value).join(', ');
        storicoFilters.tool = checked.map(cb => cb.value);
    } else {
        display.textContent = `${checked.length} selezionati`;
        storicoFilters.tool = checked.map(cb => cb.value);
    }
    
    renderStoricoTable();
}

// Filtra i dati
function getFilteredData() {
    return storicoData.filter(row => {
        if (storicoFilters.data && row.data !== storicoFilters.data) return false;
        if (storicoFilters.shift && row.shift !== storicoFilters.shift) return false;
        if (storicoFilters.tool.length > 0 && !storicoFilters.tool.includes(row.tool)) return false;
        if (storicoFilters.status && row.status !== storicoFilters.status) return false;
        if (storicoFilters.workers && !row.workers?.toLowerCase().includes(storicoFilters.workers.toLowerCase())) return false;
        if (storicoFilters.problemStatement && !row.problem_statement?.toLowerCase().includes(storicoFilters.problemStatement.toLowerCase())) return false;
        if (storicoFilters.actionsDone && !row.actions_done?.toLowerCase().includes(storicoFilters.actionsDone.toLowerCase())) return false;
        if (storicoFilters.toDo && !row.to_do?.toLowerCase().includes(storicoFilters.toDo.toLowerCase())) return false;
        return true;
    });
}

// Ordina i dati
function getSortedData(data) {
    return [...data].sort((a, b) => {
        let aVal = a[storicoSort.column];
        let bVal = b[storicoSort.column];
        
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return storicoSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return storicoSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Render tabella
function renderStoricoTable() {
    const filtered = getFilteredData();
    const sorted = getSortedData(filtered);
    
    const tbody = document.getElementById('storicoBody');
    const countEl = document.getElementById('storicoCount');
    
    countEl.textContent = `${sorted.length} di ${storicoData.length} record`;
    
    if (sorted.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="storico-empty">Nessun record trovato</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sorted.map(row => {
        const statusColor = getStatusColor(row.status);
        const textColor = getContrastTextColor(statusColor);
        const displayDate = row.data ? convertToDisplayDate(row.data) : '';
        
        return `
            <tr>
                <td class="storico-cell-id">${row.id}</td>
                <td class="storico-cell-data">${displayDate}</td>
                <td class="storico-cell-shift">
                    <span class="shift-badge ${row.shift?.toLowerCase()}">${row.shift || ''}</span>
                </td>
                <td class="storico-cell-tool">${row.tool || ''}</td>
                <td class="storico-cell-status">
                    <span class="status-badge-small" style="background-color: ${statusColor}; color: ${textColor};">
                        ${row.status || ''}
                    </span>
                </td>
                <td class="storico-cell-workers">${row.workers || ''}</td>
                <td class="storico-cell-text">${row.problem_statement || ''}</td>
                <td class="storico-cell-text">${row.actions_done || ''}</td>
                <td class="storico-cell-text">${row.to_do || ''}</td>
            </tr>
        `;
    }).join('');
}

// Setup eventi
function setupStoricoEvents() {
    // Filtri
    document.getElementById('filterData')?.addEventListener('change', (e) => {
        storicoFilters.data = e.target.value;
        renderStoricoTable();
    });
    
    document.getElementById('filterShift')?.addEventListener('change', (e) => {
        storicoFilters.shift = e.target.value;
        renderStoricoTable();
    });
    
    document.getElementById('filterStatus')?.addEventListener('change', (e) => {
        storicoFilters.status = e.target.value;
        renderStoricoTable();
    });
    
    document.getElementById('filterWorkers')?.addEventListener('input', (e) => {
        storicoFilters.workers = e.target.value;
        renderStoricoTable();
    });
    
    document.getElementById('filterPS')?.addEventListener('input', (e) => {
        storicoFilters.problemStatement = e.target.value;
        renderStoricoTable();
    });
    
    document.getElementById('filterAD')?.addEventListener('input', (e) => {
        storicoFilters.actionsDone = e.target.value;
        renderStoricoTable();
    });
    
    document.getElementById('filterTD')?.addEventListener('input', (e) => {
        storicoFilters.toDo = e.target.value;
        renderStoricoTable();
    });
    
    // Tool multi-select dropdown toggle
    const toolContainer = document.getElementById('toolFilterContainer');
    const toolDisplay = document.getElementById('toolFilterDisplay');
    const toolDropdown = document.getElementById('toolFilterDropdown');
    
    toolDisplay?.addEventListener('click', (e) => {
        e.stopPropagation();
        toolDropdown.classList.toggle('open');
    });
    
    // Chiudi dropdown cliccando fuori
    document.addEventListener('click', (e) => {
        if (!toolContainer?.contains(e.target)) {
            toolDropdown?.classList.remove('open');
        }
    });
    
    // Tool checkboxes
    document.querySelectorAll('#toolFilterOptions input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateToolFilterDisplay);
    });
    
    // Select All / Clear tools
    document.getElementById('btnSelectAllTools')?.addEventListener('click', () => {
        document.querySelectorAll('#toolFilterOptions input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateToolFilterDisplay();
    });
    
    document.getElementById('btnClearTools')?.addEventListener('click', () => {
        document.querySelectorAll('#toolFilterOptions input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateToolFilterDisplay();
    });
    
    // Sort
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            
            if (storicoSort.column === column) {
                storicoSort.direction = storicoSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                storicoSort.column = column;
                storicoSort.direction = 'asc';
            }
            
            // Update UI
            document.querySelectorAll('.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            th.classList.add(storicoSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            
            renderStoricoTable();
        });
    });
    
    // Reset filtri
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        storicoFilters = { tool: [], status: '', data: '', shift: '', workers: '', problemStatement: '', actionsDone: '', toDo: '' };
        document.getElementById('filterData').value = '';
        document.getElementById('filterShift').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterWorkers').value = '';
        document.getElementById('filterPS').value = '';
        document.getElementById('filterAD').value = '';
        document.getElementById('filterTD').value = '';
        
        // Reset tool checkboxes
        document.querySelectorAll('#toolFilterOptions input[type="checkbox"]').forEach(cb => cb.checked = true);
        document.getElementById('toolFilterDisplay').textContent = 'Tutti';
        
        renderStoricoTable();
    });
    
    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', exportToCSV);
}

// Esporta in CSV
function exportToCSV() {
    const filtered = getFilteredData();
    const sorted = getSortedData(filtered);
    
    const headers = ['ID', 'Data', 'Shift', 'Tool', 'Status', 'Workers', 'Problem Statement', 'Actions Done', 'To Do'];
    const rows = sorted.map(row => [
        row.id,
        row.data ? convertToDisplayDate(row.data) : '',
        row.shift || '',
        row.tool || '',
        row.status || '',
        row.workers || '',
        `"${(row.problem_statement || '').replace(/"/g, '""')}"`,
        `"${(row.actions_done || '').replace(/"/g, '""')}"`,
        `"${(row.to_do || '').replace(/"/g, '""')}"`
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `storico_passdown_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}
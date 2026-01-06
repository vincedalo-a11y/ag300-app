// ===== PASSDOWN STATE =====
let currentShift = {
    date: '',
    type: '',
    workers: []
};

let workersData = [];
let passdownToolsData = [];
let passdownStatusData = [];

// Dati per la pagina di revisione
let reviewData = {
    currentTools: [],      // Tool commentati in questo passdown
    previousTools: [],     // Tool dal turno precedente non UP
    manualTools: []        // Tool aggiunti manualmente
};

// Carica i dati di validazione
async function loadValidationData() {
    try {
        const toolsResponse = await fetch('data/tools.json');
        passdownToolsData = await toolsResponse.json();
    } catch (e) {
        passdownToolsData = [];
    }
    
    try {
        const statusResponse = await fetch('data/statusMarkers.json');
        passdownStatusData = await statusResponse.json();
    } catch (e) {
        passdownStatusData = [];
    }
}

loadValidationData();

// ===== CALCOLO TURNO AUTOMATICO =====
function calculateShift() {
    const now = new Date();
    const hours = now.getHours();
    
    let shiftDate;
    let shiftType;
    
    if (hours >= 12) {
        shiftDate = now;
        shiftType = 'DAY';
    } else {
        shiftDate = new Date(now);
        shiftDate.setDate(shiftDate.getDate() - 1);
        shiftType = 'NIGHT';
    }
    
    currentShift.date = formatDate(shiftDate);
    currentShift.type = shiftType;
}

function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
}

// ===== PASSDOWN START PAGE =====
function renderPassdownStart() {
    calculateShift();
    
    return `
        <div class="page-header">
            <h1 class="page-title">📋 Passdown</h1>
            <p class="page-subtitle">Gestione note di passaggio turno</p>
        </div>
        
        <div class="card">
            <div class="shift-display">
                <div class="shift-date">${currentShift.date}</div>
                <div class="shift-type ${currentShift.type.toLowerCase()}">${currentShift.type}</div>
                
                <div class="mt-3">
                    <button class="btn btn-secondary" id="btnChangeShift">
                        ✏️ Modifica Data/Turno
                    </button>
                    <button class="btn btn-primary btn-lg" id="btnConfirmShift" style="margin-left: 12px;">
                        ✅ Conferma Turno
                    </button>
                </div>
            </div>
        </div>
        
        <div class="modal-overlay" id="shiftModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Modifica Data e Turno</h3>
                    <button class="modal-close" id="closeModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Data</label>
                        <input type="date" class="form-control" id="inputDate">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Turno</label>
                        <select class="form-control" id="inputShiftType">
                            <option value="DAY">DAY (7:00 - 19:00)</option>
                            <option value="NIGHT">NIGHT (19:00 - 7:00)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="btnCancelModal">Annulla</button>
                    <button class="btn btn-primary" id="btnSaveModal">Salva</button>
                </div>
            </div>
        </div>
    `;
}

function setupPassdownStartEvents() {
    document.getElementById('btnChangeShift').addEventListener('click', openShiftModal);
    document.getElementById('btnConfirmShift').addEventListener('click', checkAndConfirmShift);
    document.getElementById('closeModal').addEventListener('click', closeShiftModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeShiftModal);
    document.getElementById('btnSaveModal').addEventListener('click', saveShiftModal);
    document.getElementById('shiftModal').addEventListener('click', (e) => {
        if (e.target.id === 'shiftModal') closeShiftModal();
    });
}

async function checkAndConfirmShift() {
    // Verifica se il turno esiste già nel database
    const result = await checkShiftExists(currentShift.date, currentShift.type);
    
    if (result.exists) {
        showShiftExistsModal(result.workers);
        return;
    }
    
    // Se il turno non esiste, continua normalmente
    goToWorkersSelection();
}

function showShiftExistsModal(workers) {
    const modalHTML = `
        <div class="modal-overlay active" id="shiftExistsModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">⚠️ Turno già caricato</h3>
                    <button class="modal-close" id="closeShiftExistsModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px;">Questo turno è già stato caricato nel database:</p>
                    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <p><strong>📅 Data:</strong> ${currentShift.date}</p>
                        <p><strong>🔄 Turno:</strong> ${currentShift.type}</p>
                        <p><strong>👥 Workers:</strong> ${workers}</p>
                    </div>
                    <p style="color: var(--text-secondary);">Cosa vuoi fare?</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn btn-secondary" id="btnCloseShiftExists">Annulla</button>
                    <button class="btn btn-primary" id="btnViewShift">👁️ Visualizza Turno</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('closeShiftExistsModal').addEventListener('click', closeShiftExistsModal);
    document.getElementById('btnCloseShiftExists').addEventListener('click', closeShiftExistsModal);
    document.getElementById('btnViewShift').addEventListener('click', () => {
        closeShiftExistsModal();
        viewExistingShift();
    });
    
    document.getElementById('shiftExistsModal').addEventListener('click', (e) => {
        if (e.target.id === 'shiftExistsModal') closeShiftExistsModal();
    });
}

function closeShiftExistsModal() {
    const modal = document.getElementById('shiftExistsModal');
    if (modal) modal.remove();
}

async function viewExistingShift() {
    // Carica i dati del turno dal database
    const result = await getShiftTools(currentShift.date, currentShift.type);
    
    if (!result.success || result.data.length === 0) {
        alert('Errore nel caricamento del turno');
        return;
    }
    
    const tools = result.data;
    const workers = tools[0].workers;
    
    // Ottieni lista di tutti gli stati finali unici per i colori
    const allStatuses = [...new Set(passdownStatusData.map(s => s.statoFinale))];
    
    const tableRows = tools.map(t => {
        const statusColor = getStatusColor(t.status);
        const textColor = getContrastTextColor(statusColor);
        
        return `
            <tr>
                <td><span class="tool-name">${t.tool}</span></td>
                <td>
                    <span class="status-badge" style="background-color: ${statusColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 0.75rem;">
                        ${t.status}
                    </span>
                </td>
                <td><div class="cell-readonly">${t.problem_statement || ''}</div></td>
                <td><div class="cell-readonly">${t.actions_done || ''}</div></td>
                <td><div class="cell-readonly">${t.to_do || ''}</div></td>
            </tr>
        `;
    }).join('');
    
    const pageHTML = `
        <div class="review-header card">
            <div class="review-header-content">
                <h1>👁️ Visualizzazione Turno</h1>
                <div class="review-meta">
                    <span class="review-date">${currentShift.date}</span>
                    <span class="review-shift ${currentShift.type.toLowerCase()}">${currentShift.type}</span>
                    <span class="review-workers">👥 ${workers}</span>
                </div>
            </div>
        </div>
        
        <div class="card mt-3">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h2 class="card-title">📋 Tool caricati (${tools.length})</h2>
                <button class="btn btn-danger" id="btnDeleteShift">🗑️ Elimina Turno</button>
            </div>
            <div class="review-table-container">
                <table class="review-table">
                    <thead>
                        <tr>
                            <th>Tool</th>
                            <th>Status</th>
                            <th>Problem Statement</th>
                            <th>Actions Done</th>
                            <th>To Do</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="review-actions mt-3">
            <button class="btn btn-secondary btn-lg" id="btnBackFromView">← Torna indietro</button>
        </div>
    `;
    
    document.getElementById('mainContent').innerHTML = pageHTML;
    
    // Event listeners
    document.getElementById('btnBackFromView').addEventListener('click', () => {
        document.getElementById('mainContent').innerHTML = renderPassdownStart();
        setupPassdownStartEvents();
    });
    
    document.getElementById('btnDeleteShift').addEventListener('click', confirmDeleteShift);
}

async function confirmDeleteShift() {
    const confirmed = confirm(`⚠️ ATTENZIONE!\n\nStai per eliminare TUTTE le righe del turno:\n\n📅 ${currentShift.date} - ${currentShift.type}\n\nQuesta azione è irreversibile. Continuare?`);
    
    if (!confirmed) return;
    
    const result = await deleteShift(currentShift.date, currentShift.type);
    
    if (result.success) {
        alert('✅ Turno eliminato con successo!');
        document.getElementById('mainContent').innerHTML = renderPassdownStart();
        setupPassdownStartEvents();
    } else {
        alert(`❌ Errore nell'eliminazione:\n\n${result.error}`);
    }
}


function openShiftModal() {
    const modal = document.getElementById('shiftModal');
    const inputDate = document.getElementById('inputDate');
    const inputShiftType = document.getElementById('inputShiftType');
    
    const parts = currentShift.date.split('-');
    const months = {'Jan':'01', 'Feb':'02', 'Mar':'03', 'Apr':'04', 'May':'05', 'Jun':'06',
                    'Jul':'07', 'Aug':'08', 'Sep':'09', 'Oct':'10', 'Nov':'11', 'Dec':'12'};
    const isoDate = `20${parts[2]}-${months[parts[1]]}-${parts[0]}`;
    
    inputDate.value = isoDate;
    inputShiftType.value = currentShift.type;
    modal.classList.add('active');
}

function closeShiftModal() {
    document.getElementById('shiftModal').classList.remove('active');
}

function saveShiftModal() {
    const inputDate = document.getElementById('inputDate').value;
    const inputShiftType = document.getElementById('inputShiftType').value;
    
    if (!inputDate) {
        alert('Seleziona una data');
        return;
    }
    
    const date = new Date(inputDate);
    currentShift.date = formatDate(date);
    currentShift.type = inputShiftType;
    
    document.querySelector('.shift-date').textContent = currentShift.date;
    const shiftTypeEl = document.querySelector('.shift-type');
    shiftTypeEl.textContent = currentShift.type;
    shiftTypeEl.className = `shift-type ${currentShift.type.toLowerCase()}`;
    
    closeShiftModal();
}

// ===== WORKERS SELECTION =====
async function goToWorkersSelection() {
    await loadWorkers();
    document.getElementById('mainContent').innerHTML = renderWorkersSelection();
    setupWorkersSelectionEvents();
}

async function loadWorkers() {
    try {
        const response = await fetch('data/workers.json');
        workersData = await response.json();
    } catch (e) {
        workersData = {};
    }
}

function renderWorkersSelection() {
    let categoriesHTML = '';
    
    for (const [category, workers] of Object.entries(workersData)) {
        const workersHTML = workers.map((worker, index) => `
            <div class="worker-item" data-category="${category}" data-worker="${worker}">
                <input type="checkbox" class="worker-checkbox" id="worker_${category}_${index}">
                <label class="worker-name" for="worker_${category}_${index}">${worker}</label>
            </div>
        `).join('');
        
        categoriesHTML += `
            <div class="worker-category">
                <div class="worker-category-title">${category}</div>
                <div class="worker-category-list">${workersHTML}</div>
            </div>
        `;
    }
    
    return `
        <div class="page-header">
            <h1 class="page-title">👥 Selezione Lavoratori</h1>
            <p class="page-subtitle">${currentShift.date} - ${currentShift.type}</p>
        </div>
        
        <div class="card">
            <p class="mb-2" style="color: var(--text-secondary);">Seleziona con un Flag lo Shift Coordinator ed i CE/TECH assegnati a questo turno</p>
            
            <div class="selected-workers" id="selectedWorkersBox" style="display: none;">
                <div class="selected-workers-title">✅ Lavoratori selezionati:</div>
                <div class="selected-workers-list" id="selectedWorkersList"></div>
            </div>
            
            <div class="workers-categories">${categoriesHTML}</div>
            
            <div class="passdown-buttons">
                <button class="btn btn-secondary" id="btnBackToShift">← Indietro</button>
                <button class="btn btn-primary btn-lg" id="btnGoToProcessor" disabled>Continua →</button>
            </div>
        </div>
    `;
}

function setupWorkersSelectionEvents() {
    document.querySelectorAll('.worker-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = item.querySelector('.worker-checkbox');
                checkbox.checked = !checkbox.checked;
            }
            item.classList.toggle('selected', item.querySelector('.worker-checkbox').checked);
            updateSelectedWorkers();
        });
    });
    
    document.querySelectorAll('.worker-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            checkbox.closest('.worker-item').classList.toggle('selected', checkbox.checked);
            updateSelectedWorkers();
        });
    });
    
    document.getElementById('btnBackToShift').addEventListener('click', () => {
        document.getElementById('mainContent').innerHTML = renderPassdownStart();
        setupPassdownStartEvents();
    });
    
    document.getElementById('btnGoToProcessor').addEventListener('click', () => {
        if (currentShift.workers.length > 0) goToPassdownProcessor();
    });
}

function updateSelectedWorkers() {
    const selectedItems = document.querySelectorAll('.worker-item.selected');
    currentShift.workers = Array.from(selectedItems).map(item => item.getAttribute('data-worker'));
    
    const box = document.getElementById('selectedWorkersBox');
    const list = document.getElementById('selectedWorkersList');
    const btn = document.getElementById('btnGoToProcessor');
    
    if (currentShift.workers.length > 0) {
        box.style.display = 'block';
        list.textContent = currentShift.workers.join(', ');
        btn.disabled = false;
    } else {
        box.style.display = 'none';
        btn.disabled = true;
    }
}

// ===== PASSDOWN PROCESSOR =====
function goToPassdownProcessor() {
    document.getElementById('mainContent').innerHTML = renderPassdownProcessor();
    setupPassdownProcessorEvents();
}

function renderPassdownProcessor() {
    return `
        <div class="page-header">
            <h1 class="page-title">📋 Passdown Analyser</h1>
            <p class="page-subtitle">${currentShift.date} - ${currentShift.type} | 👥 ${currentShift.workers.join(', ')}</p>
        </div>
        
        <div class="card">
            <div class="passdown-container">
                <div class="passdown-panel">
                    <label class="form-label">Input - Incolla qui i tuoi appunti da OneNote</label>
                    <textarea class="form-control" id="inputText" placeholder="Incolla qui dentro i tuoi appunti dal OneNote..."></textarea>
                </div>
                
                <div class="passdown-panel" style="width: 100%;">
                    <label class="form-label">Output - Testo analizzato</label>
                    <div class="output-box" id="outputText"></div>
                </div>
            </div>
            
            <div class="passdown-buttons">
                <button class="btn btn-secondary" id="btnBackToWorkers">← Indietro</button>
                <button class="btn btn-primary" id="btnAnalyze">⚡ Analizza</button>
                <button class="btn btn-warning" id="btnClear">🗑️ Svuota</button>
                <button class="btn btn-success btn-lg" id="btnConfirm" style="display: none;">✅ Conferma</button>
            </div>
        </div>
    `;
}

function setupPassdownProcessorEvents() {
    document.getElementById('btnBackToWorkers').addEventListener('click', goToWorkersSelection);
    document.getElementById('btnAnalyze').addEventListener('click', analyzePassdown);
    document.getElementById('btnClear').addEventListener('click', clearPassdown);
    document.getElementById('btnConfirm').addEventListener('click', goToReviewPage);
}

function analyzePassdown() {
    const inputText = document.getElementById('inputText').value;
    const outputBox = document.getElementById('outputText');
    const btnConfirm = document.getElementById('btnConfirm');
    
    if (!inputText.trim()) {
        showValidationPopup('⚠️ Attenzione', ['Inserisci del testo da analizzare'], false);
        btnConfirm.style.display = 'none';
        return;
    }
    
    const firstEditing = phaseOne(inputText);
    const processedText = phaseTwo(firstEditing);
    
    outputBox.innerHTML = formatOutputHTML(processedText);
    outputBox.dataset.rawText = processedText;
    
    const warnings = validateOutput(processedText);
    
    if (warnings.length > 0) {
        showValidationPopup('⚠️ Attenzione', warnings, true);
    } else {
        showValidationPopup('✅ Validazione completata', ['Tutto OK! Nessun problema rilevato.'], true);
    }
}

function showValidationPopup(title, messages, showConfirm) {
    const modalHTML = `
        <div class="modal-overlay active" id="validationModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" id="closeValidationModal">&times;</button>
                </div>
                <div class="modal-body">
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${messages.map(m => `<li style="padding: 8px 0; border-bottom: 1px solid var(--border-glass);">${m}</li>`).join('')}
                    </ul>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="btnCloseValidation">OK</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const closeModal = () => {
        const modal = document.getElementById('validationModal');
        if (modal) modal.remove();
        
        // Mostra il pulsante conferma se la validazione è ok
        if (showConfirm) {
            document.getElementById('btnConfirm').style.display = 'inline-flex';
        }
    };
    
    document.getElementById('closeValidationModal').addEventListener('click', closeModal);
    document.getElementById('btnCloseValidation').addEventListener('click', closeModal);
    document.getElementById('validationModal').addEventListener('click', (e) => {
        if (e.target.id === 'validationModal') closeModal();
    });
}

function clearPassdown() {
    document.getElementById('inputText').value = '';
    document.getElementById('outputText').innerHTML = '';
    document.getElementById('outputText').dataset.rawText = '';
    document.getElementById('alertBox').textContent = 'Premi Analizza per validare';
    document.getElementById('alertBox').className = 'alert-box';
    document.getElementById('btnConfirm').disabled = true;
}

function formatOutputHTML(processedText) {
    const blocks = processedText.split('\n\n').filter(b => b.trim());
    
    return blocks.map(block => {
        const lines = block.split('\n');
        let html = '';
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            if (index === 0) {
                html += `<div class="output-tool-header">${escapeHtml(trimmedLine)}</div>`;
            } else if (trimmedLine.startsWith('PS:')) {
                html += `<div class="output-marker output-ps"><span class="marker-label">PS:</span>${escapeHtml(trimmedLine.substring(3))}</div>`;
            } else if (trimmedLine.startsWith('AD:')) {
                html += `<div class="output-marker output-ad"><span class="marker-label">AD:</span>${escapeHtml(trimmedLine.substring(3))}</div>`;
            } else if (trimmedLine.startsWith('TD:')) {
                html += `<div class="output-marker output-td"><span class="marker-label">TD:</span>${escapeHtml(trimmedLine.substring(3))}</div>`;
            } else if (trimmedLine) {
                html += `<div class="output-continuation">${escapeHtml(trimmedLine)}</div>`;
            }
        });
        
        return `<div class="output-block">${html}</div>`;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== REVIEW PAGE =====
async function goToReviewPage() {
    const outputBox = document.getElementById('outputText');
    const rawText = outputBox.dataset.rawText;
    
    // Parsa i tool dall'output e ordina alfabeticamente
    reviewData.currentTools = parseToolsForReview(rawText).sort((a, b) => a.tool.localeCompare(b.tool));
    reviewData.manualTools = [];
    
    // Carica tool dal turno precedente non UP
    console.log('Caricando tool dal turno precedente...');
    const prevResult = await getPreviousNonUpTools(currentShift.date, currentShift.type);
    console.log('Risultato turno precedente:', prevResult);
    
    // Salva info turno precedente per visualizzazione
    reviewData.prevShiftDate = prevResult.prevDate ? convertToDisplayDate(prevResult.prevDate) : null;
    reviewData.prevShiftType = prevResult.prevShift || null;
    
    if (prevResult.success && prevResult.data && prevResult.data.length > 0) {
        // Filtra: escludi quelli già commentati in questo passdown
        const currentToolNames = reviewData.currentTools.map(t => t.tool);
        reviewData.previousTools = prevResult.data
            .filter(t => !currentToolNames.includes(t.tool))
            .map(t => ({
                tool: t.tool,
                status: t.status,
                problemStatement: t.problem_statement || '',
                actionsDone: t.actions_done || '',
                toDo: t.to_do || '',
                fromPrevious: true,
                isValidTool: true
            }))
            .sort((a, b) => a.tool.localeCompare(b.tool));
        console.log('Tool precedenti filtrati:', reviewData.previousTools.length);
    } else {
        reviewData.previousTools = [];
        console.log('Nessun tool dal turno precedente trovato');
    }
    
    document.getElementById('mainContent').innerHTML = renderReviewPage();
    setupReviewPageEvents();
    
    // Auto-resize di tutte le textarea e colora status
    setTimeout(() => {
        document.querySelectorAll('.cell-input').forEach(textarea => {
            autoResizeTextarea(textarea);
        });
        document.querySelectorAll('.status-select').forEach(select => {
            const color = getStatusColor(select.value);
            select.style.setProperty('background-color', color, 'important');
            select.style.setProperty('color', getContrastTextColor(color), 'important');
        });
    }, 200);
}

function parseToolsForReview(rawText) {
    const tools = [];
    const blocks = rawText.split('\n\n').filter(b => b.trim());
    
    for (const block of blocks) {
        const lines = block.split('\n');
        const firstLine = lines[0];
        const toolMatch = firstLine.match(/^(.+?):\s*(.*)$/);
        
        if (toolMatch) {
            const toolName = toolMatch[1].trim();
            const statusMarker = toolMatch[2].trim();
            
            // Trova lo stato finale corrispondente
            const statusObj = passdownStatusData.find(s => s.marker === statusMarker);
            const statoFinale = statusObj ? statusObj.statoFinale : statusMarker;
            const colore = statusObj ? statusObj.colore : '#888888';
            
            let ps = '', ad = '', td = '';
            let currentField = '';
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('PS:')) { currentField = 'ps'; ps = line.substring(3).trim(); }
                else if (line.startsWith('AD:')) { currentField = 'ad'; ad = line.substring(3).trim(); }
                else if (line.startsWith('TD:')) { currentField = 'td'; td = line.substring(3).trim(); }
                else if (line && currentField) {
                    if (currentField === 'ps') ps += '\n' + line;
                    else if (currentField === 'ad') ad += '\n' + line;
                    else if (currentField === 'td') td += '\n' + line;
                }
            }
            
            // Verifica se il tool è valido
            const isValidTool = passdownToolsData.includes(toolName);
            
            tools.push({
                tool: toolName,
                status: statoFinale,
                statusMarker: statusMarker,
                colore: colore,
                problemStatement: ps,
                actionsDone: ad,
                toDo: td,
                isValidTool: isValidTool,
                fromPrevious: false
            });
        }
    }
    
    return tools;
}

function renderReviewPage() {
    // Ottieni lista di tutti gli stati finali unici
    const allStatuses = [...new Set(passdownStatusData.map(s => s.statoFinale))];
    
    // Tool già usati (per escluderli dal dropdown manuale)
    const usedTools = [
        ...reviewData.currentTools.map(t => t.tool),
        ...reviewData.previousTools.map(t => t.tool),
        ...reviewData.manualTools.map(t => t.tool)
    ];
    
    const availableTools = passdownToolsData.filter(t => !usedTools.includes(t));
    
    return `
        <div class="review-header card">
            <div class="review-header-content">
                <h1>📋 Revisione Passdown</h1>
                <div class="review-meta">
                    <span class="review-date">${currentShift.date}</span>
                    <span class="review-shift ${currentShift.type.toLowerCase()}">${currentShift.type}</span>
                    <span class="review-workers">👥 ${currentShift.workers.join(', ')}</span>
                </div>
            </div>
        </div>
        
        <!-- SEZIONE 1: Tool commentati in questo passdown -->
        <div class="card mt-3 current-tools-section">
            <div class="card-header">
                <h2 class="card-title">📝 Tool commentati in questo passdown</h2>
            </div>
            <div class="review-table-container">
                <table class="review-table" id="currentToolsTable">
                    <thead>
                        <tr>
                            <th>Tool</th>
                            <th>Status</th>
                            <th>Problem Statement</th>
                            <th>Actions Done</th>
                            <th>To Do</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reviewData.currentTools.map((t, i) => renderToolRow(t, i, 'current', allStatuses)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- SEZIONE 2: Tool dal turno precedente non UP -->
        <div class="card mt-3 previous-tools-warning">
            <div class="card-header">
                ${reviewData.previousTools.length > 0 ? `
                <h2 class="card-title">⚠️ Tools appesi dal turno precedente: ${reviewData.prevShiftDate} ${reviewData.prevShiftType}</h2>
                ` : `
                <h2 class="card-title" style="color: var(--success);">✅ Nessun Tool appeso dal turno precedente</h2>
                `}
            </div>
            ${reviewData.previousTools.length > 0 ? `
            <div class="review-table-container">
                <table class="review-table" id="previousToolsTable">
                    <thead>
                        <tr>
                            <th>Tool</th>
                            <th>Status</th>
                            <th>Problem Statement</th>
                            <th>Actions Done</th>
                            <th>To Do</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reviewData.previousTools.map((t, i) => renderToolRow(t, i, 'previous', allStatuses)).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        </div>

        <!-- SEZIONE 3: Aggiungi tool manualmente -->
        <div class="card mt-3 manual-tools-section">
            <div class="card-header">
                <h2 class="card-title">➕ Aggiungi tool manualmente</h2>
            </div>
            <div class="review-table-container" id="manualToolsContainer">
                <table class="review-table" id="manualToolsTable">
                    <thead>
                        <tr>
                            <th>Tool</th>
                            <th>Status</th>
                            <th>Problem Statement</th>
                            <th>Actions Done</th>
                            <th>To Do</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="manualToolsBody">
                        ${reviewData.manualTools.map((t, i) => renderManualToolRow(t, i, allStatuses, availableTools)).join('')}
                    </tbody>
                </table>
                <button class="btn btn-success mt-2" id="btnAddManualTool">➕ Aggiungi Tool</button>
            </div>
        </div>
        
        <!-- PULSANTE SALVA -->
        <div class="review-actions mt-3">
            <button class="btn btn-secondary btn-lg" id="btnBackToProcessor">← Torna all'editor</button>
            <button class="btn btn-primary btn-lg" id="btnSavePassdown">💾 Salva Passdown</button>
        </div>
    `;
}

function renderToolRow(tool, index, section, allStatuses) {
    const statusColor = getStatusColor(tool.status);
    const isInvalid = !tool.isValidTool && section === 'current';
    
    // Dropdown per tool non valido
    const toolCell = isInvalid ? `
        <select class="form-control tool-select" data-section="${section}" data-index="${index}">
            <option value="${tool.tool}" style="color: red;">${tool.tool} (non valido)</option>
            ${passdownToolsData.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
    ` : `<span class="tool-name">${tool.tool}</span>`;
    
    return `
        <tr data-section="${section}" data-index="${index}">
            <td>${toolCell}</td>
            <td>
                <select class="form-control status-select" data-section="${section}" data-index="${index}" style="background-color: ${statusColor}; color: white; border-radius: 20px; text-align: center;">
                    ${allStatuses.map(s => `<option value="${s}" ${s === tool.status ? 'selected' : ''} style="background-color: ${getStatusColor(s)};">${s}</option>`).join('')}
                </select>
            </td>
            <td><textarea class="form-control cell-input" data-section="${section}" data-index="${index}" data-field="problemStatement">${tool.problemStatement || ''}</textarea></td>
            <td><textarea class="form-control cell-input" data-section="${section}" data-index="${index}" data-field="actionsDone">${tool.actionsDone || ''}</textarea></td>
            <td><textarea class="form-control cell-input" data-section="${section}" data-index="${index}" data-field="toDo">${tool.toDo || ''}</textarea></td>
        </tr>
    `;
}

function renderManualToolRow(tool, index, allStatuses, availableTools) {
    const statusColor = getStatusColor(tool.status);
    
    return `
        <tr data-section="manual" data-index="${index}">
            <td>
                <select class="form-control tool-select" data-section="manual" data-index="${index}">
                    <option value="">-- Seleziona --</option>
                    ${availableTools.map(t => `<option value="${t}" ${t === tool.tool ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </td>
            <td>
                <select class="form-control status-select" data-section="manual" data-index="${index}" style="background-color: ${statusColor}; color: white; border-radius: 20px; text-align: center;">
                    ${allStatuses.map(s => `<option value="${s}" ${s === tool.status ? 'selected' : ''} style="background-color: ${getStatusColor(s)};">${s}</option>`).join('')}
                </select>
            </td>
            <td><textarea class="form-control cell-input" data-section="manual" data-index="${index}" data-field="problemStatement">${tool.problemStatement || ''}</textarea></td>
            <td><textarea class="form-control cell-input" data-section="manual" data-index="${index}" data-field="actionsDone">${tool.actionsDone || ''}</textarea></td>
            <td><textarea class="form-control cell-input" data-section="manual" data-index="${index}" data-field="toDo">${tool.toDo || ''}</textarea></td>
            <td><button class="btn btn-danger btn-sm" onclick="removeManualTool(${index})">🗑️</button></td>
        </tr>
    `;
}

function getStatusColor(status) {
    const statusObj = passdownStatusData.find(s => s.statoFinale === status);
    return statusObj ? statusObj.colore : '#888888';
}

function getContrastTextColor(hexColor) {
    // Rimuovi # se presente
    const hex = hexColor.replace('#', '');
    
    // Converti in RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calcola luminosità (formula standard)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Se luminoso -> testo nero, se scuro -> testo bianco
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

function setupReviewPageEvents() {
    // Status select change - aggiorna colore
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const color = getStatusColor(e.target.value);
            e.target.style.setProperty('background-color', color, 'important');
            e.target.style.setProperty('color', getContrastTextColor(color), 'important');
            
            // Aggiorna i dati
            const section = e.target.dataset.section;
            const index = parseInt(e.target.dataset.index);
            updateReviewData(section, index, 'status', e.target.value);
        });
    });
    
    // Tool select change
    document.querySelectorAll('.tool-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const section = e.target.dataset.section;
            const index = parseInt(e.target.dataset.index);
            updateReviewData(section, index, 'tool', e.target.value);
        });
    });
    
    // Textarea change + auto-resize + hover expand
    document.querySelectorAll('.cell-input').forEach(textarea => {
        let hoverTimeout;
        
        // Auto-resize on input
        textarea.addEventListener('input', (e) => {
            const section = e.target.dataset.section;
            const index = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            updateReviewData(section, index, field, e.target.value);
        });
        
        // Espandi al click
        textarea.addEventListener('focus', () => {
            textarea.classList.add('expanded');
        });
        
        // Riduci quando perde il focus
        textarea.addEventListener('blur', () => {
            textarea.classList.remove('expanded');
        });
        
        // Espandi dopo 2 secondi di hover
        textarea.addEventListener('mouseenter', () => {
            hoverTimeout = setTimeout(() => {
                textarea.classList.add('expanded');
            }, 2000);
        });
        
        // Cancella il timeout se il mouse esce prima
        textarea.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            // Rimuovi expanded solo se non ha il focus
            if (document.activeElement !== textarea) {
                textarea.classList.remove('expanded');
            }
        });
    });
    
    // Aggiungi tool manuale
    document.getElementById('btnAddManualTool').addEventListener('click', addManualTool);
    
    // Torna all'editor
    document.getElementById('btnBackToProcessor').addEventListener('click', goToPassdownProcessor);
    
    // Salva passdown
    document.getElementById('btnSavePassdown').addEventListener('click', savePassdownFinal);
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(28, textarea.scrollHeight) + 'px';
}

function updateReviewData(section, index, field, value) {
    let dataArray;
    if (section === 'current') dataArray = reviewData.currentTools;
    else if (section === 'previous') dataArray = reviewData.previousTools;
    else if (section === 'manual') dataArray = reviewData.manualTools;
    
    if (dataArray && dataArray[index]) {
        dataArray[index][field] = value;
    }
}

function addManualTool() {
    const usedTools = [
        ...reviewData.currentTools.map(t => t.tool),
        ...reviewData.previousTools.map(t => t.tool),
        ...reviewData.manualTools.map(t => t.tool)
    ];
    
    reviewData.manualTools.push({
        tool: '',
        status: 'DOWN',
        problemStatement: '',
        actionsDone: '',
        toDo: ''
    });
    
    // Re-render la pagina
    document.getElementById('mainContent').innerHTML = renderReviewPage();
    setupReviewPageEvents();
}

function removeManualTool(index) {
    reviewData.manualTools.splice(index, 1);
    document.getElementById('mainContent').innerHTML = renderReviewPage();
    setupReviewPageEvents();
}

async function savePassdownFinal() {
    // Raccogli tutti i tool
    const allTools = [
        ...reviewData.currentTools,
        ...reviewData.previousTools,
        ...reviewData.manualTools.filter(t => t.tool) // Solo quelli con tool selezionato
    ];
    
    if (allTools.length === 0) {
        alert('Nessun tool da salvare!');
        return;
    }
    
    // Prepara i record per il database
    const dbDate = convertToDbDate(currentShift.date);
    const records = allTools.map(t => ({
        tool: t.tool,
        data: dbDate,
        shift: currentShift.type,
        workers: currentShift.workers.join(', '),
        status: t.status,
        problemStatement: t.problemStatement || '',
        actionsDone: t.actionsDone || '',
        toDo: t.toDo || ''
    }));
    
    // Salva
    const result = await savePassdownBatch(records);
    
    if (result.success) {
        alert(`✅ Passdown salvato con successo!\n\n${result.count} tool salvati nel database.`);
        // Torna alla home
        navigateTo('home');
    } else {
        alert(`❌ Errore nel salvataggio:\n\n${result.error}`);
    }
}

// ===== PROCESSING FUNCTIONS =====
const MARKER_INDENT = "               ";
const MERGE_INDENT = "                      ";

function phaseOne(rawText) {
    let text = rawText;
    const replacements = {
        '_HX': '_MF', '_HX1': '_MF', '_HX2': '_MF', '_HX3': '_MF', '_HX4': '_MF',
        '_LL': '_MF', '_LL1': '_MF', '_LL2': '_MF', '_LLA': '_MF', '_LLB': '_MF',
        '_FI': '_MF'
    };

    for (const [old, newVal] of Object.entries(replacements)) {
        text = text.replace(new RegExp(old, 'gi'), newVal);
    }

    const lines = text.split(/\r?\n/);
    const result = [];
    let currentTools = [];
    let currentStatus = "";
    let currentBlock = [];

    for (let line of lines) {
        const originalLine = line;
        let trimmedLine = line.trim();
        trimmedLine = trimmedLine.replace(/^[•\-\*○◦►▸]\s*/, '');

        const toolMatch = trimmedLine.match(/^(.+?):\s*(.*)$/);
        
        let isValidTool = false;
        let isMalformedTool = false;
        
        if (toolMatch) {
            const possibleTool = toolMatch[1].trim();
            const underscoreCount = (possibleTool.match(/_/g) || []).length;
            isValidTool = possibleTool.length <= 20 && 
                          underscoreCount === 1 &&
                          /^[A-Z0-9]+_[A-Z0-9,\/]+$/i.test(possibleTool);
            
            if (!isValidTool && 
                possibleTool.length <= 15 && 
                underscoreCount === 0 &&
                /^[A-Z]+[0-9]+$/i.test(possibleTool)) {
                isMalformedTool = true;
            }
        }

        if (toolMatch && (isValidTool || isMalformedTool)) {
            if (currentTools.length > 0) {
                writeBlock(result, currentTools, currentStatus, currentBlock);
            }

            let toolPart = toolMatch[1].trim().toUpperCase();
            let statusPart = toolMatch[2].trim().toUpperCase();

            if (isMalformedTool) {
                toolPart = "[MALFORMED]" + toolPart;
            }

            const multiMatch = toolPart.match(/^([A-Z0-9]+_)([A-Z,\/]+)$/);
            if (multiMatch) {
                const base = multiMatch[1];
                const suffixes = multiMatch[2].replace(/\//g, ',').split(',').filter(s => s);
                currentTools = suffixes.map(suf => base + suf);
            } else {
                currentTools = [toolPart];
            }

            currentStatus = statusPart;
            currentBlock = [];
        } else if (trimmedLine) {
            currentBlock.push(originalLine);
        }
    }

    if (currentTools.length > 0) {
        writeBlock(result, currentTools, currentStatus, currentBlock);
    }

    return result.join('\n\n');
}

function writeBlock(result, tools, status, blockLines) {
    const parsed = parseMarkers(blockLines);
    
    for (const tool of tools) {
        let block = tool + ': ' + status + '\n';
        if (parsed.ps?.trim()) block += MARKER_INDENT + 'PS: ' + formatMarkerContent(parsed.ps) + '\n';
        if (parsed.ad?.trim()) block += MARKER_INDENT + 'AD: ' + formatMarkerContent(parsed.ad) + '\n';
        if (parsed.td?.trim()) block += MARKER_INDENT + 'TD: ' + formatMarkerContent(parsed.td) + '\n';
        result.push(block.trim());
    }
}

function parseMarkers(lines) {
    let ps = "", ad = "", td = "";
    let currentMarker = "";

    for (let line of lines) {
        const trimmed = line.trim();
        const upper = trimmed.toUpperCase();

        if (upper.match(/^PS\s*:/)) {
            currentMarker = "ps";
            line = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        } else if (upper.match(/^AD\s*:/)) {
            currentMarker = "ad";
            line = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        } else if (upper.match(/^(TD\s*:|TO\s*DO\s*:)/)) {
            currentMarker = "td";
            line = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        } else {
            line = trimmed;
        }

        if (currentMarker && line) {
            if (currentMarker === "ps") ps += (ps ? "\n" : "") + line;
            else if (currentMarker === "ad") ad += (ad ? "\n" : "") + line;
            else if (currentMarker === "td") td += (td ? "\n" : "") + line;
        }
    }

    return { ps, ad, td };
}

function formatMarkerContent(content) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length <= 1) return content;
    return '\n' + lines.map(l => MARKER_INDENT + "    " + l).join('\n');
}

function phaseTwo(firstEditingText) {
    const blocks = firstEditingText.split(/\n\n+/).filter(b => b.trim());
    const toolMap = new Map();

    for (const block of blocks) {
        const lines = block.split('\n');
        const headerMatch = lines[0].match(/^(.+?):\s*(.*)$/);
        if (!headerMatch) continue;

        const tool = headerMatch[1].trim();
        const status = headerMatch[2].trim();
        let ps = "", ad = "", td = "", currentField = "";

        for (let j = 1; j < lines.length; j++) {
            const trimmed = lines[j].trim();
            if (trimmed.startsWith('PS:')) { currentField = "ps"; ps = trimmed.substring(3).trim(); }
            else if (trimmed.startsWith('AD:')) { currentField = "ad"; ad = trimmed.substring(3).trim(); }
            else if (trimmed.startsWith('TD:')) { currentField = "td"; td = trimmed.substring(3).trim(); }
            else if (trimmed) {
                if (currentField === "ps") ps += "\n" + trimmed;
                else if (currentField === "ad") ad += "\n" + trimmed;
                else if (currentField === "td") td += "\n" + trimmed;
            }
        }

        if (!toolMap.has(tool)) toolMap.set(tool, []);
        toolMap.get(tool).push({ status, ps, ad, td });
    }

    const result = [];
    for (const [tool, blockList] of toolMap) {
        if (blockList.length === 1) {
            const b = blockList[0];
            let block = tool + ': ' + b.status + '\n';
            if (b.ps?.trim()) block += MARKER_INDENT + 'PS: ' + formatMarkerContent(b.ps) + '\n';
            if (b.ad?.trim()) block += MARKER_INDENT + 'AD: ' + formatMarkerContent(b.ad) + '\n';
            if (b.td?.trim()) block += MARKER_INDENT + 'TD: ' + formatMarkerContent(b.td) + '\n';
            result.push(block.trim());
        } else {
            const statusParts = [], psParts = [], adParts = [], tdParts = [];
            for (const b of blockList) {
                if (b.status?.trim()) statusParts.push(b.status);
                if (b.ps?.trim()) psParts.push(b.ps);
                if (b.ad?.trim()) adParts.push(b.ad);
                if (b.td?.trim()) tdParts.push(b.td);
            }
            let block = tool + ': ' + statusParts.join('\n' + MERGE_INDENT + '&&& ') + '\n';
            if (psParts.length) block += MARKER_INDENT + 'PS: ' + psParts.join('\n' + MERGE_INDENT + '&&& ') + '\n';
            if (adParts.length) block += MARKER_INDENT + 'AD: ' + adParts.join('\n' + MERGE_INDENT + '&&& ') + '\n';
            if (tdParts.length) block += MARKER_INDENT + 'TD: ' + tdParts.join('\n' + MERGE_INDENT + '&&& ') + '\n';
            result.push(block.trim());
        }
    }

    return result.join('\n\n');
}

function validateOutput(processedText) {
    const warnings = [];
    const blocks = processedText.split('\n\n').filter(b => b.trim());
    
    const validStatusMarkers = passdownStatusData.map(s => s.marker);
    
    for (const block of blocks) {
        const lines = block.split('\n');
        const firstLine = lines[0];
        const tool = firstLine.split(':')[0].trim();
        const status = firstLine.split(':').slice(1).join(':').trim();
        
        if (tool.includes('[MALFORMED]')) {
            const cleanTool = tool.replace('[MALFORMED]', '');
            warnings.push(`⚠️ "${cleanTool}" sembra un tool ma manca il suffisso (_A, _B, _MF)`);
            continue;
        }
        
        if (passdownToolsData.length > 0 && !passdownToolsData.includes(tool)) {
            warnings.push(`⚠️ "${tool}" Tool non riconosciuto`);
        }
        
        if (validStatusMarkers.length > 0) {
            const statusParts = status.split('&&&').map(s => s.trim()).filter(s => s);
            for (const st of statusParts) {
                if (!validStatusMarkers.includes(st)) {
                    warnings.push(`⚠️ Status "${st}" di ${tool} non riconosciuto`);
                }
            }
        }
        
        if (block.includes('&&&')) {
            warnings.push(`ℹ️ ${tool} contiene un merge, verifica lo stato corretto`);
        }
        
        if (!block.includes('PS:')) {
            warnings.push(`⚠️ ${tool} manca di PS:`);
        }
        
        if (!block.includes('AD:')) {
            warnings.push(`⚠️ ${tool} manca di AD:`);
        }
    }
    
    return warnings;
}
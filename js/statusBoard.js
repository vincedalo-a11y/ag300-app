// ===== STATUS BOARD =====
let statusBoardStructure = null;

// Carica la struttura dello status board
async function loadStatusBoardStructure() {
    if (statusBoardStructure) return statusBoardStructure;
    
    try {
        const response = await fetch('data/statusBoard.json');
        statusBoardStructure = await response.json();
        return statusBoardStructure;
    } catch (e) {
        console.error('Errore caricamento struttura status board:', e);
        return null;
    }
}

// Genera lo Status Board dall'ultimo turno salvato
async function renderStatusBoardPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="loading">Caricamento Status Board...</div>`;
    
    // Carica struttura
    const structure = await loadStatusBoardStructure();
    if (!structure) {
        main.innerHTML = `
            <div class="card">
                <div class="placeholder-content">
                    <div class="placeholder-icon">❌</div>
                    <div class="placeholder-text">Errore nel caricamento della struttura Status Board</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Carica ultimo turno dal database
    const lastShift = await getLastShiftData();
    if (!lastShift.success || lastShift.data.length === 0) {
        main.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">📊 Status Board</h1>
                <p class="page-subtitle">Nessun turno trovato nel database</p>
            </div>
            <div class="card">
                <div class="placeholder-content">
                    <div class="placeholder-icon">📭</div>
                    <div class="placeholder-text">Non ci sono passdown salvati nel database.<br>Carica un passdown per visualizzare lo Status Board.</div>
                </div>
            </div>
        `;
        return;
    }
    
    const shiftData = lastShift.data;
    const shiftDate = convertToDisplayDate(shiftData[0].data);
    const shiftType = shiftData[0].shift;
    
    // Crea mappa tool -> status
    const toolStatusMap = {};
    shiftData.forEach(row => {
        toolStatusMap[row.tool] = row.status;
    });
    
    // Genera le due tabelle affiancate
    const frontEndSection = structure.sections.find(s => s.name === 'FRONT END');
    const backEndSection = structure.sections.find(s => s.name === 'BACK END');
    
    const frontEndTable = generateSectionTable(frontEndSection, toolStatusMap, 'front-end');
    const backEndTable = generateSectionTable(backEndSection, toolStatusMap, 'back-end');
    
    main.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">📊 Status Board</h1>
            <p class="page-subtitle">Ultimo turno: ${shiftDate} - ${shiftType}</p>
        </div>
        
        <div class="card no-print" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary" id="btnCopyStatusBoard">📋 Copia come immagine</button>
                <button class="btn btn-secondary" id="btnPrintStatusBoard">🖨️ Stampa</button>
                <button class="btn btn-secondary" id="btnBackFromSB">← Torna alla Home</button>
            </div>
        </div>
        
        <div class="status-board-container" id="statusBoardContainer">
            <div class="status-board-title">ST AG300 CONTRACT / DSM TOOLS STATUS of ${shiftDate} ${shiftType} SHIFT</div>
            <div class="status-board-wrapper">
                <div class="status-board-section">
                    <div class="status-board-header front-end">FRONT END</div>
                    ${frontEndTable}
                </div>
                <div class="status-board-section">
                    <div class="status-board-header back-end">BACK END</div>
                    ${backEndTable}
                </div>
            </div>
        </div>
    `;
    
    setupStatusBoardEvents();
}

// Genera tabella per una sezione (FRONT END o BACK END)
function generateSectionTable(section, toolStatusMap, sectionClass) {
    let html = `
        <table class="status-board ${sectionClass}">
            <thead>
                <tr>
                    <th class="header-col">Group</th>
                    <th class="header-col">Tool</th>
                    <th class="header-col">MF</th>
                    <th class="header-col">Ch A</th>
                    <th class="header-col">Ch B</th>
                    <th class="header-col">Ch C</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const group of section.groups) {
        let isFirstGroupRow = true;
        
        for (const toolObj of group.tools) {
            const toolBase = toolObj.base;
            const chambers = toolObj.chambers;
            
            html += '<tr>';
            
            // Group name
            if (isFirstGroupRow) {
                html += `<td class="group-name" rowspan="${group.tools.length}">${group.name.replace(/\\n/g, '<br>')}</td>`;
                isFirstGroupRow = false;
            }
            
            // Tool name
            html += `<td class="tool-name">${toolBase}</td>`;
            
            // Status cells for MF, A, B, C
            const suffixKeys = ['MF', 'A', 'B', 'C'];
            for (const key of suffixKeys) {
                const chamberLabel = chambers[key];
                
                // Se chamberLabel è null, la cella non esiste
                if (chamberLabel === null) {
                    html += `<td class="status-cell status-empty"></td>`;
                } else {
                    const fullToolName = toolBase + '_' + key;
                    const status = toolStatusMap[fullToolName] || 'UP';
                    const statusClass = getStatusClass(status);
                    
                    html += `
                        <td class="status-cell ${statusClass}">
                            ${chamberLabel ? `<span class="chamber-label">${chamberLabel}</span>` : ''}
                            <span class="status-value">${status}</span>
                        </td>
                    `;
                }
            }
            
            html += '</tr>';
        }
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

// Converte lo status in classe CSS
function getStatusClass(status) {
    if (!status) return 'status-up';
    
    const statusLower = status.toLowerCase().replace(/\s+/g, '-');
    
    const statusMap = {
        'up': 'status-up',
        'down': 'status-down',
        'qual': 'status-qual',
        'usd': 'status-usd',
        'pm': 'status-pm',
        'hold-spc': 'status-hold-spc',
        'eng-eval': 'status-eng-eval',
        'facility': 'status-facility',
        'eng': 'status-eng',
        'hold': 'status-hold',
        'repair-wait': 'status-repair-wait',
        'mon': 'status-mon',
        'warm-idle': 'status-warm-idle',
        'startup': 'status-startup'
    };
    
    return statusMap[statusLower] || 'status-unknown';
}

// Carica tutti i dati dell'ultimo turno
async function getLastShiftData() {
    try {
        // Prima trova l'ultimo turno
        const { data: lastRow, error: lastError } = await db
            .from('passdowns')
            .select('data, shift')
            .order('id', { ascending: false })
            .limit(1);
        
        if (lastError) throw lastError;
        
        if (!lastRow || lastRow.length === 0) {
            return { success: true, data: [] };
        }
        
        const lastDate = lastRow[0].data;
        const lastShift = lastRow[0].shift;
        
        // Poi carica tutti i tool di quel turno
        const { data, error } = await db
            .from('passdowns')
            .select('*')
            .eq('data', lastDate)
            .eq('shift', lastShift);
        
        if (error) throw error;
        
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Errore caricamento ultimo turno:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// Setup eventi Status Board
function setupStatusBoardEvents() {
    document.getElementById('btnBackFromSB')?.addEventListener('click', () => {
        navigateTo('home');
    });
    
    document.getElementById('btnPrintStatusBoard')?.addEventListener('click', () => {
        window.print();
    });
    
    document.getElementById('btnCopyStatusBoard')?.addEventListener('click', async () => {
        try {
            const container = document.getElementById('statusBoardContainer');
            
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(container, {
                    backgroundColor: '#ffffff',
                    scale: 2
                });
                
                canvas.toBlob(blob => {
                    navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]).then(() => {
                        alert('✅ Status Board copiato negli appunti!');
                    }).catch(err => {
                        console.error('Errore copia:', err);
                        alert('❌ Errore nella copia. Prova a stampare invece.');
                    });
                });
            } else {
                alert('⚠️ Funzione non disponibile. Usa la stampa invece.');
            }
        } catch (e) {
            console.error('Errore:', e);
            alert('❌ Errore nella copia');
        }
    });
}

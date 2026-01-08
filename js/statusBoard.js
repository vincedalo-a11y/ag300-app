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
    
    // Genera elenco passdown
    const passdownList = generatePassdownList(shiftData);
    
    main.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">📊 Status Board</h1>
            <p class="page-subtitle">Ultimo turno: ${shiftDate} - ${shiftType}</p>
        </div>
        
        <div class="card no-print" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-secondary" id="btnBackFromSB">← Torna alla Home</button>
                <button class="btn btn-primary" id="btnMailAMAT">📧 Invia Mail AMAT</button>
                <button class="btn btn-primary" id="btnMailST">📧 Prepara Mail ST</button>
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
        
        <div class="card passdown-list-card">
            <h2 class="passdown-list-title">📋 Dettaglio Passdown - ${shiftDate} ${shiftType}</h2>
            <div class="passdown-list-container">
                ${passdownList}
            </div>
        </div>
    `;
    
    setupStatusBoardEvents();
}

// Genera l'elenco del passdown
function generatePassdownList(shiftData) {
    // Filtra solo i tool che hanno dati (non UP di default o con commenti)
    const toolsWithData = shiftData.filter(row => 
        row.status !== 'UP' || 
        row.problem_statement || 
        row.actions_done || 
        row.to_do
    );
    
    if (toolsWithData.length === 0) {
        return `<div class="passdown-list-empty">Tutti i tool sono UP senza commenti</div>`;
    }
    
    let html = `
        <table class="passdown-list-table">
            <thead>
                <tr>
                    <th class="pl-col-tool">Tool</th>
                    <th class="pl-col-status">Status</th>
                    <th class="pl-col-ps">Problem Statement</th>
                    <th class="pl-col-ad">Actions Done</th>
                    <th class="pl-col-td">To Do</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    toolsWithData.forEach(row => {
        const statusColor = getStatusColor(row.status);
        const textColor = getContrastTextColor(statusColor);
        
        html += `
            <tr>
                <td class="pl-cell-tool">${row.tool || ''}</td>
                <td class="pl-cell-status">
                    <span class="status-badge-pl" style="background-color: ${statusColor}; color: ${textColor};">
                        ${row.status || 'UP'}
                    </span>
                </td>
                <td class="pl-cell-text">${row.problem_statement || ''}</td>
                <td class="pl-cell-text">${row.actions_done || ''}</td>
                <td class="pl-cell-text">${row.to_do || ''}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
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
// Setup eventi Status Board
function setupStatusBoardEvents() {
    document.getElementById('btnBackFromSB')?.addEventListener('click', () => {
        navigateTo('home');
    });
    
    document.getElementById('btnMailAMAT')?.addEventListener('click', async () => {
        await sendMailAMAT();
    });
    
    document.getElementById('btnMailST')?.addEventListener('click', () => {
        // TODO: Implementare preparazione mail ST
        alert('Funzione Prepara Mail ST - Da implementare');
    });
}

// Invia Mail AMAT
// Invia Mail AMAT
async function sendMailAMAT() {
    try {
        // Carica destinatari dal JSON
        const response = await fetch('data/mailAMAT.json');
        const mailData = await response.json();
        
        const to = mailData.to.join(';');
        const cc = mailData.cc.join(';');
        
        // Prendi data e shift dalla pagina
        const subtitle = document.querySelector('.page-subtitle')?.textContent || '';
        const match = subtitle.match(/Ultimo turno: (.+) - (.+)/);
        const shiftDate = match ? match[1] : '';
        const shiftType = match ? match[2] : '';
        
        // Oggetto mail
        const subject = `PASSDOWN ${shiftDate} ${shiftType} MSA CVD AG300`;
        
        // Corpo mail
        const mailBody = `Dear All,

Please find below the status of the DSM tools in AG300.

`;
        
        // Apri subito Outlook
        const mailtoLink = `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
        window.open(mailtoLink, '_self');
        
        // Poi copia le tabelle
        setTimeout(async () => {
            try {
                const statusBoardContainer = document.getElementById('statusBoardContainer');
                const passdownListCard = document.querySelector('.passdown-list-card');
                
                if (typeof html2canvas !== 'undefined' && statusBoardContainer) {
                    const tempContainer = document.createElement('div');
                    tempContainer.style.background = 'white';
                    tempContainer.style.padding = '20px';
                    tempContainer.innerHTML = statusBoardContainer.outerHTML + (passdownListCard ? passdownListCard.outerHTML : '');
                    document.body.appendChild(tempContainer);
                    
                    const canvas = await html2canvas(tempContainer, {
                        backgroundColor: '#ffffff',
                        scale: 2
                    });
                    
                    document.body.removeChild(tempContainer);
                    
                    canvas.toBlob(async blob => {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            alert('✅ Status Board copiato!\n\nIncolla con Ctrl+V nella mail.');
                        } catch (err) {
                            console.log('Copia automatica non riuscita');
                        }
                    });
                }
            } catch (e) {
                console.log('Errore copia:', e);
            }
        }, 500);
        
    } catch (e) {
        console.error('Errore invio mail AMAT:', e);
        alert('❌ Errore nella preparazione della mail');
    }
}
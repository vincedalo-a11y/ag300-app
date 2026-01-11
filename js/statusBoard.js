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
function setupStatusBoardEvents() {
    document.getElementById('btnBackFromSB')?.addEventListener('click', () => {
        navigateTo('home');
    });
    
    document.getElementById('btnMailAMAT')?.addEventListener('click', sendMailAMAT);
    
    document.getElementById('btnMailST')?.addEventListener('click', () => {
        renderMailSTPage();
    });
}

// Invia Mail AMAT
async function sendMailAMAT() {
    const btn = document.getElementById('btnMailAMAT');
    btn.textContent = '⏳ Preparando...';
    btn.disabled = true;
    
    try {
        const statusBoardContainer = document.getElementById('statusBoardContainer');
        const passdownListCard = document.querySelector('.passdown-list-card');
        
        // Crea container con testo introduttivo + tabelle
        const tempContainer = document.createElement('div');
        tempContainer.style.background = 'white';
        tempContainer.style.padding = '30px';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.fontFamily = 'Calibri, Arial, sans-serif';
        tempContainer.innerHTML = `
            <p style="font-size: 18px; margin: 0 0 5px 0; color: #000000;">Dear All,</p>
            <p style="font-size: 18px; margin: 0 0 25px 0; color: #000000;">Please find below the status of the DSM tools in AG300.</p>
            ${statusBoardContainer.outerHTML}
            ${passdownListCard ? passdownListCard.outerHTML : ''}
        `;
        document.body.appendChild(tempContainer);
        
        const canvas = await html2canvas(tempContainer, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true
        });
        
        document.body.removeChild(tempContainer);
        
        // Mostra immagine trascinabile
        const existingPreview = document.getElementById('imagePreviewContainer');
        if (existingPreview) existingPreview.remove();
        
        const previewContainer = document.createElement('div');
        previewContainer.id = 'imagePreviewContainer';
        previewContainer.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid #0a84ff; border-radius: 16px; padding: 20px; margin-top: 20px; box-shadow: 0 8px 32px rgba(10, 132, 255, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; color: #ffffff; font-size: 1.2rem;">📷 Immagine Passdown Pronta</h3>
                    <button id="btnClosePreview" style="background: #ff3b30; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">✕ Chiudi</button>
                </div>
                <div style="background: rgba(10, 132, 255, 0.1); border-radius: 10px; padding: 15px; margin-bottom: 16px;">
                    <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 1rem;">📌 <strong>Come procedere:</strong></p>
                    <ol style="color: #cccccc; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li><strong>Tasto destro</strong> sull'immagine qui sotto</li>
                        <li>Seleziona <strong>"Copia immagine"</strong></li>
                        <li>Nella mail di Outlook, clicca <strong>sopra la firma</strong></li>
                        <li>Incolla con <strong>Ctrl+V</strong></li>
                    </ol>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; overflow: auto; max-height: 500px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);">
                    <img src="${canvas.toDataURL('image/png')}" style="max-width: 100%; display: block; border-radius: 4px;" draggable="true" />
                </div>
            </div>
        `;
        
        const btnCard = document.querySelector('.no-print');
        btnCard.parentNode.insertBefore(previewContainer, btnCard.nextSibling);
        
        document.getElementById('btnClosePreview').addEventListener('click', () => {
            previewContainer.remove();
        });
        
        // Carica destinatari
        const response = await fetch('data/mailAMAT.json');
        const mailData = await response.json();
        
        const to = mailData.to.join(';');
        const cc = mailData.cc.join(';');
        
        const subtitle = document.querySelector('.page-subtitle')?.textContent || '';
        const match = subtitle.match(/Ultimo turno: (.+) - (.+)/);
        const shiftDate = match ? match[1] : '';
        const shiftType = match ? match[2] : '';
        
        const subject = `PASSDOWN ${shiftDate} ${shiftType} SHIFT MSA CVD AG300`;
        
        const mailtoLink = `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}`;
        
        btn.textContent = '📧 Invia Mail AMAT';
        btn.disabled = false;
        
        // Scrolla alla preview
        previewContainer.scrollIntoView({ behavior: 'smooth' });
        
        // Apri mail dopo un attimo
        setTimeout(() => {
            window.location.href = mailtoLink;
        }, 500);
        
    } catch (e) {
        console.error('Errore:', e);
        btn.textContent = '📧 Invia Mail AMAT';
        btn.disabled = false;
        alert('❌ Errore nella preparazione della mail');
    }
}

// ===== PREPARA MAIL ST =====
let mailSTData = [];

async function renderMailSTPage() {
    const main = document.getElementById('mainContent');
    
    // Carica ultimo turno dal database
    const lastShift = await getLastShiftData();
    if (!lastShift.success || lastShift.data.length === 0) {
        alert('Nessun passdown trovato');
        return;
    }
    
    const shiftData = lastShift.data;
    const shiftDate = convertToDisplayDate(shiftData[0].data);
    const shiftType = shiftData[0].shift;
    
    // Filtra solo righe con PS o AD
    mailSTData = shiftData.filter(row => 
        (row.problem_statement && row.problem_statement.trim()) || 
        (row.actions_done && row.actions_done.trim())
    ).map(row => ({
        ...row,
        hidden: false
    }));
    
    const tableRows = mailSTData.map((row, index) => `
        <tr class="st-row-toggleable" data-index="${index}" id="stRow_${index}">
            <td class="st-cell-checkbox">
                <input type="checkbox" class="st-hide-checkbox" data-index="${index}" id="stCheck_${index}">
            </td>
            <td class="st-cell-tool">${row.tool || ''}</td>
            <td class="st-cell-text">
                <textarea class="st-editable" data-index="${index}" data-field="problem_statement">${row.problem_statement || ''}</textarea>
            </td>
            <td class="st-cell-text">
                <textarea class="st-editable" data-index="${index}" data-field="actions_done">${row.actions_done || ''}</textarea>
            </td>
        </tr>
    `).join('');
    
    main.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">📧 Prepara Mail ST</h1>
            <p class="page-subtitle">${shiftDate} - ${shiftType}</p>
        </div>
        
        <div class="card no-print" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-secondary" id="btnBackFromMailST">← Torna a Status Board</button>
                <button class="btn btn-primary" id="btnSendMailST">📧 Invia Mail ST</button>
            </div>
        </div>
        
        <div class="card st-panel">
            <div class="st-panel-header">
                <h3>📤 Contenuto Mail ST</h3>
                <span class="st-panel-subtitle">Seleziona le righe da nascondere • Modifica PS e AD se necessario</span>
            </div>
            <div class="st-panel-content">
                <table class="st-table">
                    <thead>
                        <tr>
                            <th class="st-col-check">Nascondi</th>
                            <th class="st-col-tool">Tool</th>
                            <th class="st-col-ps">Problem Statement</th>
                            <th class="st-col-ad">Actions Done</th>
                        </tr>
                    </thead>
                    <tbody id="stMailBody">
                        ${tableRows || '<tr><td colspan="4" class="st-empty">Nessun dato con PS o AD</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    setupMailSTEvents();
}

function setupMailSTEvents() {
    document.getElementById('btnBackFromMailST')?.addEventListener('click', () => {
        renderStatusBoardPage();
    });
    
    document.getElementById('btnSendMailST')?.addEventListener('click', sendMailST);
    
    // Toggle righe
    document.querySelectorAll('.st-hide-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = e.target.dataset.index;
            const row = document.getElementById(`stRow_${index}`);
            
            if (e.target.checked) {
                row.classList.add('st-row-hidden');
                mailSTData[index].hidden = true;
            } else {
                row.classList.remove('st-row-hidden');
                mailSTData[index].hidden = false;
            }
        });
    });
    
    // Modifica PS e AD
    document.querySelectorAll('.st-editable').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const index = e.target.dataset.index;
            const field = e.target.dataset.field;
            mailSTData[index][field] = e.target.value;
        });
    });
}

async function sendMailST() {
    const btn = document.getElementById('btnSendMailST');
    btn.textContent = '⏳ Preparando...';
    btn.disabled = true;
    
    try {
        // Filtra righe non nascoste
        const visibleRows = mailSTData.filter(row => !row.hidden);
        
        if (visibleRows.length === 0) {
            alert('⚠️ Tutte le righe sono nascoste. Deseleziona almeno una riga.');
            btn.textContent = '📧 Invia Mail ST';
            btn.disabled = false;
            return;
        }
        
        // Prendi data e shift
        const subtitle = document.querySelector('.page-subtitle')?.textContent || '';
        const parts = subtitle.split(' - ');
        const shiftDate = parts[0] || '';
        const shiftType = parts[1] || '';
        
        // Testo introduttivo in base allo shift
        let bodyText = '';
        if (shiftType.toUpperCase() === 'DAY') {
            bodyText = 'Good evening,\nHere below the activities performed during the day shift:\n\n';
        } else {
            bodyText = 'Good morning,\nHere below the activities performed during the night shift:\n\n';
        }
        
        // Crea testo della tabella
        visibleRows.forEach(row => {
            const ps = row.problem_statement ? row.problem_statement.trim() : '';
            const ad = row.actions_done ? row.actions_done.trim() : '';
            
            bodyText += `• ${row.tool}: ${ps}\n`;
            if (ad) {
                bodyText += `\t\t${ad}\n`;
            }
            bodyText += '\n';
        });
        
        // Copia il testo negli appunti (metodo compatibile)
        const textArea = document.createElement('textarea');
        textArea.value = bodyText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Carica destinatari
        const response = await fetch('data/mailST.json');
        const mailData = await response.json();
        
        const to = mailData.to.join(';');
        const cc = mailData.cc.join(';');
        
        // Oggetto: DAILY ACTIONS o NIGHT ACTIONS
        const actionType = shiftType.toUpperCase() === 'DAY' ? 'DAILY' : 'NIGHT';
        const subject = `${actionType} ACTIONS ${shiftDate}`;
        
        // Apri mail SENZA body (così Outlook mette la firma)
        const mailtoLink = `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}`;
        
        btn.textContent = '📧 Invia Mail ST';
        btn.disabled = false;
        
        alert('✅ Contenuto copiato!\n\n1. Si aprirà Outlook con la firma\n2. Clicca sopra la firma e incolla con Ctrl+V');
        
        window.location.href = mailtoLink;
        
    } catch (e) {
        console.error('Errore:', e);
        btn.textContent = '📧 Invia Mail ST';
        btn.disabled = false;
        alert('❌ Errore nella preparazione della mail');
    }
}

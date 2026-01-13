// ===== FAIL-EXCLUDED MODULE =====

let failExcludedData = [];
let failExcludedToolsList = [];
let isFullHistoryLoaded = false;

// Converte datetime-local in ISO string con timezone esplicito
function toLocalISOString(datetimeLocalValue) {
    if (!datetimeLocalValue) return null;
    
    const date = new Date(datetimeLocalValue);
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    return `${datetimeLocalValue}:00${offsetStr}`;
}

// ===== DATABASE FUNCTIONS =====

// Carica ultime N righe (default 100)
async function loadFailExcluded(limit = 100) {
    try {
        const { data, error } = await db
            .from('fail_excluded')
            .select('*')
            .order('start_datetime', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Errore caricamento fail_excluded:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// Carica tutto lo storico
async function loadAllFailExcluded() {
    try {
        const { data, error } = await db
            .from('fail_excluded')
            .select('*')
            .order('start_datetime', { ascending: false });
        
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Errore caricamento storico completo:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// Inserisci nuovo record
async function insertFailExcluded(record) {
    try {
        const { data, error } = await db
            .from('fail_excluded')
            .insert([{
                tool: record.tool,
                start_datetime: record.start_datetime,
                end_datetime: record.end_datetime || null,
                reason: record.reason,
                notes: record.notes || null
            }])
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Errore inserimento:', error);
        return { success: false, error: error.message };
    }
}

// Aggiorna record (per chiudere un fermo)
async function updateFailExcluded(id, updates) {
    try {
        const { data, error } = await db
            .from('fail_excluded')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Errore aggiornamento:', error);
        return { success: false, error: error.message };
    }
}

// Elimina record
async function deleteFailExcluded(id) {
    try {
        const { error } = await db
            .from('fail_excluded')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Errore eliminazione:', error);
        return { success: false, error: error.message };
    }
}

// ===== RENDER PAGE =====

async function renderFailExcludedPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="loading">Caricamento dati...</div>`;
    
    // Carica tools.json per dropdown
    try {
        const response = await fetch('data/tools.json');
        failExcludedToolsList = await response.json();
    } catch (e) {
        failExcludedToolsList = [];
        console.error('Errore caricamento tools:', e);
    }
    
    // Carica dati (ultime 100)
    const result = await loadFailExcluded(100);
    failExcludedData = result.data;
    isFullHistoryLoaded = false;
    
    main.innerHTML = renderFailExcludedContent();
    setupFailExcludedEvents();
}

function renderFailExcludedContent() {
    // Separa fermi attivi (senza end_datetime) da chiusi
    const activeFails = failExcludedData.filter(r => !r.end_datetime);
    const closedFails = failExcludedData.filter(r => r.end_datetime);
    
    const toolOptions = failExcludedToolsList.map(t => 
        `<option value="${t}">${t}</option>`
    ).join('');
    
    return `
        <div class="page-header">
            <div class="page-header-row">
                <div>
                    <h1 class="page-title">🚫 Fail-EXCLUDED</h1>
                    <p class="page-subtitle">Gestione fermi non a carico AMAT</p>
                </div>
                <div class="page-header-actions">
                    <span class="record-count">${failExcludedData.length} record ${isFullHistoryLoaded ? '(completo)' : '(ultimi 100)'}</span>
                    <button class="btn btn-secondary" id="btnLoadAll" ${isFullHistoryLoaded ? 'disabled' : ''}>
                        📥 Carica tutto lo storico
                    </button>
                    <button class="btn btn-primary" id="btnFilterWeek">
                        📅 Filtro Settimana
                    </button>
                </div>
            </div>
        </div>
        
        <!-- FORM NUOVO INSERIMENTO -->
        <div class="card section-new mb-3">
            <div class="card-header">
                <h3 class="card-title">➕ Nuovo Fail-Excluded</h3>
            </div>
            <div class="fail-form">
                <div class="fail-form-grid">
                    <div class="form-group">
                        <label class="form-label">Tool *</label>
                        <select class="form-control" id="feTool" required>
                            <option value="">-- Seleziona Tool --</option>
                            ${toolOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Inizio Fail *</label>
                        <input type="datetime-local" class="form-control" id="feStartDatetime" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Fine Fail (vuoto se attivo)</label>
                        <input type="datetime-local" class="form-control" id="feEndDatetime">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Motivazione *</label>
                    <input type="text" class="form-control" id="feReason" placeholder="Cerca di essere il più descrittivo possibile" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Note (inserisci anche il nome di chi apre il report)</label>
                    <input type="text" class="form-control" id="feNotes" placeholder="Es: Problema segnalato da Mario Rossi...">
                </div>
                <div class="fail-form-actions">
                    <button class="btn btn-success" id="btnAddFail">💾 Aggiungi Record</button>
                </div>
            </div>
        </div>
        
        <!-- FERMI ATTIVI -->
        <div class="card section-active mb-3">
            <div class="card-header">
                <h3 class="card-title">🔴 Fermi Attivi <span class="badge badge-danger">${activeFails.length}</span></h3>
            </div>
            <div class="fail-table-container">
                ${activeFails.length > 0 ? renderFailTable(activeFails, true) : 
                    '<div class="empty-state">Nessun fermo attivo</div>'}
            </div>
        </div>
        
        <!-- FERMI CHIUSI -->
        <div class="card section-closed">
            <div class="card-header">
                <h3 class="card-title">✅ Fermi Chiusi <span class="badge badge-success">${closedFails.length}</span></h3>
            </div>
            <div class="fail-table-container">
                ${closedFails.length > 0 ? renderFailTable(closedFails, false) : 
                    '<div class="empty-state">Nessun fermo chiuso nei dati caricati</div>'}
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="navigateTo('home')">← Torna alla Home</button>
        </div>
    `;
}

function renderFailTable(data, isActive) {
    const rows = data.map(r => {
        const startFormatted = formatDateTimeDisplay(r.start_datetime);
        const endFormatted = r.end_datetime ? formatDateTimeDisplay(r.end_datetime) : '-';
        const duration = r.end_datetime ? calculateDuration(r.start_datetime, r.end_datetime) : 'In corso...';
        
        return `
            <tr data-id="${r.id}">
                <td class="tool-cell">${r.tool}</td>
                <td>${startFormatted}</td>
                <td>${endFormatted}</td>
                <td class="duration-cell">${duration}</td>
                <td class="reason-cell" title="${escapeHtml(r.reason)}">${escapeHtml(r.reason)}</td>
                <td class="notes-cell" title="${r.notes ? escapeHtml(r.notes) : ''}">${r.notes ? escapeHtml(r.notes) : '-'}</td>
                <td class="actions-cell">
                    ${isActive ? `<button class="btn-icon btn-close-fail" title="Chiudi fermo">✅</button>` : ''}
                    <button class="btn-icon btn-edit-fail" title="Modifica">✏️</button>
                    <button class="btn-icon btn-delete btn-delete-fail" title="Elimina">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    return `
        <table class="fail-table">
            <thead>
                <tr>
                    <th>Tool</th>
                    <th>Inizio</th>
                    <th>Fine</th>
                    <th>Durata</th>
                    <th>Motivazione</th>
                    <th>Note</th>
                    <th>Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// ===== UTILITY FUNCTIONS =====

// Calcola numero settimana ISO 8601 (lunedì = primo giorno)
function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Calcola anno ISO della settimana
function getISOWeekYear(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    return d.getUTCFullYear();
}

function formatDateTimeDisplay(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${dayName} ${day}-${month}-${year} ${hours}:${minutes}`;
}

function formatDateTimeForInput(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}g ${remainingHours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== EVENT HANDLERS =====

function setupFailExcludedEvents() {
    // Carica tutto storico
    document.getElementById('btnLoadAll')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnLoadAll');
        btn.disabled = true;
        btn.textContent = '⏳ Caricamento...';
        
        const result = await loadAllFailExcluded();
        if (result.success) {
            failExcludedData = result.data;
            isFullHistoryLoaded = true;
            
            const main = document.getElementById('mainContent');
            main.innerHTML = renderFailExcludedContent();
            setupFailExcludedEvents();
        } else {
            alert('Errore nel caricamento: ' + result.error);
            btn.disabled = false;
            btn.textContent = '📥 Carica tutto lo storico';
        }
    });
    
    // Filtro settimana
    document.getElementById('btnFilterWeek')?.addEventListener('click', openWeekFilterPage);
    
    // Aggiungi nuovo record
    document.getElementById('btnAddFail')?.addEventListener('click', handleAddFail);
    
    // Event delegation per azioni sulla tabella
    document.querySelectorAll('.fail-table').forEach(table => {
        table.addEventListener('click', handleTableAction);
    });
}

async function handleAddFail() {
    const tool = document.getElementById('feTool').value;
    const startDatetime = document.getElementById('feStartDatetime').value;
    const endDatetime = document.getElementById('feEndDatetime').value;
    const reason = document.getElementById('feReason').value.trim();
    const notes = document.getElementById('feNotes').value.trim();
    
    // Validazione
    if (!tool) return alert('Seleziona un tool!');
    if (!startDatetime) return alert('Inserisci data/ora inizio!');
    if (!reason) return alert('Inserisci la motivazione!');
    
    // Validazione date
    if (endDatetime && new Date(endDatetime) <= new Date(startDatetime)) {
        return alert('La data di fine deve essere successiva a quella di inizio!');
    }
    
    const btn = document.getElementById('btnAddFail');
    btn.disabled = true;
    btn.textContent = '⏳ Salvataggio...';
    
    const result = await insertFailExcluded({
        tool,
        start_datetime: toLocalISOString(startDatetime),
        end_datetime: toLocalISOString(endDatetime),
        reason,
        notes: notes || null
    });
    
    if (result.success) {
        // Ricarica pagina
        await renderFailExcludedPage();
    } else {
        alert('Errore: ' + result.error);
        btn.disabled = false;
        btn.textContent = '💾 Aggiungi Record';
    }
}

async function handleTableAction(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const row = btn.closest('tr');
    const id = parseInt(row.dataset.id);
    const record = failExcludedData.find(r => r.id === id);
    
    if (btn.classList.contains('btn-close-fail')) {
        // Chiudi fermo - mostra modal per inserire data fine
        showCloseFailModal(record);
    } else if (btn.classList.contains('btn-edit-fail')) {
        // Modifica record
        showEditFailModal(record);
    } else if (btn.classList.contains('btn-delete-fail')) {
        // Elimina
        if (confirm(`Eliminare il record per ${record.tool}?`)) {
            const result = await deleteFailExcluded(id);
            if (result.success) {
                await renderFailExcludedPage();
            } else {
                alert('Errore: ' + result.error);
            }
        }
    }
}

// ===== MODALS =====

function showCloseFailModal(record) {
    const now = formatDateTimeForInput(new Date().toISOString());
    
    const modalHtml = `
        <div class="modal-overlay active" id="closeFailModal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">✅ Chiudi Fermo - ${record.tool}</h3>
                    <button class="modal-close" onclick="closeModal('closeFailModal')">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px; color: var(--text-secondary);">
                        Inizio: <strong>${formatDateTimeDisplay(record.start_datetime)}</strong>
                    </p>
                    <div class="form-group">
                        <label class="form-label">Data/Ora Fine *</label>
                        <input type="datetime-local" class="form-control" id="modalEndDatetime" value="${now}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('closeFailModal')">Annulla</button>
                    <button class="btn btn-success" id="btnConfirmClose" data-id="${record.id}">✅ Conferma Chiusura</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('btnConfirmClose').addEventListener('click', async () => {
        const endDatetime = document.getElementById('modalEndDatetime').value;
        if (!endDatetime) return alert('Inserisci data/ora fine!');
        
        if (new Date(endDatetime) <= new Date(record.start_datetime)) {
            return alert('La data di fine deve essere successiva a quella di inizio!');
        }
        
        const result = await updateFailExcluded(record.id, { end_datetime: toLocalISOString(endDatetime) });
        if (result.success) {
            closeModal('closeFailModal');
            await renderFailExcludedPage();
        } else {
            alert('Errore: ' + result.error);
        }
    });
}

function showEditFailModal(record) {
    const toolOptions = failExcludedToolsList.map(t => 
        `<option value="${t}" ${t === record.tool ? 'selected' : ''}>${t}</option>`
    ).join('');
    
    const modalHtml = `
        <div class="modal-overlay active" id="editFailModal">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title">✏️ Modifica Record</h3>
                    <button class="modal-close" onclick="closeModal('editFailModal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Tool</label>
                        <select class="form-control" id="editTool">
                            ${toolOptions}
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">Inizio</label>
                            <input type="datetime-local" class="form-control" id="editStart" 
                                value="${formatDateTimeForInput(record.start_datetime)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fine</label>
                            <input type="datetime-local" class="form-control" id="editEnd"
                                value="${formatDateTimeForInput(record.end_datetime)}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Motivazione</label>
                        <input type="text" class="form-control" id="editReason" value="${escapeHtml(record.reason)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Note</label>
                        <input type="text" class="form-control" id="editNotes" value="${record.notes ? escapeHtml(record.notes) : ''}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('editFailModal')">Annulla</button>
                    <button class="btn btn-primary" id="btnConfirmEdit" data-id="${record.id}">💾 Salva Modifiche</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('btnConfirmEdit').addEventListener('click', async () => {
        const tool = document.getElementById('editTool').value;
        const start = document.getElementById('editStart').value;
        const end = document.getElementById('editEnd').value;
        const reason = document.getElementById('editReason').value.trim();
        const notes = document.getElementById('editNotes').value.trim();
        
        if (!tool || !start || !reason) {
            return alert('Compila tutti i campi obbligatori!');
        }
        
        if (end && new Date(end) <= new Date(start)) {
            return alert('La data di fine deve essere successiva a quella di inizio!');
        }
        
        const result = await updateFailExcluded(record.id, {
            tool,
            start_datetime: toLocalISOString(start),
            end_datetime: toLocalISOString(end),
            reason,
            notes: notes || null
        });
        
        if (result.success) {
            closeModal('editFailModal');
            await renderFailExcludedPage();
        } else {
            alert('Errore: ' + result.error);
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId)?.remove();
}

// ===== FILTRO SETTIMANA =====

let allFailExcludedForFilter = [];

async function openWeekFilterPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="loading">Caricamento storico completo...</div>`;
    
    // Carica tutto lo storico per il filtro
    const result = await loadAllFailExcluded();
    if (!result.success) {
        alert('Errore caricamento: ' + result.error);
        renderFailExcludedPage();
        return;
    }
    
    allFailExcludedForFilter = result.data;
    
    // Calcola settimana corrente
    const today = new Date();
    const currentWeek = getISOWeekNumber(today);
    const currentYear = getISOWeekYear(today);
    
    // Estrai anni e settimane disponibili dallo storico
    const availableWeeks = extractAvailableWeeks(allFailExcludedForFilter);
    
    main.innerHTML = renderWeekFilterPage(currentWeek, currentYear, availableWeeks);
    setupWeekFilterEvents(availableWeeks);
}

function extractAvailableWeeks(data) {
    const weeksMap = new Map();
    
    data.forEach(record => {
        const date = new Date(record.start_datetime);
        const year = getISOWeekYear(date);
        const week = getISOWeekNumber(date);
        const key = `${year}-${week}`;
        
        if (!weeksMap.has(key)) {
            weeksMap.set(key, { year, week, count: 0 });
        }
        weeksMap.get(key).count++;
    });
    
    // Converti in array e ordina
    return Array.from(weeksMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
    });
}

function renderWeekFilterPage(currentWeek, currentYear, availableWeeks) {
    // Estrai anni unici
    const years = [...new Set(availableWeeks.map(w => w.year))].sort((a, b) => b - a);
    
    const yearOptions = years.map(y => 
        `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
    ).join('');
    
    // Settimane del primo anno selezionato
    const firstYear = years[0] || currentYear;
    const weeksOfYear = availableWeeks.filter(w => w.year === firstYear);
    const weekOptions = weeksOfYear.map(w => 
        `<option value="${w.week}">Settimana ${w.week} (${w.count} record)</option>`
    ).join('');
    
    // Calcola range settimana corrente
    const weekRange = getWeekDateRange(currentYear, currentWeek);
    
    return `
        <div class="page-header">
            <h1 class="page-title">📅 Filtro per Settimana</h1>
            <p class="page-subtitle">Estrai i dati per una settimana specifica</p>
        </div>
        
        <div class="card section-new mb-3">
            <div class="card-header">
                <h3 class="card-title">📆 Settimana Corrente</h3>
            </div>
            <div class="current-week-info">
                <div class="current-week-number">
                    <span class="week-label">Siamo nella</span>
                    <span class="week-value">Settimana ${currentWeek}</span>
                    <span class="week-year">del ${currentYear}</span>
                </div>
                <div class="week-range">
                    ${weekRange.start} → ${weekRange.end}
                </div>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title">🔍 Seleziona Settimana</h3>
            </div>
            <div class="filter-form">
                <div class="filter-grid">
                    <div class="form-group">
                        <label class="form-label">Anno</label>
                        <select class="form-control" id="filterYear">
                            ${yearOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Settimana</label>
                        <select class="form-control" id="filterWeek">
                            ${weekOptions}
                        </select>
                    </div>
                    <div class="form-group filter-btn-group">
                        <button class="btn btn-primary btn-lg" id="btnApplyFilter">🔍 Filtra</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="filterResults"></div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" id="btnBackToFailExcluded">← Torna a Fail-Excluded</button>
        </div>
    `;
}

function setupWeekFilterEvents(availableWeeks) {
    // Cambio anno → aggiorna settimane
    document.getElementById('filterYear')?.addEventListener('change', (e) => {
        const year = parseInt(e.target.value);
        const weeksOfYear = availableWeeks.filter(w => w.year === year);
        
        const weekSelect = document.getElementById('filterWeek');
        weekSelect.innerHTML = weeksOfYear.map(w => 
            `<option value="${w.week}">Settimana ${w.week} (${w.count} record)</option>`
        ).join('');
    });
    
    // Applica filtro
    document.getElementById('btnApplyFilter')?.addEventListener('click', applyWeekFilter);
    
    // Torna indietro
    document.getElementById('btnBackToFailExcluded')?.addEventListener('click', renderFailExcludedPage);
}

function applyWeekFilter() {
    const year = parseInt(document.getElementById('filterYear').value);
    const week = parseInt(document.getElementById('filterWeek').value);
    
    // Filtra i dati per la settimana selezionata
    const filtered = allFailExcludedForFilter.filter(record => {
        const date = new Date(record.start_datetime);
        return getISOWeekYear(date) === year && getISOWeekNumber(date) === week;
    });
    
    // Calcola range date della settimana
    const weekRange = getWeekDateRange(year, week);
    
    // Mostra risultati
    const resultsDiv = document.getElementById('filterResults');
    resultsDiv.innerHTML = renderFilterResults(filtered, year, week, weekRange);
    
    // Setup eventi copia
    document.getElementById('btnCopyTable')?.addEventListener('click', copyTableToClipboard);
}

function renderFilterResults(data, year, week, weekRange) {
    if (data.length === 0) {
        return `
            <div class="card">
                <div class="empty-state">Nessun record trovato per la Settimana ${week} del ${year}</div>
            </div>
        `;
    }
    
    // Ordina per data inizio
    data.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    
    const rows = data.map(r => {
        const startFormatted = formatDateTimeExport(r.start_datetime);
        const endFormatted = r.end_datetime ? formatDateTimeExport(r.end_datetime) : 'In corso';
        const duration = r.end_datetime ? calculateDuration(r.start_datetime, r.end_datetime) : 'In corso';
        
        return `
            <tr>
                <td>${r.tool}</td>
                <td>${startFormatted}</td>
                <td>${endFormatted}</td>
                <td>${duration}</td>
                <td>${escapeHtml(r.reason)}</td>
                <td>${r.notes ? escapeHtml(r.notes) : '-'}</td>
            </tr>
        `;
    }).join('');
    
    return `
        <div class="card section-export">
            <div class="card-header">
                <h3 class="card-title">📊 Risultati: Settimana ${week} del ${year}</h3>
                <span class="week-range-badge">${weekRange.start} → ${weekRange.end}</span>
            </div>
            <div class="export-actions">
                <span class="result-count">${data.length} record trovati</span>
                <button class="btn btn-success" id="btnCopyTable">📋 Copia Tabella</button>
            </div>
            <div class="export-table-container">
                <table class="export-table" id="exportTable">
                    <thead>
                        <tr>
                            <th>Tool</th>
                            <th>Inizio</th>
                            <th>Fine</th>
                            <th>Durata</th>
                            <th>Motivazione</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function formatDateTimeExport(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${dayName} ${day}/${month}/${year} ${hours}:${minutes}`;
}

function getWeekDateRange(year, week) {
    // Trova il primo giorno della settimana ISO
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
    
    // Calcola il lunedì della settimana richiesta
    const monday = new Date(firstMonday);
    monday.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    // Calcola la domenica
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDate = (d) => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    };
    
    return {
        start: `Lun ${formatDate(monday)}`,
        end: `Dom ${formatDate(sunday)}`
    };
}

async function copyTableToClipboard() {
    const table = document.getElementById('exportTable');
    if (!table) return;
    
    try {
        // Metodo 1: Copia come HTML (per Word/PowerPoint)
        const range = document.createRange();
        range.selectNode(table);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        
        // Prova a copiare
        const success = document.execCommand('copy');
        window.getSelection().removeAllRanges();
        
        if (success) {
            showCopyFeedback('✅ Tabella copiata! Incollala in PowerPoint o Excel');
        } else {
            // Fallback: copia come testo
            copyTableAsText(table);
        }
    } catch (err) {
        console.error('Errore copia:', err);
        copyTableAsText(table);
    }
}

function copyTableAsText(table) {
    const rows = table.querySelectorAll('tr');
    let text = '';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowText = Array.from(cells).map(cell => cell.textContent.trim()).join('\t');
        text += rowText + '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback('✅ Tabella copiata come testo!');
    }).catch(err => {
        console.error('Errore clipboard:', err);
        alert('Errore nella copia. Seleziona manualmente la tabella.');
    });
}

function showCopyFeedback(message) {
    const btn = document.getElementById('btnCopyTable');
    const originalText = btn.textContent;
    btn.textContent = message;
    btn.classList.add('btn-copied');
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('btn-copied');
    }, 2500);
}
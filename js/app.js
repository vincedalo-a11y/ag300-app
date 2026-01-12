// ===== NAVIGAZIONE =====
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    navigateTo('home');
});

function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    const main = document.getElementById('mainContent');
    
    switch(page) {
        case 'home':
            main.innerHTML = renderHomePage();
            setupHomeEvents();
            break;
        case 'passdown':
            main.innerHTML = renderPassdownStart();
            setupPassdownStartEvents();
            break;
        case 'storico':
            renderStoricoPage();
            break;
        case 'docs':
            main.innerHTML = renderDocsPage();
            break;
        case 'pm':
            main.innerHTML = renderPMPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
        case 'statusboard':
            renderStatusBoardPage();
            break;
        case 'andamento':
            renderAndamentoPage();
            break;
        case 'weekcalc':
            main.innerHTML = renderWeekCalcPage();
            setupWeekCalcEvents();
            break;
        case 'failexcluded':
            main.innerHTML = renderFailExcludedPage();
            break;
        case 'cabinet':
            main.innerHTML = renderCabinetPage();
            break;
        case 'andamentoarea':
            renderAndamentoAreaPage();
            break;
    }
}

// ===== HOME PAGE =====
function renderHomePage() {
    return `
        <div class="page-header">
            <h1 class="page-title">👋 Benvenuto in AG300</h1>
            <p class="page-subtitle">CVD Special Tools Management System</p>
        </div>
        <div class="home-grid">
            <div class="card home-card" data-goto="passdown">
                <div class="home-card-icon">📋</div>
                <div class="home-card-title">Passdown</div>
                <div class="home-card-desc">Gestione note di passaggio turno</div>
            </div>
            <div class="card home-card" data-goto="storico">
                <div class="home-card-icon">📚</div>
                <div class="home-card-title">Storico Passdown</div>
                <div class="home-card-desc">Consulta e filtra lo storico completo</div>
            </div>
            <div class="card home-card" data-goto="andamento">
                <div class="home-card-icon">📈</div>
                <div class="home-card-title">Andamento Tool</div>
                <div class="home-card-desc">Grafico storico status per tool</div>
            </div>
            <div class="card home-card" data-goto="andamentoarea">
                <div class="home-card-icon">🏭</div>
                <div class="home-card-title">Andamento Area</div>
                <div class="home-card-desc">Distribuzione status tutti i tool</div>
            </div>
            <div class="card home-card" data-goto="statusboard">
                <div class="home-card-icon">📊</div>
                <div class="home-card-title">Status Board</div>
                <div class="home-card-desc">Visualizza ultimo status board</div>
            </div>
            <div class="card home-card" data-goto="weekcalc">
                <div class="home-card-icon">📅</div>
                <div class="home-card-title">Calcola Settimana</div>
                <div class="home-card-desc">Calcola il numero della settimana</div>
            </div>
            <div class="card home-card" data-goto="failexcluded">
                <div class="home-card-icon">🚫</div>
                <div class="home-card-title">Fail-EXCLUDED</div>
                <div class="home-card-desc">Gestione fermi non a carico AMAT</div>
                <div class="home-card-status" id="failExcludedStatus">
                    <span class="status-loading">⏳</span>
                </div>
            </div>
            <div class="card home-card" data-goto="docs">
                <div class="home-card-icon">📁</div>
                <div class="home-card-title">Documentazione</div>
                <div class="home-card-desc">Ricerca procedure e documenti</div>
            </div>
            <div class="card home-card" data-goto="pm">
                <div class="home-card-icon">🔧</div>
                <div class="home-card-title">PM</div>
                <div class="home-card-desc">Gestione manutenzioni preventive</div>
            </div>
            <div class="card home-card" data-goto="cabinet">
                <div class="home-card-icon">🗄️</div>
                <div class="home-card-title">Cabinet CleanRoom</div>
                <div class="home-card-desc">Gestione cabinet e parti</div>
            </div>
            <div class="card home-card" data-goto="settings">
                <div class="home-card-icon">⚙️</div>
                <div class="home-card-title">Settings</div>
                <div class="home-card-desc">Configurazione e preferenze</div>
            </div>
        </div>
    `;
}

function setupHomeEvents() {
    document.querySelectorAll('.home-card').forEach(card => {
        card.addEventListener('click', () => {
            const page = card.getAttribute('data-goto');
            navigateTo(page);
        });
    });
    
    // Carica stato fermi attivi
    loadActiveFailsCount();
}

// Funzione per caricare conteggio fermi attivi
async function loadActiveFailsCount() {
    try {
        const { data, error } = await db
            .from('fail_excluded')
            .select('id')
            .is('end_datetime', null);
        
        if (error) throw error;
        
        const count = data ? data.length : 0;
        const statusEl = document.getElementById('failExcludedStatus');
        
        if (statusEl) {
            if (count > 0) {
                statusEl.innerHTML = `<span class="status-badge status-danger">🔴 ${count} attivi</span>`;
            } else {
                statusEl.innerHTML = `<span class="status-badge status-success">🟢 Nessun fermo</span>`;
            }
        }
    } catch (e) {
        console.error('Errore caricamento fermi attivi:', e);
        const statusEl = document.getElementById('failExcludedStatus');
        if (statusEl) {
            statusEl.innerHTML = '';
        }
    }
}

// ===== DOCS PAGE =====
function renderDocsPage() {
    return `
        <div class="page-header">
            <h1 class="page-title">📁 Documentazione</h1>
            <p class="page-subtitle">Ricerca procedure e documenti</p>
        </div>
        
        <div class="card">
            <div class="placeholder-content">
                <div class="placeholder-icon">🚧</div>
                <div class="placeholder-text">Sezione in costruzione...<br>Qui sarà disponibile la ricerca documentazione da SharePoint.</div>
            </div>
        </div>
    `;
}

// ===== PM PAGE =====
function renderPMPage() {
    return `
        <div class="page-header">
            <h1 class="page-title">🔧 PM - Manutenzioni Preventive</h1>
            <p class="page-subtitle">Gestione kit ricambi e serial number</p>
        </div>
        
        <div class="card">
            <div class="placeholder-content">
                <div class="placeholder-icon">🚧</div>
                <div class="placeholder-text">Sezione in costruzione...<br>Qui sarà disponibile la gestione delle PM.</div>
            </div>
        </div>
    `;
}

// ===== SETTINGS PAGE =====
let toolsData = [];
let statusMarkersData = [];

async function loadSettingsData() {
    try {
        const toolsResponse = await fetch('data/tools.json');
        toolsData = await toolsResponse.json();
    } catch (e) {
        toolsData = [];
    }
    
    try {
        const markersResponse = await fetch('data/statusMarkers.json');
        statusMarkersData = await markersResponse.json();
    } catch (e) {
        statusMarkersData = [];
    }
}

function renderSettingsPage() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `<div class="loading">Caricamento...</div>`;
    
    loadSettingsData().then(() => {
        main.innerHTML = renderSettingsContent();
        setupSettingsEvents();
    });
}

function renderSettingsContent() {
    return `
        <div class="page-header">
            <h1 class="page-title">⚙️ Settings</h1>
            <p class="page-subtitle">Configurazione e preferenze</p>
        </div>
        
        <div class="settings-layout">
            <div class="settings-menu card">
                <button class="settings-menu-btn active" data-section="markers">
                    <span class="settings-menu-icon">📝</span>
                    <span>OneNote Markers</span>
                </button>

                <button class="settings-menu-btn" data-section="maillist">
                    <span class="settings-menu-icon">📧</span>
                    <span>Mail List</span>
                </button>

                <button class="settings-menu-btn" data-section="developer">
                    <span class="settings-menu-icon">❓</span>
                    <span>Ask Developer</span>
                </button>
                
                <button class="settings-menu-btn" data-section="version">
                    <span class="settings-menu-icon">ℹ️</span>
                    <span>Version Info</span>
                </button>
            </div>
            
            <div class="settings-content card" id="settingsContent">
                ${renderMarkersSection()}
            </div>
        </div>
    `;
}

function renderMarkersSection() {
    const toolsHTML = toolsData.map(tool => `<div class="marker-item">${tool}</div>`).join('');
    const statusHTML = statusMarkersData.map(s => `
        <div class="status-row">
            <div class="status-marker">${s.marker}</div>
            <div class="status-finale">${s.statoFinale}</div>
            <div class="status-colore"><span class="color-badge" style="background: ${s.colore}"></span></div>
        </div>
    `).join('');
    
    return `
        <div class="markers-grid">
            <div class="marker-section">
                <div class="marker-section-header">
                    <h3>Tool Marker (${toolsData.length})</h3>
                </div>
                <div class="marker-list">
                    ${toolsHTML || '<p class="text-muted">Nessun tool configurato</p>'}
                </div>
            </div>
            
            <div class="marker-section status-section">
                <div class="marker-section-header">
                    <h3>Status Marker (${statusMarkersData.length})</h3>
                </div>
                <div class="status-table">
                    <div class="status-header">
                        <div>Status Marker</div>
                        <div>Stato Finale</div>
                        <div>Colore</div>
                    </div>
                    <div class="status-list">
                        ${statusHTML || '<p class="text-muted">Nessuno status configurato</p>'}
                    </div>
                </div>
            </div>
            
            <div class="marker-section">
                <div class="marker-section-header"><h3>Markers for Problem Statement</h3></div>
                <div class="marker-list readonly">
                    <div class="marker-item">PS:</div>
                    <div class="marker-item">PB:</div>
                </div>
                
                <div class="marker-section-header mt-3"><h3>Marker for Actions Done</h3></div>
                <div class="marker-list readonly"><div class="marker-item">AD:</div></div>
                
                <div class="marker-section-header mt-3"><h3>Markers for To Do</h3></div>
                <div class="marker-list readonly">
                    <div class="marker-item">TD:</div>
                    <div class="marker-item">TO DO:</div>
                </div>
                
                <div class="marker-section-header mt-3"><h3>To Remember</h3></div>
                <div class="remember-box">Le diciture [ _FI ], [ _HX ], [ _LL ]<br>saranno riconvertite in [ _MF ]</div>
            </div>
        </div>
    `;
}

function renderMailListSection() {
    return `
        <div class="mail-list-section">
            <h3 class="mail-list-title">📧 Configurazione Mail List</h3>
            <div class="mail-list-container">
                <div class="mail-list-column">
                    <h4 class="mail-list-header amat">AMAT</h4>
                    <div class="mail-list-group">
                        <label class="mail-list-label">Destinatari (TO)</label>
                        <div class="mail-list-emails" id="amatTo"></div>
                    </div>
                    <div class="mail-list-group">
                        <label class="mail-list-label">Copia Conoscenza (CC)</label>
                        <div class="mail-list-emails" id="amatCc"></div>
                    </div>
                </div>
                <div class="mail-list-column">
                    <h4 class="mail-list-header st">ST</h4>
                    <div class="mail-list-group">
                        <label class="mail-list-label">Destinatari (TO)</label>
                        <div class="mail-list-emails" id="stTo"></div>
                    </div>
                    <div class="mail-list-group">
                        <label class="mail-list-label">Copia Conoscenza (CC)</label>
                        <div class="mail-list-emails" id="stCc"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadMailLists() {
    try {
        // Carica AMAT
        const amatResponse = await fetch('data/mailAMAT.json');
        const amatData = await amatResponse.json();
        
        document.getElementById('amatTo').innerHTML = amatData.to.map(email => 
            `<span class="mail-tag">${email}</span>`
        ).join('');
        
        document.getElementById('amatCc').innerHTML = amatData.cc.map(email => 
            `<span class="mail-tag">${email}</span>`
        ).join('');
        
        // Carica ST
        const stResponse = await fetch('data/mailST.json');
        const stData = await stResponse.json();
        
        document.getElementById('stTo').innerHTML = stData.to.map(email => 
            `<span class="mail-tag">${email}</span>`
        ).join('');
        
        document.getElementById('stCc').innerHTML = stData.cc.map(email => 
            `<span class="mail-tag">${email}</span>`
        ).join('');
        
    } catch (e) {
        console.error('Errore caricamento mail lists:', e);
    }
}

function renderDeveloperSection() {
    return `
        <div class="developer-section">
            <div class="developer-icon">👨‍💻</div>
            <h3>Contatta lo Sviluppatore</h3>
            <p>Hai trovato un bug? Vuoi suggerire una nuova funzionalità?</p>
            <button class="btn btn-primary" id="btnContactDev">✉️ Invia Email</button>
        </div>
    `;
}

function renderVersionSection() {
    return `
        <div class="version-section">
            <div class="version-logo">🔧</div>
            <h2>AG300 - CVD Management System</h2>
            <div class="version-info-box">
                <div class="version-row"><span>Versione:</span><strong>1.0.0</strong></div>
                <div class="version-row"><span>Sviluppatore:</span><strong>Vincenzo D'Alonzo</strong></div>
                <div class="version-row"><span>Ultimo aggiornamento:</span><strong>Gennaio 2026</strong></div>
            </div>
            
            <div class="version-changelog">
                <h3>📋 Funzionalità attive</h3>
                <ul class="changelog-list">
                    <li><span class="changelog-icon">✅</span> Gestione Passdown con generazione automatica mail</li>
                    <li><span class="changelog-icon">✅</span> Storico passdown con filtri e consultazione</li>
                    <li><span class="changelog-icon">✅</span> Status Board con overview turno corrente</li>
                    <li><span class="changelog-icon">✅</span> Andamento Tool - grafico storico per singolo tool</li>
                    <li><span class="changelog-icon">✅</span> Andamento Area - distribuzione status tutti i tool</li>
                    <li><span class="changelog-icon">✅</span> Fail-Excluded - gestione fermi non a carico AMAT</li>
                    <li><span class="changelog-icon">✅</span> Calcola Settimana - conversione data/settimana ISO</li>
                </ul>
                
                <h3>🚧 In sviluppo</h3>
                <ul class="changelog-list">
                    <li><span class="changelog-icon">🔨</span> Documentazione - ricerca procedure SharePoint</li>
                    <li><span class="changelog-icon">🔨</span> PM - gestione manutenzioni preventive</li>
                    <li><span class="changelog-icon">🔨</span> Cabinet CleanRoom - gestione parti e ricambi</li>
                </ul>
            </div>
        </div>
    `;
}

function setupSettingsEvents() {
    document.querySelectorAll('.settings-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.settings-menu-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const section = btn.getAttribute('data-section');
            const content = document.getElementById('settingsContent');
            
            switch(section) {
                case 'markers':
                    content.innerHTML = renderMarkersSection();
                    break;
                case 'maillist':
                    content.innerHTML = renderMailListSection();
                    loadMailLists();
                    break;
                case 'developer':
                    content.innerHTML = renderDeveloperSection();
                    setupDeveloperEvents();
                    break;
                case 'version':
                    content.innerHTML = renderVersionSection();
                    break;
            }
        });
    });
}

function setupDeveloperEvents() {
    document.getElementById('btnContactDev')?.addEventListener('click', () => {
        window.location.href = 'mailto:vincenzo_dalonzo@amat.com?subject=AG300 App - Feedback';
    });
}


// ===== CALCOLA SETTIMANA =====
function renderWeekCalcPage() {
    return `
        <div class="page-header">
            <h1 class="page-title">📅 Calcola Settimana</h1>
            <p class="page-subtitle">Calcola il numero della settimana di una data</p>
        </div>
        
        <div class="card" style="max-width: 500px; margin: 0 auto;">
            <div class="week-calc-container">
                <div class="form-group">
                    <label class="form-label">Seleziona una data</label>
                    <input type="date" class="form-control" id="weekCalcDate" style="font-size: 1.2rem; padding: 15px;">
                </div>
                
                <button class="btn btn-primary" id="btnCalcWeek" style="width: 100%; margin-top: 15px; padding: 15px; font-size: 1.1rem;">
                    🔍 Calcola Settimana
                </button>
                
                <div id="weekCalcResult" style="display: none; margin-top: 25px; text-align: center;">
                    <div style="background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%); border-radius: 16px; padding: 30px; color: white;">
                        <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 5px;">SETTIMANA</div>
                        <div id="weekNumber" style="font-size: 4rem; font-weight: 700; line-height: 1;"></div>
                        <div id="weekYear" style="font-size: 1.1rem; opacity: 0.8; margin-top: 5px;"></div>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                            <div id="dayName" style="font-size: 1.3rem; font-weight: 600;"></div>
                            <div id="fullDate" style="font-size: 1rem; opacity: 0.8; margin-top: 5px;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="navigateTo('home')">← Torna alla Home</button>
        </div>
    `;
}

function setupWeekCalcEvents() {
    // Imposta data di oggi come default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('weekCalcDate').value = today;
    
    document.getElementById('btnCalcWeek')?.addEventListener('click', calculateWeek);
    
    // Calcola anche premendo Enter
    document.getElementById('weekCalcDate')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calculateWeek();
    });
    
    // Calcola automaticamente quando cambia la data
    document.getElementById('weekCalcDate')?.addEventListener('change', calculateWeek);
    
    // Calcola subito per la data di oggi
    calculateWeek();
}

function calculateWeek() {
    const dateInput = document.getElementById('weekCalcDate').value;
    
    if (!dateInput) {
        alert('Seleziona una data!');
        return;
    }
    
    const date = new Date(dateInput + 'T00:00:00');
    
    // Calcola numero settimana (ISO 8601 - settimana inizia di lunedì)
    const weekNumber = getISOWeekNumber(date);
    const year = getISOWeekYear(date);
    
    // Giorni della settimana in italiano
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const fullYear = date.getFullYear();
    
    // Mostra risultato
    document.getElementById('weekCalcResult').style.display = 'block';
    document.getElementById('weekNumber').textContent = weekNumber;
    document.getElementById('weekYear').textContent = `dell'anno ${year}`;
    document.getElementById('dayName').textContent = dayName;
    document.getElementById('fullDate').textContent = `${day} ${month} ${fullYear}`;
}

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

// ===== CABINET CLEANROOM =====
function renderCabinetPage() {
    return `
        <div class="page-header">
            <h1 class="page-title">🗄️ Cabinet CleanRoom</h1>
            <p class="page-subtitle">Gestione cabinet e parti</p>
        </div>
        
        <div class="card">
            <div class="placeholder-content">
                <div class="placeholder-icon">👷</div>
                <div class="placeholder-text" style="font-size: 1.5rem;">Area di Andres</div>
                <p style="color: var(--text-secondary); margin-top: 15px; font-size: 1.1rem;">
                    🚧 Pagina in costruzione... Andres sta lavorando duramente! 🚧
                </p>
                <p style="color: var(--text-tertiary); margin-top: 10px; font-style: italic;">
                    "Non disturbare il maestro mentre crea il suo capolavoro"
                </p>
                <div style="font-size: 3rem; margin-top: 20px;">💪 ☕ 💻</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-secondary" onclick="navigateTo('home')">← Torna alla Home</button>
        </div>
    `;
}

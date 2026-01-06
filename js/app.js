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
            
            <div class="card home-card" data-goto="settings">
                <div class="home-card-icon">⚙️</div>
                <div class="home-card-title">Settings</div>
                <div class="home-card-desc">Configurazione e preferenze</div>
            </div>

            <div class="card home-card" data-goto="statusboard">
                <div class="home-card-icon">📊</div>
                <div class="home-card-title">Status Board</div>
                <div class="home-card-desc">Visualizza ultimo status board</div>
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
            <h2>AG300 - CVD Special Tools</h2>
            <div class="version-info-box">
                <div class="version-row"><span>Versione:</span><strong>1.0.0</strong></div>
                <div class="version-row"><span>Sviluppatore:</span><strong>Vincenzo D'Alonzo</strong></div>
                <div class="version-row"><span>Ultimo aggiornamento:</span><strong>Gennaio 2026</strong></div>
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
        window.location.href = 'mailto:vincenzo.dalonzo@amat.com?subject=AG300 App - Feedback';
    });
}
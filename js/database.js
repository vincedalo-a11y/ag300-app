// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://tvjhydedsdsitvkrdsso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2amh5ZGVkc2RzaXR2a3Jkc3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTk2NjMsImV4cCI6MjA4MzE5NTY2M30.Ecxx6juzfOXw3VzG0v41ZNb4uHu-arZ1it-WN5ke8-4';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase inizializzato!');

// ===== DATABASE FUNCTIONS =====

// Salva multipli record (batch)
async function savePassdownBatch(records) {
    try {
        const formattedRecords = records.map(r => ({
            tool: r.tool,
            data: r.data,
            shift: r.shift,
            workers: r.workers,
            status: r.status,
            problem_statement: r.problemStatement,
            actions_done: r.actionsDone,
            to_do: r.toDo
        }));
        
        const { data, error } = await db
            .from('passdowns')
            .insert(formattedRecords);
        
        if (error) throw error;
        return { success: true, data, count: records.length };
    } catch (error) {
        console.error('Errore salvataggio batch:', error);
        return { success: false, error: error.message };
    }
}

// Carica tool dal turno precedente (ultima data/shift nel DB)
async function getPreviousNonUpTools(currentDate, currentShift) {
    try {
        // 1. Trova l'ultima riga inserita (ID più alto)
        const { data: lastRow, error: lastError } = await db
            .from('passdowns')
            .select('id, data, shift')
            .order('id', { ascending: false })
            .limit(1);
        
        if (lastError) throw lastError;
        
        if (!lastRow || lastRow.length === 0) {
            console.log('Nessun dato nel database');
            return { success: true, data: [], prevDate: null, prevShift: null };
        }
        
        const prevDate = lastRow[0].data;
        const prevShift = lastRow[0].shift;
        
        console.log('Ultimo turno nel DB:', prevDate, prevShift);
        
        // 2. Prendi tutte le righe con quella data e shift
        const { data: prevTools, error: prevError } = await db
            .from('passdowns')
            .select('*')
            .eq('data', prevDate)
            .eq('shift', prevShift);
        
        if (prevError) throw prevError;
        
        console.log('Tool trovati nel turno precedente:', prevTools ? prevTools.length : 0);
        
        // 3. Filtra: escludi quelli con status UP
        const nonUpTools = (prevTools || []).filter(t => t.status !== 'UP');
        
        console.log('Tool non UP:', nonUpTools.length);
        
        return { 
            success: true, 
            data: nonUpTools, 
            prevDate: prevDate,
            prevShift: prevShift 
        };
    } catch (error) {
        console.error('Errore caricamento turno precedente:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// Converti da dd-Mon-yy a YYYY-MM-DD per database
function convertToDbDate(displayDate) {
    const parts = displayDate.split('-');
    const months = {'Jan':'01', 'Feb':'02', 'Mar':'03', 'Apr':'04', 'May':'05', 'Jun':'06',
                   'Jul':'07', 'Aug':'08', 'Sep':'09', 'Oct':'10', 'Nov':'11', 'Dec':'12'};
    const year = '20' + parts[2];
    const month = months[parts[1]];
    const day = parts[0];
    return `${year}-${month}-${day}`;
}

// Converti da YYYY-MM-DD a dd-Mon-yy per display
function convertToDisplayDate(dbDate) {
    const parts = dbDate.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = parts[0].slice(-2);
    const month = months[parseInt(parts[1]) - 1];
    const day = parts[2];
    return `${day}-${month}-${year}`;
}

// Verifica se il turno è già stato caricato
async function checkShiftExists(date, shift) {
    try {
        const dbDate = convertToDbDate(date);
        
        const { data, error } = await db
            .from('passdowns')
            .select('workers')
            .eq('data', dbDate)
            .eq('shift', shift)
            .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            return { exists: true, workers: data[0].workers };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('Errore verifica turno:', error);
        return { exists: false, error: error.message };
    }
}

// Carica tutti i tool di un turno specifico
async function getShiftTools(date, shift) {
    try {
        const dbDate = convertToDbDate(date);
        
        const { data, error } = await db
            .from('passdowns')
            .select('*')
            .eq('data', dbDate)
            .eq('shift', shift)
            .order('tool', { ascending: true });
        
        if (error) throw error;
        
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Errore caricamento turno:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// Elimina tutte le righe di un turno
async function deleteShift(date, shift) {
    try {
        const dbDate = convertToDbDate(date);
        
        const { error } = await db
            .from('passdowns')
            .delete()
            .eq('data', dbDate)
            .eq('shift', shift);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        console.error('Errore eliminazione turno:', error);
        return { success: false, error: error.message };
    }
}
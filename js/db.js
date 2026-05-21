// ── DATA LAYER ────────────────────────────────────────────────────────────────
// In-memory cache — all reads are synchronous (from cache).
// Writes update cache immediately and fire async sync to Supabase in background.

const _cache = {
  prospects:   [],
  clients:     [],
  callers:     [],
  callhistory: [],
  pipeline:    [],
  tasks:       []
};

let _currentUserId = null;
let _loadInProgress = false;
let _pendingSyncs = 0;

// ── Sync status indicator ─────────────────────────────────────────────────────
function _setSyncStatus(state, msg) {
  // state: 'syncing' | 'ok' | 'error'
  const dot = document.getElementById('sync-status-dot');
  const lbl = document.getElementById('sync-status-label');
  if (!dot || !lbl) return;
  const map = {
    syncing: { color: 'var(--gold)',  shadow: 'var(--gold)',  text: 'Saving…' },
    ok:      { color: 'var(--green)', shadow: 'var(--green)', text: 'Saved'   },
    error:   { color: 'var(--red)',   shadow: 'var(--red)',   text: msg || 'Save failed' },
  };
  const s = map[state] || map.ok;
  dot.style.background = s.color;
  dot.style.boxShadow  = `0 0 6px ${s.shadow}`;
  lbl.textContent = s.text;
  lbl.style.color = state === 'error' ? 'var(--red)' : 'var(--text3)';
  if (state === 'error' && typeof toast === 'function') {
    toast('☁️ Cloud save failed: ' + s.text, 6000);
  }
}

// ── UID generator (same as original) ─────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Synchronous read from cache ───────────────────────────────────────────────
function ld(section) {
  return JSON.parse(JSON.stringify(_cache[section] || []));
}

// ── Synchronous write to cache + async cloud sync ─────────────────────────────
function sv(section, records) {
  _cache[section] = JSON.parse(JSON.stringify(records));
  if (_currentUserId) {
    _pendingSyncs++;
    _setSyncStatus('syncing');
    _syncSection(section, records)
      .then(() => {
        _pendingSyncs = Math.max(0, _pendingSyncs - 1);
        if (_pendingSyncs === 0) _setSyncStatus('ok');
      })
      .catch(err => {
        _pendingSyncs = Math.max(0, _pendingSyncs - 1);
        console.error('Cloud sync error:', err);
        _setSyncStatus('error', err?.message || String(err));
      });
  }
}

// ── Call history helpers (same interface as original) ─────────────────────────
function ldCallHistory() {
  return ld('callhistory');
}
function svCallHistory(records) {
  sv('callhistory', records);
}

// ── Load all data from Supabase into cache ────────────────────────────────────
async function loadFromCloud() {
  if (_loadInProgress) return 'skipped';
  _loadInProgress = true;
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return false;

    _currentUserId = user.id;

    const { data, error } = await supabase
      .from('crm_data')
      .select('id, section, data')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to load from cloud:', error);
      _setSyncStatus('error', error.message);
      return false;
    }

    // Reset cache
    Object.keys(_cache).forEach(k => { _cache[k] = []; });

    (data || []).forEach(row => {
      if (_cache[row.section] !== undefined && row.data) {
        _cache[row.section].push(row.data);
      }
    });

    _setSyncStatus('ok');
    return true;
  } finally {
    _loadInProgress = false;
  }
}

// ── Sync a section to Supabase ────────────────────────────────────────────────
async function _syncSection(section, records) {
  if (!_currentUserId) return;

  // Get all existing cloud row ids for this section
  const { data: existing, error: fetchErr } = await supabase
    .from('crm_data')
    .select('id')
    .eq('user_id', _currentUserId)
    .eq('section', section);

  if (fetchErr) throw new Error(fetchErr.message);

  const cloudIds = new Set((existing || []).map(r => r.id));
  // Prefix with section so callers/callhistory never share a PK (same uid() value)
  const localIds = new Set(records.map(r => `${section}_${r.id}`));

  // Upsert all local records
  if (records.length > 0) {
    const rows = records.map(r => ({
      id:         `${section}_${r.id}`,
      user_id:    _currentUserId,
      section:    section,
      data:       r,
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase
      .from('crm_data')
      .upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  // Delete cloud rows that no longer exist locally
  const toDelete = [...cloudIds].filter(id => !localIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('crm_data')
      .delete()
      .in('id', toDelete)
      .eq('user_id', _currentUserId);
    if (error) console.error('Delete error:', error.message);
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _currentUserId = data.user.id;
  return data.user;
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
  _currentUserId = null;
  Object.keys(_cache).forEach(k => { _cache[k] = []; });
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) _currentUserId = user.id;
  return user;
}

// ── APP STATE ─────────────────────────────────────────────────────────────────
let section = 'prospects', view = 'grid', filterOn = false, filterStatus = 'all';

// ── THEME ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light');
  localStorage.setItem('pcrm_theme', isLight ? 'light' : 'dark');
  const icon  = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon)  icon.textContent  = isLight ? '☀️' : '🌙';
  if (label) label.textContent = isLight ? 'Light Mode' : 'Dark Mode';
}

function applyTheme() {
  const saved = localStorage.getItem('pcrm_theme');
  if (saved === 'light') {
    document.documentElement.classList.add('light');
    const icon  = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon)  icon.textContent  = '☀️';
    if (label) label.textContent = 'Light Mode';
  }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function go(s) {
  section = s;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-' + s)?.classList.add('active');
  const titles = {
    prospects: 'Prospects', clients: 'Active Clients', callers: 'Incoming Calls',
    callhistory: 'Call History', chargebacks: 'Chargebacks',
    tasks: 'Follow-Ups', dashboard: 'Dashboard'
  };
  document.getElementById('page-title').textContent = titles[s] || s;
  document.getElementById('search-inp').value = '';
  filterStatus = 'all'; filterOn = false;
  const vt = document.getElementById('view-tabs');
  const ab = document.getElementById('add-btn');
  const hideTabs = s === 'dashboard' || s === 'callhistory' || s === 'chargebacks';
  if (vt) vt.style.display = hideTabs ? 'none' : 'flex';
  if (ab) ab.style.display = (s === 'dashboard' || s === 'callhistory' || s === 'chargebacks') ? 'none' : '';
  renderCurrent();
  updateCounts();
}

function setView(v) {
  view = v;
  document.querySelectorAll('.view-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + v)?.classList.add('active');
  renderCurrent();
}

function toggleFilter() { filterOn = !filterOn; renderCurrent(); }

function updateCounts() {
  const today = new Date().toISOString().slice(0, 10);
  const el = id => document.getElementById(id);
  if (el('cnt-prospects'))   el('cnt-prospects').textContent   = ld('prospects').length;
  if (el('cnt-clients'))     el('cnt-clients').textContent     = ld('clients').length;
  if (el('cnt-callers'))     el('cnt-callers').textContent     = ld('callers').filter(r => (r.created || '').slice(0, 10) === today).length;
  if (el('cnt-tasks'))       el('cnt-tasks').textContent       = ld('tasks').filter(t => t.status === 'Open').length;
  if (el('cnt-callhistory')) el('cnt-callhistory').textContent = ldCallHistory().length;
  const cbCount = ld('clients').filter(r => (Array.isArray(r.policies) ? r.policies : []).some(p => p.chargeback === 'Yes')).length;
  if (el('cnt-chargebacks')) el('cnt-chargebacks').textContent = cbCount;
}

// ── QUICK CALLER FORM HTML ────────────────────────────────────────────────────
function buildCallerQuickForm() {
  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  const stateOptions = '<option value=""></option>' + US_STATES.map(s => `<option>${s}</option>`).join('');

  return `<div class="quick-form" id="quick-form-wrap" style="margin-bottom:22px">
    <button class="qf-compact-toggle" onclick="toggleCompactMode()" id="qf-compact-btn" title="Toggle compact sidebar mode">⊞ Compact</button>
    <div class="qf-title" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
      <span>📞 Incoming Caller Log</span>
    </div>

    <!-- ── COMPACT SIDEBAR VIEW ── -->
    <div class="qf-compact-view">
      <div class="compact-grid">
        <div class="compact-field">
          <span class="compact-label">First Name</span>
          <input class="compact-input" id="cqf_first" placeholder="First" oninput="syncCompact('first')">
        </div>
        <div class="compact-field">
          <span class="compact-label">Last Name</span>
          <input class="compact-input" id="cqf_last" placeholder="Last" oninput="syncCompact('last')">
        </div>
        <div class="compact-field">
          <span class="compact-label">Phone</span>
          <input class="compact-input" id="cqf_phone" placeholder="(000) 000-0000" oninput="fmtPhoneInputById('cqf_phone');syncCompact('phone')" maxlength="14">
        </div>
        <div class="compact-field">
          <span class="compact-label">Date of Birth</span>
          <input type="date" class="compact-input" id="cqf_dob" oninput="syncCompact('dob');updateCompactAge()">
        </div>
      </div>
      <div class="compact-grid">
        <div class="compact-field">
          <span class="compact-label">Monthly Premium</span>
          <div class="compact-prefix-wrap">
            <span class="compact-prefix">$</span>
            <input class="compact-input prefix-input" id="cqf_premium" placeholder="" oninput="syncCompact('premium')">
          </div>
        </div>
        <div class="compact-field">
          <span class="compact-label">Coverage Amount</span>
          <div class="compact-prefix-wrap">
            <span class="compact-prefix">$</span>
            <input class="compact-input prefix-input" id="cqf_coverage" placeholder="" oninput="syncCompact('coverage')">
          </div>
        </div>
      </div>
      <div style="margin-bottom:6px">
        <div class="compact-field">
          <span class="compact-label">Current Carrier</span>
          <input class="compact-input" id="cqf_carrier" placeholder="" oninput="syncCompact('carrier')">
        </div>
      </div>
      <div class="compact-grid" style="margin-bottom:6px">
        <div class="compact-field">
          <span class="compact-label">Sex</span>
          <select class="compact-input plain" id="cqf_gender" onchange="syncCompact('gender')">
            <option value=""></option><option>M</option><option>F</option>
          </select>
        </div>
        <div class="compact-field">
          <span class="compact-label">Age</span>
          <div class="compact-input plain" id="cqf_age_display" style="color:var(--text3);display:flex;align-items:center">—</div>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <span class="compact-label" style="display:block;margin-bottom:4px">Policy Since (Year)</span>
        <div style="display:flex;align-items:center;gap:7px">
          <input class="compact-input qfi-priority" id="cqf_policy_since" placeholder="e.g. 2019" maxlength="4" style="flex:1;background:rgba(240,180,41,.07);border-color:rgba(240,180,41,.35)" oninput="updatePolicySince()">
          <div class="compact-duration" id="cqf_policy_duration" style="flex:0 0 auto;min-width:100px">
            <span class="compact-duration-label">Policy Age</span>
            <span class="compact-duration-counter" id="cqf_duration_val">—</span>
          </div>
        </div>
      </div>

      <div onclick="qfToggle('compact_notes')" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:5px 0;border-top:1px solid var(--border);margin-bottom:0;user-select:none">
        <span style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--text)">Notes</span>
        <span id="qfchev_compact_notes" style="font-size:11px;color:var(--text3)">▾</span>
      </div>
      <div class="qf-cs-body cs-collapsed" id="qfbody_compact_notes">
        <div style="padding-top:6px;margin-bottom:4px;position:relative">
          <textarea class="compact-input plain" id="cqf_notes" rows="2" placeholder="Call notes…" style="resize:vertical;min-height:44px;padding-right:38px;font-size:13px;width:100%" oninput="syncCompactNotes()"></textarea>
          <button class="fcopy-btn" onclick="copyField('cqf_notes',this)" style="position:absolute;right:0;top:0;height:38px;border-radius:0 var(--r-sm) 0 0;border-bottom:none"><span class="fc-tip">Copy</span>⎘</button>
        </div>
      </div>

      <div style="display:flex;gap:6px;justify-content:flex-end;padding-top:6px;border-top:1px solid var(--border)">
        <button class="tb-btn" onclick="clearQuick()" style="font-size:12px;padding:5px 10px">🗑 Clear</button>
        <button class="tb-btn primary" onclick="saveQuickCaller()" style="font-size:12px;padding:5px 10px">📞 Save</button>
      </div>
    </div>

    <!-- ── FULL VIEW ── -->
    <div class="qf-full-view">

    <div class="qf-cs-head" onclick="qfToggle('personal')">
      <span class="qf-cs-label">Personal Information</span>
      <label class="qf-pin-wrap" onclick="event.stopPropagation()" title="Keep this section open">
        <input type="checkbox" id="qfpin_personal" onchange="qfSetPin('personal',this.checked)">
        <span class="qf-pin-icon">📌</span>
      </label>
      <span class="qf-cs-chev" id="qfchev_personal">▾</span>
    </div>
    <div class="qf-cs-body cs-collapsed" id="qfbody_personal">
      <div style="display:grid;grid-template-columns:var(--qf-col,1.1fr) var(--qf-col,1.1fr) minmax(0,1.4fr) minmax(0,.4fr);gap:10px;margin-bottom:10px">
        <div><label class="qfl qfl-priority">First Name</label>
          <div class="field-copy-wrap">
            <input class="qfi qfi-priority" id="qf_first" placeholder="First" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_first',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl qfl-priority">Last Name</label>
          <div class="field-copy-wrap">
            <input class="qfi qfi-priority" id="qf_last" placeholder="Last" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_last',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl qfl-priority">Phone Number</label>
          <div class="field-copy-wrap">
            <input class="qfi qfi-priority" id="qf_phone" placeholder="(000) 000-0000" oninput="fmtPhoneInput(this);refreshQuickSummary()" maxlength="14">
            <button class="fcopy-btn" onclick="copyField('qf_phone',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">Sex</label>
          <div class="select-copy-wrap">
            <select class="qfi" id="qf_gender" onchange="refreshQuickSummary()" style="padding:8px 6px">
              <option value=""></option><option>M</option><option>F</option>
            </select>
            <button class="scopy-btn" onclick="copyField('qf_gender',this)">⎘</button>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:10px;margin-bottom:10px">
        <div>
          <label class="qfl qfl-priority">Date of Birth</label>
          <div style="display:flex;align-items:center;gap:6px">
            <div class="field-copy-wrap" style="flex:1">
              <input type="date" class="qfi qfi-priority" id="qf_dob" oninput="updateQuickAge();refreshQuickSummary()" style="border-radius:var(--r-sm) 0 0 var(--r-sm)">
              <button class="fcopy-btn" onclick="copyFieldFmt('qf_dob',this,'dob')"><span class="fc-tip">Copy DOB</span>⎘</button>
            </div>
            <div class="age-display" id="qf_age_display" style="display:none;flex-shrink:0">
              <span class="age-label">AGE</span><span id="qf_age_num">—</span>
            </div>
          </div>
        </div>
        <div><label class="qfl">Email Address</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_email" placeholder="email@example.com" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_email',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
      </div>

      <div style="margin-bottom:4px">
        <label class="qfl">Reason Calling</label>
        <div class="field-copy-wrap">
          <input class="qfi" id="qf_reason" placeholder="e.g. Looking for lower premium, adding coverage…" oninput="refreshQuickSummary()">
          <button class="fcopy-btn" onclick="copyField('qf_reason',this)"><span class="fc-tip">Copy</span>⎘</button>
        </div>
      </div>
    </div>

    <div class="qf-cs-head" onclick="qfToggle('insurance')">
      <span class="qf-cs-label">Insurance Details</span>
      <label class="qf-pin-wrap" onclick="event.stopPropagation()" title="Keep this section open">
        <input type="checkbox" id="qfpin_insurance" onchange="qfSetPin('insurance',this.checked)">
        <span class="qf-pin-icon">📌</span>
      </label>
      <span class="qf-cs-chev" id="qfchev_insurance">▾</span>
    </div>
    <div class="qf-cs-body cs-collapsed" id="qfbody_insurance">
      <div style="display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;margin-bottom:8px">
        <div><label class="qfl qfl-priority">Monthly Premium</label>
          <div class="field-copy-wrap">
            <span class="prefix" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);pointer-events:none;z-index:2">$</span>
            <input class="qfi qfi-priority" id="qf_premium" placeholder="" style="padding-left:26px" oninput="refreshQuickSummary();updateQfCashOut()">
            <button class="fcopy-btn" onclick="copyField('qf_premium',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl qfl-priority">Coverage Amount</label>
          <div class="field-copy-wrap">
            <span class="prefix" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);pointer-events:none;z-index:2">$</span>
            <input class="qfi qfi-priority" id="qf_coverage" placeholder="" style="padding-left:26px" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_coverage',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl qfl-priority">Current Carrier</label>
          <div class="field-copy-wrap">
            <input class="qfi qfi-priority" id="qf_carrier" placeholder="" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_carrier',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:end;gap:8px;margin-bottom:4px">
        <div style="width:140px;flex-shrink:0"><label class="qfl qfl-priority">Policy Since (Year)</label>
          <div class="field-copy-wrap">
            <input class="qfi qfi-priority" id="qf_policy_since" placeholder="e.g. 2019" maxlength="4" pattern="[0-9]{4}" oninput="updatePolicySinceStandard();refreshQuickSummary();updateQfCashOut()">
            <button class="fcopy-btn" onclick="copyField('qf_policy_since',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div id="qf_policy_duration_standard" style="display:none;align-items:center;gap:8px;background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r-sm);padding:8px 14px;font-size:13px;white-space:nowrap;margin-bottom:1px">
          <span style="color:var(--text3);font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase">Policy Age</span>
          <span id="qf_duration_val_standard" style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--gold);margin-left:6px">—</span>
        </div>
      </div>
      <div id="qf_cashout_wrap" style="display:none;flex-direction:column;gap:6px;background:var(--gold-soft);border:1px solid rgba(240,180,41,.3);border-radius:var(--r-sm);padding:10px 14px;margin-bottom:4px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--gold)">💰 Potential Cash-Out</span>
          <span id="qf_cashout_val" style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:800;color:var(--gold)">—</span>
        </div>
        <div id="qf_cashout_formula" style="font-size:10px;color:var(--gold);opacity:.75;font-family:'JetBrains Mono',monospace;line-height:1.6"></div>
      </div>
    </div>

    <div class="qf-cs-head" onclick="qfToggle('address')">
      <span class="qf-cs-label">Address</span>
      <label class="qf-pin-wrap" onclick="event.stopPropagation()" title="Keep this section open">
        <input type="checkbox" id="qfpin_address" onchange="qfSetPin('address',this.checked)">
        <span class="qf-pin-icon">📌</span>
      </label>
      <span class="qf-cs-chev" id="qfchev_address">▾</span>
    </div>
    <div class="qf-cs-body cs-collapsed" id="qfbody_address">
      <div style="display:grid;grid-template-columns:minmax(0,2.5fr) minmax(0,2fr) minmax(0,.8fr) minmax(0,.9fr);gap:10px;margin-bottom:4px">
        <div><label class="qfl">Street Address</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_street" placeholder="123 Main St" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_street',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">City</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_city" placeholder="City" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_city',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">State</label>
          <div class="select-copy-wrap">
            <select class="qfi" id="qf_addrstate" onchange="refreshQuickSummary()" style="padding:8px 6px">${stateOptions}</select>
            <button class="scopy-btn" onclick="copyField('qf_addrstate',this)">⎘</button>
          </div>
        </div>
        <div><label class="qfl">ZIP</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_zip" placeholder="00000" maxlength="10" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_zip',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
      </div>
    </div>

    <div class="qf-cs-head" onclick="qfToggle('appinfo')">
      <span class="qf-cs-label">Additional Info / Physical Details</span>
      <label class="qf-pin-wrap" onclick="event.stopPropagation()" title="Keep this section open">
        <input type="checkbox" id="qfpin_appinfo" onchange="qfSetPin('appinfo',this.checked)">
        <span class="qf-pin-icon">📌</span>
      </label>
      <span class="qf-cs-chev" id="qfchev_appinfo">▾</span>
    </div>
    <div class="qf-cs-body cs-collapsed" id="qfbody_appinfo">
      <div style="display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,.7fr) minmax(0,1.5fr) minmax(0,.7fr);gap:8px;margin-bottom:8px">
        <div><label class="qfl">Height</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_height" placeholder='' oninput="fmtHeightInput(this);refreshQuickSummary()" onkeydown="heightKeydown(event,this)" maxlength="6">
            <button class="fcopy-btn" onclick="copyField('qf_height',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">Weight (lbs)</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_weight" placeholder="" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_weight',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">Driver's License #</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_dl" placeholder="#" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_dl',this)"><span class="fc-tip">Copy</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">DL State</label>
          <div class="select-copy-wrap">
            <select class="qfi" id="qf_dlstate" onchange="refreshQuickSummary()" style="padding:8px 6px">${stateOptions}</select>
            <button class="scopy-btn" onclick="copyField('qf_dlstate',this)">⎘</button>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">
        <div><label class="qfl">Social Security #</label>
          <div class="field-copy-wrap">
            <input class="qfi" id="qf_ssn" placeholder="XXX-XX-XXXX" oninput="refreshQuickSummary()">
            <button class="fcopy-btn" onclick="copyField('qf_ssn',this)"><span class="fc-tip">Copy SSN</span>⎘</button>
          </div>
        </div>
        <div><label class="qfl">Tobacco / Smoker</label>
          <div class="select-copy-wrap">
            <select class="qfi" id="qf_smoker" onchange="refreshQuickSummary()" style="padding:8px 6px">
              <option value=""></option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
              <option value="Former">Former</option>
            </select>
            <button class="scopy-btn" onclick="copyField('qf_smoker',this)">⎘</button>
          </div>
        </div>
      </div>
    </div>

    <div class="qf-cs-head" onclick="qfToggle('qfnotes')">
      <span class="qf-cs-label">Notes</span>
      <label class="qf-pin-wrap" onclick="event.stopPropagation()" title="Keep this section open">
        <input type="checkbox" id="qfpin_qfnotes" onchange="qfSetPin('qfnotes',this.checked)">
        <span class="qf-pin-icon">📌</span>
      </label>
      <span class="qf-cs-chev" id="qfchev_qfnotes">▾</span>
    </div>
    <div class="qf-cs-body cs-collapsed" id="qfbody_qfnotes">
      <div style="margin-bottom:4px;position:relative">
        <textarea class="qfi" id="qf_notes" rows="2" placeholder="Call notes, interests, objections…" style="padding-right:44px;resize:vertical;min-height:44px" oninput="refreshQuickSummary()"></textarea>
        <button class="fcopy-btn" onclick="copyField('qf_notes',this)" style="position:absolute;right:0;top:0;height:42px;border-radius:0 var(--r-sm) 0 0;border-bottom:none"><span class="fc-tip">Copy notes</span>⎘</button>
      </div>
    </div>

    <div class="qf-cs-head" onclick="qfToggle('qfsummary')">
      <span class="qf-cs-label">📋 Client Summary</span>
      <label class="qf-pin-wrap" onclick="event.stopPropagation()" title="Keep this section open">
        <input type="checkbox" id="qfpin_qfsummary" onchange="qfSetPin('qfsummary',this.checked)">
        <span class="qf-pin-icon">📌</span>
      </label>
      <span class="qf-cs-chev" id="qfchev_qfsummary">▾</span>
    </div>
    <div class="qf-cs-body cs-collapsed" id="qfbody_qfsummary">
      <div class="summary-box" style="margin-bottom:4px">
        <div class="summary-box-hdr">
          <div class="summary-box-title">📄 Copy-Ready Summary</div>
          <button class="copy-btn" id="qf_copy_btn" onclick="copyQuickSummary()">📋 Copy to Clipboard</button>
        </div>
        <div class="summary-text" id="qf_summary_output">Fill in fields above to generate summary…</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
      <button class="tb-btn" onclick="clearQuick()">🗑 Clear Form</button>
      <button class="tb-btn primary" onclick="saveQuickCaller()">📞 Save Caller Record</button>
    </div>
    </div><!-- end qf-full-view -->

    <!-- Field grid resizer -->
    <div id="qf-fg-resizer" style="display:none;padding:6px 0 2px;border-top:1px solid var(--border);margin-top:8px">
      <div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:600;letter-spacing:.5px">COLUMN WIDTH</div>
      <div id="qf-fg-track" style="position:relative;height:6px;background:var(--bg4);border-radius:3px;cursor:pointer;border:1px solid var(--border)">
        <div id="qf-fg-fill" style="position:absolute;left:0;top:0;height:100%;background:var(--gold-soft);border-radius:3px;pointer-events:none"></div>
        <div id="qf-fg-thumb" style="position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:var(--gold);border-radius:50%;cursor:grab;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>
      </div>
      <div style="text-align:right;font-size:10px;color:var(--text3);margin-top:3px"><span id="qf-fg-val">50</span>%</div>
    </div>
  </div>`;
}

// ── QUICK CALLER SAVE ─────────────────────────────────────────────────────────
function qfv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

const DRAFT_KEY = 'pcrm_caller_draft';

function saveDraft() {
  const fields = ['qf_first','qf_last','qf_phone','qf_dob','qf_email','qf_street','qf_city','qf_zip',
    'qf_coverage','qf_premium','qf_carrier','qf_ssn','qf_height','qf_weight','qf_dl','qf_notes','qf_policy_since','qf_reason'];
  const draft = {};
  fields.forEach(id => { const el = document.getElementById(id); if (el) draft[id] = el.value; });
  ['qf_addrstate','qf_dlstate','qf_gender'].forEach(id => { const el = document.getElementById(id); if (el) draft[id] = el.value; });
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    if (!Object.keys(draft).length) return;
    Object.entries(draft).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    updateQuickAge();
    refreshQuickSummary();
    updatePolicySinceStandard();
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function saveQuickCaller() {
  if (_compactMode) syncAllToFull();
  const first = qfv('qf_first');
  const last  = qfv('qf_last');
  if (!first && !last) {
    toast('⚠️ Enter at least a first or last name');
    const f = document.getElementById('qf_first');
    const l = document.getElementById('qf_last');
    if (f) { f.style.borderColor = 'var(--red)'; setTimeout(() => f.style.borderColor = '', 3000); }
    if (l) { l.style.borderColor = 'var(--red)'; setTimeout(() => l.style.borderColor = '', 3000); }
    return;
  }
  const addrParts = [qfv('qf_street'), qfv('qf_city'), qfv('qf_addrstate'), qfv('qf_zip')].filter(Boolean);
  const rec = {
    id: uid(),
    first:    first || 'Unknown',
    last:     last  || 'Caller',
    dob:      qfv('qf_dob'),
    phone:    qfv('qf_phone'),
    email:    qfv('qf_email'),
    address:  addrParts.join(', '),
    addrStreet: qfv('qf_street'),
    addrCity:   qfv('qf_city'),
    addrState:  qfv('qf_addrstate'),
    addrZip:    qfv('qf_zip'),
    height:   qfv('qf_height'),
    weight:   qfv('qf_weight'),
    dl:       qfv('qf_dl'),
    dlstate:  qfv('qf_dlstate'),
    ssn:      qfv('qf_ssn'),
    product:  '',
    smoker:   '',
    gender:   qfv('qf_gender'),
    status:   'New',
    source:   'Inbound Call',
    notes:    qfv('qf_notes'),
    reason:   qfv('qf_reason'),
    existingPolicy: {
      premium:  qfv('qf_premium'),
      coverage: qfv('qf_coverage'),
      carrier:  qfv('qf_carrier'),
      since:    qfv('qf_policy_since'),
    },
    policies: [{ id: uid(), coverage: '', premium: '', annualPremium: '', carrier: '', product: '', policyNum: '', beneficiary: '', soldDate: '', chargeback: '', chargebackAmt: '' }],
    created: new Date().toISOString()
  };
  const data = ld('callers');
  data.push(rec);
  sv('callers', data);
  const hist = ldCallHistory();
  hist.push(Object.assign({}, rec, { histId: rec.id }));
  svCallHistory(hist);
  clearDraft();
  clearQuick();
  renderCurrent();
  updateCounts();
  toast('📞 Caller saved!');
}

function clearQuick() {
  clearDraft();
  ['cqf_first','cqf_last','cqf_phone','cqf_dob','cqf_premium','cqf_coverage','cqf_carrier','cqf_policy_since','cqf_notes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['cqf_gender'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
  const durEl = document.getElementById('cqf_duration_val'); if (durEl) durEl.textContent = '—';
  const ageEl = document.getElementById('cqf_age_display');  if (ageEl) ageEl.textContent = '—';
  const stdDur = document.getElementById('qf_policy_duration_standard'); if (stdDur) stdDur.style.display = 'none';
  ['qf_first','qf_last','qf_dob','qf_phone','qf_email','qf_street','qf_city','qf_zip',
   'qf_policy_since','qf_reason','qf_height','qf_weight','qf_dl',
   'qf_coverage','qf_premium','qf_carrier','qf_ssn','qf_notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['qf_addrstate','qf_dlstate','qf_gender'].forEach(id => {
    const el = document.getElementById(id); if (el) el.selectedIndex = 0;
  });
  const disp = document.getElementById('qf_age_display'); if (disp) disp.style.display = 'none';
  const out  = document.getElementById('qf_summary_output');
  if (out) out.textContent = 'Fill in fields above to generate summary…';
}

function updateQuickAge() {
  const val  = document.getElementById('qf_dob')?.value;
  const age  = calcAge(val);
  const disp = document.getElementById('qf_age_display');
  const num  = document.getElementById('qf_age_num');
  if (disp && num) {
    if (age !== null) { num.textContent = age; disp.style.display = 'inline-flex'; }
    else { disp.style.display = 'none'; }
  }
}

function refreshQuickSummary() {
  saveDraft();
  const out = document.getElementById('qf_summary_output');
  if (!out) return;

  const first    = qfv('qf_first');
  const last     = qfv('qf_last');
  const dob      = qfv('qf_dob');
  const age      = calcAge(dob);
  const phone    = qfv('qf_phone');
  const email    = qfv('qf_email');
  const addrParts = [qfv('qf_street'), qfv('qf_city'), qfv('qf_addrstate'), qfv('qf_zip')].filter(Boolean);
  const address  = addrParts.join(', ');
  const coverage = qfv('qf_coverage');
  const premium  = qfv('qf_premium');
  const carrier  = qfv('qf_carrier');
  const ssn      = qfv('qf_ssn');
  const height   = qfv('qf_height');
  const weight   = qfv('qf_weight');
  const dl       = qfv('qf_dl');
  const dlstate  = qfv('qf_dlstate');
  const notes    = qfv('qf_notes');
  const reason   = qfv('qf_reason');

  const lines = [];
  if (first || last) lines.push([first, last].filter(Boolean).join(' '));
  if (reason)   lines.push('Reason: ' + reason);
  if (dob)      lines.push('DOB: ' + fmtDOB(dob) + (age !== null ? ' (Age ' + age + ')' : ''));
  if (phone)    lines.push('Phone: ' + phone);
  if (email)    lines.push('Email: ' + email);
  if (address)  lines.push('Address: ' + address);
  if (coverage) lines.push('Coverage: ' + fmtMoney(coverage));
  if (premium)  lines.push('Premium: ' + fmtPrem(premium));
  if (carrier)  lines.push('Carrier: ' + carrier);
  if (ssn)      lines.push('SSN: ' + ssn);
  if (height)   lines.push('Height: ' + height);
  if (weight)   lines.push('Weight: ' + weight + ' lbs');
  if (dl)       lines.push('DL: ' + dl + (dlstate ? ' ' + dlstate : ''));
  if (notes)    lines.push(notes);

  out.textContent = lines.length ? lines.join('\n') : 'Fill in fields above to generate summary…';

  const btn = document.getElementById('qf_copy_btn');
  if (btn && btn.classList.contains('copied')) {
    btn.classList.remove('copied');
    btn.textContent = '📋 Copy to Clipboard';
  }
}

function copyQuickSummary() {
  const out = document.getElementById('qf_summary_output');
  if (!out || out.textContent.startsWith('Fill in')) return;
  const text = out.textContent;
  const btn = document.getElementById('qf_copy_btn');
  const confirm = () => {
    if (btn) { btn.textContent = '✓ Copied!'; btn.classList.add('copied'); }
    setTimeout(() => { if (btn) { btn.textContent = '📋 Copy to Clipboard'; btn.classList.remove('copied'); } }, 2500);
  };
  navigator.clipboard.writeText(text).then(confirm).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    confirm();
  });
}

// ── COMPACT MODE ──────────────────────────────────────────────────────────────
let _compactMode = false;

function toggleCompactMode() {
  _compactMode = !_compactMode;
  const form = document.getElementById('quick-form-wrap');
  const btn  = document.getElementById('qf-compact-btn');
  if (!form) return;
  form.classList.toggle('compact-mode', _compactMode);
  if (btn) btn.textContent = _compactMode ? '⊟ Full' : '⊞ Compact';
  if (_compactMode) syncAllToCompact();
}

function syncCompact(field) {
  const map = { first:'qf_first', last:'qf_last', phone:'qf_phone', dob:'qf_dob',
                premium:'qf_premium', coverage:'qf_coverage', carrier:'qf_carrier', gender:'qf_gender' };
  const compactEl = document.getElementById('cqf_' + field);
  const fullEl    = document.getElementById(map[field]);
  if (fullEl && compactEl) fullEl.value = compactEl.value;
  refreshQuickSummary();
}

function syncAllToFull() {
  const pairs = [['cqf_first','qf_first'],['cqf_last','qf_last'],['cqf_phone','qf_phone'],
                 ['cqf_dob','qf_dob'],['cqf_premium','qf_premium'],['cqf_coverage','qf_coverage'],
                 ['cqf_carrier','qf_carrier'],['cqf_gender','qf_gender']];
  pairs.forEach(([c, f]) => {
    const ce = document.getElementById(c), fe = document.getElementById(f);
    if (ce && fe) fe.value = ce.value;
  });
  const cn = document.getElementById('cqf_notes'), fn = document.getElementById('qf_notes');
  if (cn && fn) fn.value = cn.value;
}

function syncAllToCompact() {
  const pairs = [['qf_first','cqf_first'],['qf_last','cqf_last'],['qf_phone','cqf_phone'],
                 ['qf_dob','cqf_dob'],['qf_premium','cqf_premium'],['qf_coverage','cqf_coverage'],
                 ['qf_carrier','cqf_carrier'],['qf_gender','cqf_gender']];
  pairs.forEach(([f, c]) => {
    const fe = document.getElementById(f), ce = document.getElementById(c);
    if (fe && ce) ce.value = fe.value;
  });
  const fn = document.getElementById('qf_notes'), cn = document.getElementById('cqf_notes');
  if (fn && cn) cn.value = fn.value;
  updateCompactAge();
}

function syncCompactNotes() {
  const ce = document.getElementById('cqf_notes');
  const fe = document.getElementById('qf_notes');
  if (ce && fe) fe.value = ce.value;
  refreshQuickSummary();
}

function updateCompactAge() {
  const dob = document.getElementById('cqf_dob')?.value;
  const age = calcAge(dob);
  const el  = document.getElementById('cqf_age_display');
  if (el) el.textContent = age !== null ? 'Age ' + age : '—';
}

// ── QF SECTION TOGGLE ─────────────────────────────────────────────────────────
function qfToggle(id) {
  const body    = document.getElementById('qfbody_' + id);
  const chevron = document.getElementById('qfchev_' + id);
  if (!body) return;
  const collapsed = body.classList.toggle('cs-collapsed');
  if (chevron) chevron.textContent = collapsed ? '▾' : '▴';
}

// ── FIELD GRID RESIZER ────────────────────────────────────────────────────────
function initQfResizer() {
  const track = document.getElementById('qf-fg-track');
  const thumb = document.getElementById('qf-fg-thumb');
  const fill  = document.getElementById('qf-fg-fill');
  const valEl = document.getElementById('qf-fg-val');
  const form  = document.getElementById('quick-form-wrap');
  if (!track || !thumb || !form) return;

  const saved = parseInt(localStorage.getItem('pcrm_fg_split') || '50');

  function applyQfPct(pct) {
    pct = Math.max(20, Math.min(80, Math.round(pct)));
    thumb.style.left = pct + '%';
    if (fill)  fill.style.width  = pct + '%';
    if (valEl) valEl.textContent = pct;
    form.style.setProperty('--qf-col', pct + 'fr');
    localStorage.setItem('pcrm_fg_split', pct);
  }
  applyQfPct(saved);

  let _qdrag = false;
  thumb.addEventListener('mousedown', e => { _qdrag = true; e.preventDefault(); });
  document.addEventListener('mousemove', e => {
    if (!_qdrag) return;
    const rect = track.getBoundingClientRect();
    applyQfPct(((e.clientX - rect.left) / rect.width) * 100);
  });
  document.addEventListener('mouseup', () => { _qdrag = false; });
  track.addEventListener('click', e => {
    const rect = track.getBoundingClientRect();
    applyQfPct(((e.clientX - rect.left) / rect.width) * 100);
  });
}

// ── DRAG AND DROP (caller form sections) ──────────────────────────────────────
let _qfDragSrc = null;

function qfDragStart(e) {
  _qfDragSrc = e.currentTarget;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function qfDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.target.closest('.qf-drag-item');
  if (target && target !== _qfDragSrc) {
    document.querySelectorAll('.qf-drag-item').forEach(el => el.classList.remove('drag-over'));
    target.classList.add('drag-over');
  }
}

function qfDrop(e, gridId) {
  e.preventDefault();
  const grid = document.getElementById(gridId);
  if (!grid || !_qfDragSrc) return;
  const target = e.target.closest('.qf-drag-item');
  document.querySelectorAll('.qf-drag-item').forEach(el => {
    el.classList.remove('drag-over');
    el.classList.remove('dragging');
  });
  if (!target || target === _qfDragSrc) { _qfDragSrc = null; return; }
  const items  = [...grid.querySelectorAll('.qf-drag-item')];
  const srcIdx = items.indexOf(_qfDragSrc);
  const tgtIdx = items.indexOf(target);
  if (srcIdx === -1 || tgtIdx === -1) { _qfDragSrc = null; return; }
  if (srcIdx < tgtIdx) grid.insertBefore(_qfDragSrc, target.nextSibling);
  else                  grid.insertBefore(_qfDragSrc, target);
  _qfDragSrc = null;
}

// ── TRANSFER CALLER ───────────────────────────────────────────────────────────
function transferCaller(id, dest) {
  const callers = ld('callers');
  const rec = callers.find(r => r.id === id);
  if (!rec) return;
  const destLabel = dest === 'prospects' ? 'Prospect' : 'Active Client';
  if (!confirm(`Transfer ${rec.first} ${rec.last} to ${destLabel}s?`)) return;
  const today = new Date().toISOString().slice(0, 10);
  const newRec = Object.assign({}, rec, {
    id: uid(),
    status:          dest === 'clients' ? 'Client' : 'Prospect',
    soldDate:        dest === 'clients' ? today : (rec.soldDate || ''),
    transferredFrom: 'callers',
    created:         new Date().toISOString()
  });
  const destData = ld(dest);
  destData.push(newRec);
  sv(dest, destData);
  rec.convertedTo = dest;
  rec.convertedAt = new Date().toISOString();
  const idx = callers.findIndex(r => r.id === id);
  if (idx > -1) callers[idx] = rec;
  sv('callers', callers);
  renderCurrent();
  updateCounts();
  toast(`✓ ${rec.first} ${rec.last} added to ${destLabel}s`);
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────
function exportData() {
  const all = {
    prospects:   ld('prospects'),
    clients:     ld('clients'),
    callers:     ld('callers'),
    callhistory: ldCallHistory(),
    pipeline:    ld('pipeline'),
    tasks:       ld('tasks'),
    exported:    new Date().toISOString()
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }));
  a.download = 'policypro-backup-' + Date.now() + '.json';
  a.click();
  toast('📤 Backup exported');
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      ['prospects','clients','callers','pipeline','tasks'].forEach(k => { if (d[k]) sv(k, d[k]); });
      if (d.callhistory) svCallHistory(d.callhistory);
      renderCurrent();
      updateCounts();
      toast('📥 Import complete');
    } catch { toast('❌ Invalid file'); }
  };
  r.readAsText(file);
  e.target.value = '';
}


// ── SIGN OUT ──────────────────────────────────────────────────────────────────
async function handleSignOut() {
  await signOut();
  window.location.href = 'index.html';
}

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (typeof attemptClose === 'function') attemptClose();
  }
});

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  // Overlay starts visible in app.html — nothing renders behind it until auth passes.

  // Guard: redirect immediately if Supabase failed to initialize
  if (typeof supabase === 'undefined' || typeof supabase.auth === 'undefined') {
    window.location.href = 'index.html';
    return;
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    window.location.href = 'index.html';
    return;
  }

  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  applyTheme();

  // Show agent name
  const storedName = localStorage.getItem('pcrm_agent') || user.email?.split('@')[0] || 'Agent';
  const nameEl = document.getElementById('agent-name-display');
  if (nameEl) {
    nameEl.textContent = storedName;
    nameEl.title = user.email || '';
  }

  try {
    await loadFromCloud();
  } catch (e) {
    console.error('Failed to load data from cloud:', e);
  }

  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';

  updateCounts();
  renderCurrent();
}

init();

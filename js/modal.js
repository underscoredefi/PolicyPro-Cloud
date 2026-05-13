// ── MODAL / FORM LOGIC ────────────────────────────────────────────────────────

const SCHEMAS = {
  prospects: { title: 'Prospect',    icon: '👥' },
  clients:   { title: 'Client',      icon: '🛡' },
  callers:   { title: 'Caller',      icon: '📞' },
  pipeline:  { title: 'Application', icon: '📋' },
  tasks:     { title: 'Follow-Up',   icon: '✅' },
};

const FIELD_KEYS = {
  prospects: ['first','last','dob','phone','email','reason','addrStreet','addrCity','addrState','addrZip','ssn','height','weight','dl','dlstate','smoker','health','status','source','commission','notesList','policies'],
  clients:   ['first','last','dob','phone','email','reason','addrStreet','addrCity','addrState','addrZip','ssn','height','weight','dl','dlstate','smoker','health','commission','payoutAmt','payoutDate','status','source','notesList','policies'],
  callers:   ['first','last','dob','phone','email','addrStreet','addrCity','addrState','addrZip','coverage','premium','carrier','ssn','height','weight','dl','dlstate','gender','smoker','health','status','source','notes','notesList','policies','noInsurance','reason'],
  pipeline:  ['first','last','dob','phone','email','coverage','premium','carrier','product','stage','policyNum','notes'],
  tasks:     ['title','contact','phone','due','priority','status','notes'],
};

let _modalSec = null, _modalId = null, _modalIsNew = false, _modalSnapshot = null;
let _historyEditId = null;

// ── OPEN / CLOSE ──────────────────────────────────────────────────────────────
function openDetail(sec, id) {
  const rec = ld(sec).find(r => r.id === id);
  if (!rec) return;
  showModal(sec, rec, false);
}

function openNew() {
  const rec = { id: uid() };
  showModal(section, rec, true);
}

function showModal(sec, rec, isNew) {
  _modalSec = sec; _modalId = rec.id; _modalIsNew = isNew;
  const schema   = SCHEMAS[sec] || { title: 'Record', icon: '📄' };
  const headline = rec.first ? `${rec.first} ${rec.last || ''}`.trim() : (rec.title || `New ${schema.title}`);
  const subline  = rec.carrier || rec.contact || (isNew ? `Fill in details below` : sec);
  const tsStr    = rec.created
    ? new Date(rec.created).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="overlay" id="modal-overlay" onclick="closeMIfBg(event)">
      <div class="modal" id="modal-inner">
        <div class="modal-hdr">
          <div style="flex:1;min-width:0">
            <div class="modal-name">${isNew ? `New ${schema.title}` : headline}</div>
            <div class="modal-sub">${subline}</div>
            ${tsStr && !isNew ? `<div style="font-size:11px;color:var(--text3);margin-top:3px;font-family:'JetBrains Mono',monospace">📅 ${tsStr}</div>` : ''}
          </div>
          <div class="modal-close" onclick="attemptClose()">✕</div>
        </div>
        <div class="modal-body">${buildModalFields(sec, rec, isNew)}</div>
        <div id="save-prompt" style="display:none;padding:12px 22px;background:var(--gold-soft);border-top:2px solid var(--gold);animation:slideUp .15s ease">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--gold)">⚠️ You have unsaved changes</div>
            <div style="display:flex;gap:8px">
              <button class="tb-btn" onclick="discardAndClose()" style="color:var(--red);border-color:var(--red)">Discard & Close</button>
              <button class="tb-btn primary" onclick="saveAndClose()">✓ Save & Close</button>
            </div>
          </div>
        </div>
        <div class="modal-foot" id="modal-foot-bar">
          ${!isNew ? `<button class="del-btn" onclick="deleteRec('${sec}','${rec.id}')">🗑 Delete</button>` : ''}
          ${(!isNew && sec === 'prospects') ? `<button class="tb-btn" onclick="moveRecord('prospects','clients','${rec.id}')" style="color:var(--green);border-color:var(--green)">🛡 Move to Client</button>` : ''}
          ${(!isNew && sec === 'clients')   ? `<button class="tb-btn" onclick="moveRecord('clients','prospects','${rec.id}')" style="color:var(--gold);border-color:var(--gold)">👥 Move to Prospect</button>` : ''}
          <button class="tb-btn" onclick="attemptClose()">Cancel</button>
          <button class="tb-btn primary" onclick="saveRec('${sec}','${rec.id}',${isNew})">
            ${isNew ? '＋ Create' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>`);

  setTimeout(() => {
    _modalSnapshot = snapshotModal();
    refreshSummary();
    updateYearlyBadge();
    updatePayoutPct();
    document.querySelectorAll('[data-key="premium"]').forEach(el => {
      const i = parseInt(el.getAttribute('data-pol'));
      if (!isNaN(i)) updateYrBadge(i);
    });
  }, 50);
}

function snapshotModal() {
  const snap = {};
  document.querySelectorAll('#modal-overlay .fi, #modal-overlay input[type="hidden"]').forEach(el => {
    if (el.id) snap[el.id] = el.value;
  });
  return JSON.stringify(snap);
}

function modalIsDirty() {
  if (_modalIsNew) {
    const parsed = JSON.parse(snapshotModal() || '{}');
    return Object.entries(parsed).some(([k, v]) => v && k !== 'f_notesList' && k !== 'f_fu_priority');
  }
  if (!_modalSnapshot) return false;
  return snapshotModal() !== _modalSnapshot;
}

function attemptClose() {
  if (modalIsDirty()) {
    const prompt = document.getElementById('save-prompt');
    const foot   = document.getElementById('modal-foot-bar');
    if (prompt) prompt.style.display = 'block';
    if (foot)   foot.style.display   = 'none';
    const modal = document.querySelector('#modal-overlay .modal');
    if (modal) modal.scrollTop = modal.scrollHeight;
  } else {
    closeM();
  }
}

function saveAndClose()    { saveRec(_modalSec, _modalId, _modalIsNew); }
function discardAndClose() { _modalSnapshot = null; closeM(); }
function closeMIfBg(e)     { if (e.target.id === 'modal-overlay') attemptClose(); }

function closeM() {
  const m = document.getElementById('modal-overlay');
  if (m) m.remove();
  _modalSec = null; _modalId = null; _modalIsNew = false; _modalSnapshot = null;
  _historyEditId = null;
}

// ── BUILD MODAL FIELDS ────────────────────────────────────────────────────────
function buildModalFields(sec, rec, isNew) {
  if (sec === 'tasks')    return buildTaskFields(rec);
  if (sec === 'pipeline') return buildPipelineFields(rec);
  return buildPersonFields(sec, rec);
}

function buildPersonFields(sec, rec) {
  const isClient = sec === 'clients';
  const age = calcAge(rec.dob);

  const notesList = Array.isArray(rec.notesList)
    ? rec.notesList
    : (rec.notes ? [{ id: uid(), text: rec.notes, ts: rec.created || new Date().toISOString() }] : []);

  const notesHtml = notesList.map((n, i) => `
    <div id="note_${i}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px;position:relative">
      <div style="font-size:10.5px;color:var(--text3);margin-bottom:5px;font-family:'JetBrains Mono',monospace">${new Date(n.ts).toLocaleString()}</div>
      <div style="font-size:13.5px;white-space:pre-wrap;line-height:1.5">${n.text.replace(/</g, '&lt;')}</div>
      <button onclick="deleteNote(${i})" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 5px;border-radius:4px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">✕</button>
    </div>`).join('');

  let policies = Array.isArray(rec.policies) ? rec.policies : [];
  if (!policies.length && !sec.includes('caller') && (rec.coverage || rec.premium || rec.carrier || rec.product)) {
    policies = [{ id: uid(), coverage: rec.coverage || '', premium: rec.premium || '', carrier: rec.carrier || '', product: rec.product || '', policyNum: rec.policyNum || '', beneficiary: rec.beneficiary || '', soldDate: isClient ? (rec.soldDate || new Date().toISOString().slice(0, 10)) : '', chargeback: '', chargebackAmt: '', notes: '' }];
  }
  if (!policies.length) {
    policies = [{ id: uid(), coverage: '', premium: '', annualPremium: '', carrier: '', product: '', policyNum: '', beneficiary: '', soldDate: isClient ? (rec.soldDate || new Date().toISOString().slice(0, 10)) : '', chargeback: '', chargebackAmt: '' }];
  }
  const today = new Date().toISOString().slice(0, 10);
  policies = policies.map(p => ({ ...p, soldDate: p.soldDate || (isClient ? (rec.soldDate || today) : '') }));

  const existingPolicy = rec.existingPolicy || {};

  function calcCashOut(premium, since) {
    const monthly = parseFloat((premium || '').toString().replace(/[^0-9.]/g, '')) || 0;
    const yr = parseInt(since) || 0;
    if (!monthly || !yr) return null;
    const years = new Date().getFullYear() - yr;
    if (years < 1) return null;
    return monthly * 12 * (years - 1) * 0.2;
  }

  function renderExistingPolicyBlock(ep) {
    const cashOut = calcCashOut(ep.premium, ep.since);
    const cashHTML = cashOut !== null
      ? `<div id="ep_cashout_wrap" style="grid-column:1/-1;display:flex;align-items:center;gap:12px;background:var(--gold-soft);border:1px solid rgba(240,180,41,.3);border-radius:var(--r-sm);padding:10px 14px;margin-top:4px"><span style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--gold)">💰 Potential Cash-Out</span><span id="ep_cashout_val" style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--gold);margin-left:auto">$${cashOut.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>`
      : `<div id="ep_cashout_wrap" style="grid-column:1/-1;display:none;align-items:center;gap:12px;background:var(--gold-soft);border:1px solid rgba(240,180,41,.3);border-radius:var(--r-sm);padding:10px 14px;margin-top:4px"><span style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--gold)">💰 Potential Cash-Out</span><span id="ep_cashout_val" style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--gold);margin-left:auto"></span></div>`;
    return `<div style="background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r);padding:14px;margin-bottom:10px">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">📋 Existing Policy (Prior to Sale)</div>
      <div class="field-grid">
        <div><label class="fl">Monthly Premium</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" id="ep_premium" value="${esc(ep.premium)}" placeholder="e.g. 187.50" oninput="updateEP()"></div></div>
        <div><label class="fl">Coverage Amount</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" id="ep_coverage" value="${esc(ep.coverage)}" placeholder="e.g. 250000" oninput="updateEP()"></div></div>
        <div><label class="fl">Current Carrier</label><input class="fi" id="ep_carrier" value="${esc(ep.carrier)}" placeholder="e.g. MetLife" oninput="updateEP()"></div>
        <div><label class="fl">Policy Since (Year)</label><input class="fi" id="ep_since" value="${esc(ep.since)}" placeholder="e.g. 2019" maxlength="4" oninput="updateEP()"></div>
        ${cashHTML}
      </div>
      <input type="hidden" id="f_existingPolicy" value="${esc(JSON.stringify(ep))}">
    </div>`;
  }

  function renderPolicyCards(pols) {
    return pols.map((p, i) => {
      const yr = (parseFloat((p.premium || '').toString().replace(/[^0-9.]/g, '')) || 0) * 12;
      const hasCB = p.chargeback === 'Yes';
      return `<div style="background:var(--bg3);border:1px solid ${hasCB ? 'var(--red)' : 'var(--border)'};border-radius:var(--r);padding:14px;margin-bottom:10px;position:relative" id="policy_card_${i}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${hasCB ? 'var(--red)' : 'var(--gold)'}">
            ${hasCB ? '⚠️ CHARGEBACK — ' : ''} Policy ${i + 1}
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${sec === 'prospects' ? `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;font-weight:600">
              <input type="checkbox" data-pol="${i}" data-key="sold" ${p.sold ? 'checked' : ''} onchange="updatePolicyField(${i},'sold',this.checked);rerenderPolicies()" style="accent-color:var(--green);width:14px;height:14px">
              <span style="color:${p.sold ? 'var(--green)' : 'var(--text3)'}">Sold</span></label>` : ''}
            ${pols.length > 1 ? `<button onclick="removePolicy(${i})" style="background:none;border:1px solid var(--border2);color:var(--text3);font-size:11px;padding:3px 8px;border-radius:5px;cursor:pointer;font-family:'Outfit',sans-serif" onmouseover="this.style.color='var(--red)';this.style.borderColor='var(--red)'" onmouseout="this.style.color='var(--text3)';this.style.borderColor='var(--border2)'">✕ Remove</button>` : ''}
          </div>
        </div>
        <div class="field-grid">
          <div><label class="fl">Coverage (Death Benefit)</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" data-pol="${i}" data-key="coverage" value="${esc(p.coverage)}" placeholder="e.g. 250000" oninput="updatePolicyField(${i},'coverage',this.value)"></div></div>
          <div><label class="fl">Monthly Premium <span id="pol_yr_badge_${i}" style="font-size:10px;font-weight:600;color:var(--text3);font-family:'JetBrains Mono',monospace;background:var(--bg4);border:1px solid var(--border);padding:1px 6px;border-radius:4px;margin-left:4px">${yr > 0 ? '($' + yr.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + '/yr)' : ''}</span></label>
            <div class="prefix-wrap"><span class="prefix">$</span><input class="fi" data-pol="${i}" data-key="premium" value="${esc(p.premium)}" placeholder="e.g. 187.50" oninput="updatePolicyField(${i},'premium',this.value);updateYrBadge(${i})"></div></div>
          <div><label class="fl">Annual Premium</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" data-pol="${i}" data-key="annualPremium" value="${esc(p.annualPremium)}" placeholder="e.g. 2250.00" oninput="updatePolicyField(${i},'annualPremium',this.value)"></div></div>
          <div><label class="fl">Carrier</label><input class="fi" data-pol="${i}" data-key="carrier" value="${esc(p.carrier)}" placeholder="e.g. Mutual of Omaha" oninput="updatePolicyField(${i},'carrier',this.value)"></div>
          <div><label class="fl">Product Type</label>
            <select class="fi" data-pol="${i}" data-key="product" onchange="updatePolicyField(${i},'product',this.value)">
              ${['','Term 10','Term 20','Term 30','Whole Life','Universal Life','Final Expense','Guaranteed Issue','Indexed UL','Variable Life','Other'].map(o => `<option ${o === (p.product || '') ? 'selected' : ''}>${o}</option>`).join('')}
            </select></div>
          <div><label class="fl">Policy Number</label><input class="fi" data-pol="${i}" data-key="policyNum" value="${esc(p.policyNum)}" oninput="updatePolicyField(${i},'policyNum',this.value)"></div>
          <div><label class="fl">Primary Beneficiary</label><input class="fi" data-pol="${i}" data-key="beneficiary" value="${esc(p.beneficiary)}" oninput="updatePolicyField(${i},'beneficiary',this.value)"></div>
          <div><label class="fl">📅 Policy Sold Date</label><input type="date" class="fi" data-pol="${i}" data-key="soldDate" value="${p.soldDate || ''}" oninput="updatePolicyField(${i},'soldDate',this.value)"></div>
          <div><label class="fl">📅 Effective Date <span style="font-size:9.5px;color:var(--text3);font-weight:500;text-transform:none;letter-spacing:0">(First Payment Date)</span></label>
            <input type="date" class="fi" data-pol="${i}" data-key="effectiveDate" value="${p.effectiveDate || ''}" oninput="updatePolicyField(${i},'effectiveDate',this.value)"></div>
          ${isClient ? `
          <div><label class="fl">Chargeback Status</label>
            <select class="fi" data-pol="${i}" data-key="chargeback" onchange="updatePolicyField(${i},'chargeback',this.value);rerenderPolicies()">
              ${['','No','Yes'].map(o => `<option ${o === (p.chargeback || '') ? 'selected' : ''}>${o}</option>`).join('')}
            </select></div>
          <div><label class="fl">Chargeback Amount</label><div class="prefix-wrap"><span class="prefix">$</span>
            <input class="fi" data-pol="${i}" data-key="chargebackAmt" value="${esc(p.chargebackAmt)}" placeholder="0.00" oninput="updatePolicyField(${i},'chargebackAmt',this.value)" ${hasCB ? '' : 'style="opacity:.5"'} ${hasCB ? '' : 'readonly'}>
          </div></div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function csec(id, label, content, open = true, extra = '') {
    return `<div class="cs-head" onclick="toggleSection('${id}')"><span>${label}</span>${extra}<span class="cs-chevron" id="cs_chev_${id}">${open ? '▴' : '▾'}</span></div>
    <div class="cs-body ${open ? '' : 'cs-collapsed'}" id="cs_body_${id}">${content}</div>`;
  }

  const policyAddBtn = `<button id="add-policy-btn" onclick="event.stopPropagation();addPolicy()" style="padding:3px 9px;border-radius:5px;border:1px solid var(--gold);background:var(--gold-soft);color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;margin-left:auto;display:${rec.noInsurance ? 'none' : 'inline-flex'}">＋ Add Policy</button>`;

  const addrParts = (rec.address || '').split(',').map(s => s.trim());
  const addrStreet = rec.addrStreet || addrParts[0] || '';
  const addrCity   = rec.addrCity   || addrParts[1] || '';
  const addrState  = rec.addrState  || addrParts[2] || '';
  const addrZip    = rec.addrZip    || addrParts[3] || '';
  const US_STATES  = ['','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

  return `
    ${csec('personal','Personal Information',`
    <div class="field-grid" style="padding:2px 0 8px">
      <div><label class="fl">First Name</label><input class="fi" id="f_first" value="${esc(rec.first)}" oninput="refreshSummary()"></div>
      <div><label class="fl">Last Name</label><input class="fi" id="f_last" value="${esc(rec.last)}" oninput="refreshSummary()"></div>
      <div>
        <label class="fl">Date of Birth</label>
        <div class="dob-row">
          <input type="date" class="fi" id="f_dob" value="${rec.dob || ''}" oninput="updateModalAge();refreshSummary()" style="flex:1">
          <div class="age-display" id="modal_age_display" style="${age !== null ? '' : 'display:none'}">
            <span class="age-label">AGE</span><span id="modal_age_num">${age !== null ? age : '—'}</span>
          </div>
        </div>
      </div>
      <div><label class="fl">Phone</label><input class="fi" id="f_phone" value="${esc(rec.phone)}" oninput="refreshSummary()"></div>
      <div class="field-full"><label class="fl">Email Address</label><input class="fi" id="f_email" value="${esc(rec.email)}" oninput="refreshSummary()"></div>
      <div class="field-full"><label class="fl">Reason Calling</label><input class="fi" id="f_reason" value="${esc(rec.reason || '')}" placeholder="e.g. Looking for lower premium, adding coverage…" oninput="refreshSummary()"></div>
      <div class="field-full"><label class="fl">Street Address</label><input class="fi" id="f_addrStreet" value="${esc(addrStreet)}" placeholder="123 Main St" oninput="refreshSummary()"></div>
      <div><label class="fl">City</label><input class="fi" id="f_addrCity" value="${esc(addrCity)}" placeholder="City" oninput="refreshSummary()"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label class="fl">State</label><select class="fi" id="f_addrState" onchange="refreshSummary()">${US_STATES.map(s => `<option ${s === (addrState || '') ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label class="fl">ZIP</label><input class="fi" id="f_addrZip" value="${esc(addrZip)}" placeholder="00000" maxlength="10" oninput="refreshSummary()"></div>
      </div>
    </div>`, true)}

    ${csec('policy','Policy Details',`
    <div style="padding:2px 0 8px">
      ${renderExistingPolicyBlock(existingPolicy)}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--r-sm)">
        <input type="checkbox" id="f_noInsurance" ${rec.noInsurance ? 'checked' : ''} onchange="toggleNoInsurance()" style="width:16px;height:16px;cursor:pointer;accent-color:var(--gold);flex-shrink:0">
        <label for="f_noInsurance" style="font-size:13px;color:var(--text2);cursor:pointer;user-select:none;margin:0">No known insurance policy</label>
      </div>
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;margin-top:14px;display:flex;align-items:center;gap:8px">
        ${isClient ? '🛡 Policy Written by Me' : '📝 New / Sold Policy'}
        <span style="flex:1;height:1px;background:var(--border);display:block"></span>
      </div>
      <div id="policies-container" style="display:${rec.noInsurance ? 'none' : 'block'}">${renderPolicyCards(policies)}</div>
      <input type="hidden" id="f_policies" value="${esc(JSON.stringify(policies))}">
      <input type="hidden" id="f_noInsurance_val" value="${rec.noInsurance ? 'true' : ''}">
    </div>`, true, policyAddBtn)}

    ${sec !== 'callers' ? csec('commission','Commission',`
    <div style="padding:2px 0 8px;display:flex;align-items:center;gap:16px">
      <div style="display:flex;align-items:center;gap:10px">
        <label class="fl" style="margin:0">Commission Received?</label>
        <select class="fi" id="f_commission" onchange="toggleCommissionDate()" style="width:90px">
          ${['No','Yes'].map(o => `<option ${o === (rec.commission || 'No') ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>
      <div id="commission_date_wrap" style="display:${rec.commission === 'Yes' ? 'flex' : 'none'};align-items:center;gap:8px">
        <label class="fl" style="margin:0;white-space:nowrap">Date Received</label>
        <input type="date" class="fi" id="f_payoutDate" value="${rec.payoutDate || ''}" style="width:160px" oninput="refreshSummary()">
      </div>
    </div>`, true) : ''}

    ${isClient ? csec('payout','💵 Carrier Payout',`
    <div class="field-grid" style="padding:2px 0 8px">
      <div>
        <label class="fl">Payout Amount Received <span id="f_payout_pct_badge" style="margin-left:8px;font-size:10.5px;font-weight:600;text-transform:none;letter-spacing:0;font-family:'JetBrains Mono',monospace;padding:1px 7px;border-radius:4px;display:inline-flex;align-items:center;gap:3px;background:var(--bg4);border:1px solid var(--border);color:var(--text3)">—</span></label>
        <div class="prefix-wrap"><span class="prefix">$</span><input class="fi" id="f_payoutAmt" value="${esc(rec.payoutAmt)}" placeholder="e.g. 450.00" oninput="refreshSummary();updatePayoutPct()"></div>
      </div>
    </div>`, true) : ''}

    ${csec('physical','Physical Details',`
    <div class="field-grid" style="padding:2px 0 8px">
      <div><label class="fl">Height</label><input class="fi" id="f_height" value="${esc(rec.height)}" placeholder='5\'10"' oninput="fmtHeightInput(this);refreshSummary()" onkeydown="heightKeydown(event,this)" maxlength="6"></div>
      <div><label class="fl">Weight (lbs)</label><input class="fi" id="f_weight" value="${esc(rec.weight)}" placeholder="e.g. 175" oninput="refreshSummary()"></div>
      <div><label class="fl">Driver's License #</label><input class="fi" id="f_dl" value="${esc(rec.dl)}" placeholder="e.g. D123-456-78-910-0" oninput="refreshSummary()"></div>
      <div><label class="fl">DL State</label><input class="fi" id="f_dlstate" value="${esc(rec.dlstate)}" placeholder="e.g. FL" oninput="refreshSummary()"></div>
      <div><label class="fl">Social Security #</label><input class="fi" id="f_ssn" value="${esc(rec.ssn)}" placeholder="XXX-XX-XXXX" oninput="refreshSummary()"></div>
      <div><label class="fl">Smoker / Tobacco</label>
        <select class="fi" id="f_smoker" onchange="refreshSummary()">
          ${['','No','Yes','Former'].map(o => `<option ${o === (rec.smoker || '') ? 'selected' : ''}>${o}</option>`).join('')}
        </select></div>
    </div>`, false)}

    ${csec('notes','Notes',`
    <div style="padding:2px 0 8px">
      <div id="notes-list" style="margin-bottom:10px">${notesHtml || '<div style="color:var(--text3);font-size:13px;padding:6px 0">No notes yet.</div>'}</div>
      <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:4px">
        <textarea class="fi" id="f_new_note" rows="2" placeholder="Add a note…" style="flex:1;resize:vertical"></textarea>
        <button class="tb-btn primary" onclick="addNote()" style="height:38px;white-space:nowrap;flex-shrink:0">＋ Add Note</button>
      </div>
      <input type="hidden" id="f_notesList" value="${esc(JSON.stringify(notesList))}">
    </div>`, true)}

    ${sec !== 'callers' ? csec('followup','📅 Add Follow-Up',`
    <div style="padding:2px 0 8px">
      <div class="field-grid" style="margin-bottom:10px">
        <div class="field-full"><label class="fl">Follow-Up Task</label><input class="fi" id="f_fu_title" placeholder="e.g. Call back to discuss quote…"></div>
        <div><label class="fl">Due Date</label><input type="date" class="fi" id="f_fu_due"></div>
        <div><label class="fl">Priority</label>
          <select class="fi" id="f_fu_priority"><option>High</option><option selected>Medium</option><option>Low</option></select>
        </div>
      </div>
      <button class="tb-btn primary" onclick="addFollowUp('${rec.id}','${sec}')" style="font-size:12px;padding:5px 12px">📅 Save Follow-Up to Task List</button>
    </div>`, false) : ''}

    <div style="margin:18px 0 6px">
      <div class="summary-toggle" onclick="toggleAIPanel()" id="ai-toggle-row">
        <div style="display:flex;align-items:center;gap:8px;font-size:10.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#a78bfa">🤖 AI Assistant <span style="font-size:10px;color:var(--text3);font-weight:500;text-transform:none;letter-spacing:0">(click to expand)</span></div>
        <span class="summary-toggle-icon" id="ai-chevron">▾</span>
      </div>
      <div style="height:1px;background:var(--border);margin-top:6px"></div>
    </div>
    <div class="summary-collapsible collapsed" id="ai-panel">
      <div style="background:var(--bg3);border:1px solid rgba(167,139,250,.25);border-radius:var(--r);overflow:hidden;margin-bottom:10px">
        <div style="display:flex;border-bottom:1px solid var(--border)">
          ${['analysis','knockout','product'].map((t, i) =>
            `<button id="ai-tab-${t}" onclick="switchAITab('${t}')" style="flex:1;padding:9px 6px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;border:none;cursor:pointer;font-family:'Outfit',sans-serif;background:${i === 0 ? 'rgba(167,139,250,.12)' : 'var(--bg3)'};color:${i === 0 ? '#a78bfa' : 'var(--text3)'};border-bottom:${i === 0 ? '2px solid #a78bfa' : '2px solid transparent'}">${['🔍 Analysis','⚠️ Knockouts','🎯 Product Match'][i]}</button>`
          ).join('')}
        </div>
        <div style="padding:10px 14px 0">
          <button onclick="runAIAnalysis()" id="ai-run-btn" style="width:100%;padding:9px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;border-radius:var(--r-sm);font-size:13px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px">
            📋 Copy Analysis Prompt for Claude
          </button>
        </div>
        <div id="ai-tab-content-analysis" style="padding:12px 14px;display:block">
          <div id="ai-output-analysis" style="font-size:13px;color:var(--text3);line-height:1.7;min-height:60px">Click the button above to build a prompt from this caller's data, then paste it into Claude.</div>
        </div>
        <div id="ai-tab-content-knockout" style="padding:12px 14px;display:none"><div id="ai-output-knockout" style="font-size:13px;color:var(--text3);line-height:1.7;min-height:60px">Run analysis first.</div></div>
        <div id="ai-tab-content-product" style="padding:12px 14px;display:none"><div id="ai-output-product" style="font-size:13px;color:var(--text3);line-height:1.7;min-height:60px">Run analysis first.</div></div>
      </div>
    </div>

    <div style="margin:18px 0 10px">
      <div class="summary-toggle" onclick="toggleSummaryPanel()" id="summary-toggle-row">
        <div style="display:flex;align-items:center;gap:8px;font-size:10.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gold)">📋 Client Summary <span style="font-size:10px;color:var(--text3);font-weight:500;text-transform:none;letter-spacing:0">(click to expand)</span></div>
        <span class="summary-toggle-icon" id="summary-chevron">▾</span>
      </div>
      <div style="height:1px;background:var(--border);margin-top:6px"></div>
    </div>
    <div class="summary-collapsible collapsed" id="summary-panel">
      <div class="summary-box">
        <div class="summary-box-hdr">
          <div class="summary-box-title">📄 Copy-Ready Summary</div>
          <button class="copy-btn" id="copy-summary-btn" onclick="copySummary()">📋 Copy to Clipboard</button>
        </div>
        <div class="summary-text" id="summary-output">Fill in fields above to generate summary…</div>
      </div>
    </div>`;
}

function buildPipelineFields(rec) {
  const age = calcAge(rec.dob);
  return `
    <div class="section-head">Applicant</div>
    <div class="field-grid">
      <div><label class="fl">First Name</label><input class="fi" id="f_first" value="${rec.first || ''}"></div>
      <div><label class="fl">Last Name</label><input class="fi" id="f_last" value="${rec.last || ''}"></div>
      <div>
        <label class="fl">Date of Birth</label>
        <div class="dob-row">
          <input type="date" class="fi" id="f_dob" value="${rec.dob || ''}" oninput="updateModalAge()" style="flex:1">
          <div class="age-display" id="modal_age_display" style="${age !== null ? '' : 'display:none'}">
            <span class="age-label">AGE</span><span id="modal_age_num">${age !== null ? age : '—'}</span>
          </div>
        </div>
      </div>
      <div><label class="fl">Phone</label><input class="fi" id="f_phone" value="${rec.phone || ''}"></div>
      <div class="field-full"><label class="fl">Email</label><input class="fi" id="f_email" value="${rec.email || ''}"></div>
    </div>
    <div class="section-head">Policy Details</div>
    <div class="field-grid">
      <div><label class="fl">Coverage Amount</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" id="f_coverage" value="${rec.coverage || ''}"></div></div>
      <div><label class="fl">Monthly Premium</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" id="f_premium" value="${rec.premium || ''}"></div></div>
      <div><label class="fl">Carrier</label><input class="fi" id="f_carrier" value="${rec.carrier || ''}"></div>
      <div><label class="fl">Product Type</label>
        <select class="fi" id="f_product">
          ${['','Term 10','Term 20','Term 30','Whole Life','Universal Life','Final Expense','Guaranteed Issue','Indexed UL','Other'].map(o => `<option ${o === (rec.product || '') ? 'selected' : ''}>${o}</option>`).join('')}
        </select></div>
      <div><label class="fl">Stage</label>
        <select class="fi" id="f_stage">
          ${['Quoted','Submitted','Pending','Approved','Issued','Declined'].map(o => `<option ${o === (rec.stage || 'Submitted') ? 'selected' : ''}>${o}</option>`).join('')}
        </select></div>
      <div><label class="fl">Policy Number</label><input class="fi" id="f_policyNum" value="${rec.policyNum || ''}"></div>
      <div class="field-full"><label class="fl">Notes</label><textarea class="fi" id="f_notes">${rec.notes || ''}</textarea></div>
    </div>`;
}

function buildTaskFields(rec) {
  return `
    <div class="section-head">Task Details</div>
    <div class="field-grid">
      <div class="field-full"><label class="fl">Task / Follow-Up Description</label><input class="fi" id="f_title" value="${rec.title || ''}"></div>
      <div><label class="fl">Contact Name</label><input class="fi" id="f_contact" value="${rec.contact || ''}"></div>
      <div><label class="fl">Phone</label><input class="fi" id="f_phone" value="${rec.phone || ''}"></div>
      <div><label class="fl">Due Date</label><input type="date" class="fi" id="f_due" value="${rec.due || ''}"></div>
      <div><label class="fl">Priority</label>
        <select class="fi" id="f_priority">
          ${['High','Medium','Low'].map(o => `<option ${o === (rec.priority || 'Medium') ? 'selected' : ''}>${o}</option>`).join('')}
        </select></div>
      <div><label class="fl">Status</label>
        <select class="fi" id="f_status">
          ${['Open','In Progress','Done'].map(o => `<option ${o === (rec.status || 'Open') ? 'selected' : ''}>${o}</option>`).join('')}
        </select></div>
      <div class="field-full"><label class="fl">Notes</label><textarea class="fi" id="f_notes">${rec.notes || ''}</textarea></div>
    </div>`;
}

// ── SAVE / DELETE ─────────────────────────────────────────────────────────────
function saveRec(sec, id, isNew) {
  const data = ld(sec);
  let rec = isNew ? { id } : data.find(r => r.id === id);
  if (!rec) return;

  const keys = FIELD_KEYS[sec] || [];
  keys.forEach(k => {
    if (k === 'notesList') {
      const el = document.getElementById('f_notesList');
      if (el) { try { rec.notesList = JSON.parse(el.value); } catch { rec.notesList = []; } }
    } else if (k === 'policies') {
      const el = document.getElementById('f_policies');
      if (el) { try { rec.policies = JSON.parse(el.value); } catch { rec.policies = []; } }
    } else if (k === 'noInsurance') {
      // handled below
    } else {
      const el = document.getElementById('f_' + k);
      if (el) rec[k] = el.value;
    }
  });

  if (sec === 'prospects' || sec === 'clients' || sec === 'callers') {
    const street = rec.addrStreet || '', city = rec.addrCity || '', state = rec.addrState || '', zip = rec.addrZip || '';
    if (street || city || state || zip) rec.address = [street, city, state, zip].filter(Boolean).join(', ');
  }

  const epEl = document.getElementById('f_existingPolicy');
  if (epEl) { try { rec.existingPolicy = JSON.parse(epEl.value); } catch { rec.existingPolicy = {}; } }

  const niEl = document.getElementById('f_noInsurance');
  if (niEl) rec.noInsurance = niEl.checked;

  rec.updated = new Date().toISOString();
  if (isNew) { rec.created = new Date().toISOString(); data.push(rec); }
  else { const i = data.findIndex(r => r.id === id); if (i > -1) data[i] = rec; }
  sv(sec, data);

  // Cross-section sync (phone+name match)
  const syncFields = ['first','last','dob','phone','email','address','addrStreet','addrCity','addrState','addrZip',
    'coverage','premium','carrier','product','ssn','height','weight','dl','dlstate','gender','smoker',
    'notesList','notes','policies','noInsurance','reason','existingPolicy'];
  const syncKey = r => (r.phone || '').replace(/\D/g, '') + '|' + (r.first || '').toLowerCase() + '|' + (r.last || '').toLowerCase();
  const recKey  = syncKey(rec);
  const phoneDigits = (rec.phone || '').replace(/\D/g, '');

  if (phoneDigits.length >= 7 && !isNew) {
    const syncPatch = {};
    syncFields.forEach(f => { if (rec[f] !== undefined) syncPatch[f] = rec[f]; });

    if (sec !== 'callers') {
      const callers = ld('callers');
      let changed = false;
      callers.forEach((r, i) => { if (syncKey(r) === recKey) { callers[i] = Object.assign({}, callers[i], syncPatch); changed = true; } });
      if (changed) sv('callers', callers);
    }
    if (sec !== 'prospects') {
      const pros = ld('prospects');
      let changed = false;
      pros.forEach((r, i) => { if (syncKey(r) === recKey) { pros[i] = Object.assign({}, pros[i], syncPatch); changed = true; } });
      if (changed) sv('prospects', pros);
    }
    if (sec !== 'clients') {
      const cls = ld('clients');
      let changed = false;
      cls.forEach((r, i) => { if (syncKey(r) === recKey) { cls[i] = Object.assign({}, cls[i], syncPatch); changed = true; } });
      if (changed) sv('clients', cls);
    }
    const hist = ldCallHistory();
    let histChanged = false;
    hist.forEach((r, i) => {
      if (syncKey(r) === recKey) { hist[i] = Object.assign({}, hist[i], syncPatch, { histId: hist[i].histId || hist[i].id, id: hist[i].id }); histChanged = true; }
    });
    if (histChanged) svCallHistory(hist);
  }

  if (_historyEditId) {
    const hist = ldCallHistory();
    const hi = hist.findIndex(r => (r.histId || r.id) === _historyEditId || r.id === _historyEditId);
    if (hi > -1) { hist[hi] = Object.assign({}, hist[hi], rec, { histId: hist[hi].histId || hist[hi].id }); svCallHistory(hist); }
    _historyEditId = null;
  }

  closeM(); renderCurrent(); updateCounts();
  toast(`✓ ${SCHEMAS[sec]?.title || 'Record'} saved`);
}

function deleteRec(sec, id) {
  if (!confirm('Delete this record? This cannot be undone.')) return;
  sv(sec, ld(sec).filter(r => r.id !== id));
  closeM(); renderCurrent(); updateCounts();
  toast('🗑 Record deleted');
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
function updateModalAge() {
  const val = document.getElementById('f_dob')?.value;
  const age = calcAge(val);
  const disp = document.getElementById('modal_age_display');
  const num  = document.getElementById('modal_age_num');
  if (disp && num) {
    if (age !== null) { num.textContent = age; disp.style.display = 'inline-flex'; }
    else { disp.style.display = 'none'; }
  }
}

function toggleSection(id) {
  const body    = document.getElementById('cs_body_' + id);
  const chevron = document.getElementById('cs_chev_' + id);
  if (!body) return;
  const collapsed = body.classList.toggle('cs-collapsed');
  if (chevron) chevron.textContent = collapsed ? '▾' : '▴';
}

function toggleSummaryPanel() {
  const panel   = document.getElementById('summary-panel');
  const chevron = document.getElementById('summary-chevron');
  if (!panel) return;
  const collapsed = panel.classList.toggle('collapsed');
  if (chevron) chevron.textContent = collapsed ? '▾' : '▴';
  if (!collapsed) refreshSummary();
}

function toggleAIPanel() {
  const panel   = document.getElementById('ai-panel');
  const chevron = document.getElementById('ai-chevron');
  if (!panel) return;
  const collapsed = panel.classList.toggle('collapsed');
  if (chevron) chevron.style.transform = collapsed ? '' : 'rotate(180deg)';
}

function switchAITab(tab) {
  ['analysis','knockout','product'].forEach(t => {
    const btn     = document.getElementById('ai-tab-' + t);
    const content = document.getElementById('ai-tab-content-' + t);
    const active  = t === tab;
    if (btn) {
      btn.style.background   = active ? 'rgba(167,139,250,.12)' : 'var(--bg3)';
      btn.style.color        = active ? '#a78bfa' : 'var(--text3)';
      btn.style.borderBottom = active ? '2px solid #a78bfa' : '2px solid transparent';
    }
    if (content) content.style.display = active ? 'block' : 'none';
  });
}

function updateEP() {
  const ep = {
    premium:  (document.getElementById('ep_premium')?.value  || '').trim(),
    coverage: (document.getElementById('ep_coverage')?.value || '').trim(),
    carrier:  (document.getElementById('ep_carrier')?.value  || '').trim(),
    since:    (document.getElementById('ep_since')?.value    || '').trim(),
  };
  const hid = document.getElementById('f_existingPolicy');
  if (hid) hid.value = JSON.stringify(ep);

  const monthly = parseFloat((ep.premium || '').replace(/[^0-9.]/g, '')) || 0;
  const yr = parseInt(ep.since) || 0;
  const cashOutWrap = document.getElementById('ep_cashout_wrap');
  const cashOutEl   = document.getElementById('ep_cashout_val');
  if (cashOutEl && cashOutWrap) {
    const years = yr ? new Date().getFullYear() - yr : 0;
    if (monthly && yr && years >= 1) {
      cashOutEl.textContent   = '$' + (monthly * 12 * (years - 1) * 0.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      cashOutWrap.style.display = 'flex';
    } else {
      cashOutWrap.style.display = 'none';
    }
  }
  refreshSummary();
}

function toggleNoInsurance() {
  const cb        = document.getElementById('f_noInsurance');
  const container = document.getElementById('policies-container');
  const addBtn    = document.getElementById('add-policy-btn');
  const hidden    = document.getElementById('f_noInsurance_val');
  if (!cb) return;
  const checked = cb.checked;
  if (container) container.style.display = checked ? 'none' : 'block';
  if (addBtn)    addBtn.style.display    = checked ? 'none' : 'inline-flex';
  if (hidden)    hidden.value            = checked ? 'true' : '';
}

function toggleCommissionDate() {
  const sel  = document.getElementById('f_commission');
  const wrap = document.getElementById('commission_date_wrap');
  if (!sel || !wrap) return;
  wrap.style.display = sel.value === 'Yes' ? 'flex' : 'none';
  refreshSummary();
}

// ── NOTES ─────────────────────────────────────────────────────────────────────
function addNote() {
  const ta     = document.getElementById('f_new_note');
  const hidden = document.getElementById('f_notesList');
  if (!ta || !hidden) return;
  const text = ta.value.trim();
  if (!text) { toast('⚠️ Note is empty'); return; }
  let list = [];
  try { list = JSON.parse(hidden.value); } catch {}
  list.push({ id: uid(), text, ts: new Date().toISOString() });
  hidden.value = JSON.stringify(list);
  ta.value = '';
  _rerenderNotesList(list);
  refreshSummary();
  toast('📝 Note added');
  setTimeout(() => { _modalSnapshot = snapshotModal(); }, 20);
}

function deleteNote(idx) {
  const hidden = document.getElementById('f_notesList');
  if (!hidden) return;
  let list = [];
  try { list = JSON.parse(hidden.value); } catch {}
  list.splice(idx, 1);
  hidden.value = JSON.stringify(list);
  _rerenderNotesList(list);
  refreshSummary();
  setTimeout(() => { _modalSnapshot = snapshotModal(); }, 20);
}

function _rerenderNotesList(list) {
  const container = document.getElementById('notes-list');
  if (!container) return;
  container.innerHTML = list.length
    ? list.map((n, i) => `
      <div id="note_${i}" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:8px;position:relative">
        <div style="font-size:10.5px;color:var(--text3);margin-bottom:5px;font-family:'JetBrains Mono',monospace">${new Date(n.ts).toLocaleString()}</div>
        <div style="font-size:13.5px;white-space:pre-wrap;line-height:1.5">${n.text.replace(/</g, '&lt;')}</div>
        <button onclick="deleteNote(${i})" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 5px;border-radius:4px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">✕</button>
      </div>`).join('')
    : '<div style="color:var(--text3);font-size:13px;padding:6px 0">No notes yet.</div>';
}

// ── MULTI-POLICY MANAGEMENT ───────────────────────────────────────────────────
function getPolicies() {
  const el = document.getElementById('f_policies');
  if (!el) return [];
  try { return JSON.parse(el.value); } catch { return []; }
}
function setPolicies(pols) {
  const el = document.getElementById('f_policies');
  if (el) el.value = JSON.stringify(pols);
}
function updatePolicyField(idx, key, val) {
  const pols = getPolicies();
  if (pols[idx]) { pols[idx][key] = val; setPolicies(pols); }
}
function rerenderPolicies() {
  const pols      = getPolicies();
  const container = document.getElementById('policies-container');
  if (!container) return;
  const isClient  = _modalSec === 'clients';
  container.innerHTML = pols.map((p, i) => {
    const yr    = (parseFloat((p.premium || '').toString().replace(/[^0-9.]/g, '')) || 0) * 12;
    const yrBadge = yr > 0 ? `<span style="margin-left:4px;font-size:10px;font-weight:600;color:var(--text3);font-family:'JetBrains Mono',monospace;background:var(--bg4);border:1px solid var(--border);padding:1px 6px;border-radius:4px">($${yr.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}/yr)</span>` : '';
    const hasCB = p.chargeback === 'Yes';
    return `<div style="background:var(--bg3);border:1px solid ${hasCB ? 'var(--red)' : 'var(--border)'};border-radius:var(--r);padding:14px;margin-bottom:10px;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${hasCB ? 'var(--red)' : 'var(--gold)'}">${hasCB ? '⚠️ CHARGEBACK — ' : ''}Policy ${i + 1}</div>
        ${_modalSec === 'prospects' ? `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;font-weight:600"><input type="checkbox" ${p.sold ? 'checked' : ''} onchange="updatePolicyField(${i},'sold',this.checked);rerenderPolicies()" style="accent-color:var(--green);width:14px;height:14px"><span style="color:${p.sold ? 'var(--green)' : 'var(--text3)'}">Sold</span></label>` : ''}
        ${pols.length > 1 ? `<button onclick="removePolicy(${i})" style="background:none;border:1px solid var(--border2);color:var(--text3);font-size:11px;padding:3px 8px;border-radius:5px;cursor:pointer;font-family:'Outfit',sans-serif" onmouseover="this.style.color='var(--red)';this.style.borderColor='var(--red)'" onmouseout="this.style.color='var(--text3)';this.style.borderColor='var(--border2)'">✕ Remove</button>` : ''}
      </div>
      <div class="field-grid">
        <div><label class="fl">Coverage</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" value="${esc(p.coverage)}" oninput="updatePolicyField(${i},'coverage',this.value)"></div></div>
        <div><label class="fl">Monthly Premium ${yrBadge}</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" id="pol_prem_${i}" value="${esc(p.premium)}" oninput="updatePolicyField(${i},'premium',this.value);updateYrBadge(${i})"></div></div>
        <div><label class="fl">Annual Premium</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" value="${esc(p.annualPremium || '')}" oninput="updatePolicyField(${i},'annualPremium',this.value)"></div></div>
        <div><label class="fl">Carrier</label><input class="fi" value="${esc(p.carrier)}" oninput="updatePolicyField(${i},'carrier',this.value)"></div>
        <div><label class="fl">Product Type</label><select class="fi" onchange="updatePolicyField(${i},'product',this.value)">${['','Term 10','Term 20','Term 30','Whole Life','Universal Life','Final Expense','Guaranteed Issue','Indexed UL','Variable Life','Other'].map(o => `<option ${o === (p.product || '') ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        <div><label class="fl">Policy Number</label><input class="fi" value="${esc(p.policyNum)}" oninput="updatePolicyField(${i},'policyNum',this.value)"></div>
        <div><label class="fl">Beneficiary</label><input class="fi" value="${esc(p.beneficiary)}" oninput="updatePolicyField(${i},'beneficiary',this.value)"></div>
        <div><label class="fl">📅 Sold Date</label><input type="date" class="fi" value="${p.soldDate || ''}" oninput="updatePolicyField(${i},'soldDate',this.value)"></div>
        <div><label class="fl">📅 Effective Date</label><input type="date" class="fi" value="${p.effectiveDate || ''}" oninput="updatePolicyField(${i},'effectiveDate',this.value)"></div>
        ${isClient ? `
        <div><label class="fl">Chargeback Status</label><select class="fi" onchange="updatePolicyField(${i},'chargeback',this.value);rerenderPolicies()">${['','No','Yes'].map(o => `<option ${o === (p.chargeback || '') ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        <div><label class="fl">Chargeback Amount</label><div class="prefix-wrap"><span class="prefix">$</span><input class="fi" value="${esc(p.chargebackAmt)}" oninput="updatePolicyField(${i},'chargebackAmt',this.value)" ${hasCB ? '' : 'style="opacity:.5"'} ${hasCB ? '' : 'readonly'}></div></div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function addPolicy() {
  const pols = getPolicies();
  pols.push({ id: uid(), coverage: '', premium: '', annualPremium: '', carrier: '', product: '', policyNum: '', beneficiary: '', soldDate: '', effectiveDate: '', chargeback: '', chargebackAmt: '' });
  setPolicies(pols);
  rerenderPolicies();
  setTimeout(() => {
    const cards = document.querySelectorAll('#policies-container > div');
    if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

function removePolicy(idx) {
  const pols = getPolicies();
  if (pols.length <= 1) { toast('⚠️ At least one policy required'); return; }
  pols.splice(idx, 1);
  setPolicies(pols);
  rerenderPolicies();
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
function gv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function refreshSummary() {
  const out   = document.getElementById('summary-output');
  if (!out) return;
  const panel = document.getElementById('summary-panel');
  if (panel && panel.classList.contains('collapsed')) return;

  const gvs = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const first   = gvs('f_first'), last  = gvs('f_last');
  const dob     = gvs('f_dob'),   age   = calcAge(dob);
  const phone   = gvs('f_phone'), email = gvs('f_email');
  const address = [gvs('f_addrStreet'), gvs('f_addrCity'), gvs('f_addrState'), gvs('f_addrZip')].filter(Boolean).join(', ') || gvs('f_address');
  const gender  = gvs('f_gender'), height = gvs('f_height'), weight = gvs('f_weight');
  const dl      = gvs('f_dl'), dlstate = gvs('f_dlstate'), ssn = gvs('f_ssn'), smoker = gvs('f_smoker');
  const reason  = gvs('f_reason');

  let policies = [];
  try { policies = JSON.parse(document.getElementById('f_policies')?.value || '[]'); } catch {}
  let noteLines = [];
  try { noteLines = JSON.parse(document.getElementById('f_notesList')?.value || '[]').map(n => n.text).filter(Boolean); } catch {}

  const lines = [];
  if (first || last) lines.push([first, last].filter(Boolean).join(' ') + (gender ? ' (' + gender + ')' : ''));
  if (reason)  lines.push('Reason: ' + reason);
  if (dob)     lines.push('DOB: ' + fmtDOB(dob) + (age !== null ? '  Age ' + age : ''));
  if (phone)   lines.push('Phone: ' + phone);
  if (email)   lines.push('Email: ' + email);
  if (address) lines.push('Address: ' + address);

  policies.forEach(p => {
    const hasData = p.coverage || p.premium || p.carrier || p.product || p.policyNum || p.beneficiary;
    if (!hasData) return;
    if (p.premium)     lines.push('Premium: ' + fmtPrem(p.premium) + (p.premium ? '  (' + fmtMoney((parseFloat(p.premium) || 0) * 12) + '/yr)' : ''));
    if (p.coverage)    lines.push('Coverage: ' + fmtMoney(p.coverage));
    if (p.carrier)     lines.push('Carrier: ' + p.carrier);
    if (p.product)     lines.push('Product: ' + p.product);
    if (p.policyNum)   lines.push('Policy #: ' + p.policyNum);
    if (p.beneficiary) lines.push('Beneficiary: ' + p.beneficiary);
    if (p.chargeback === 'Yes') lines.push('⚠️ Chargeback: $' + (p.chargebackAmt || '—'));
  });

  const physical = [height ? 'Height: ' + height : '', weight ? 'Weight: ' + weight + ' lbs' : '', smoker ? 'Smoker/Tobacco: ' + smoker : '', (dl || dlstate) ? 'DL: ' + [dl, dlstate].filter(Boolean).join(' ') : '', ssn ? 'SSN: ' + ssn : ''].filter(Boolean);
  if (physical.length) { lines.push(''); physical.forEach(l => lines.push(l)); }
  if (noteLines.length) { lines.push(''); noteLines.forEach(n => lines.push(n)); }

  out.textContent = lines.length ? lines.join('\n') : 'Fill in fields above to generate summary…';
  const btn = document.getElementById('copy-summary-btn');
  if (btn && btn.classList.contains('copied')) { btn.classList.remove('copied'); btn.textContent = '📋 Copy to Clipboard'; }
}

function copySummary() {
  const out = document.getElementById('summary-output');
  if (!out || out.textContent.startsWith('Fill in')) return;
  const text = out.textContent;
  const btn  = document.getElementById('copy-summary-btn');
  const confirm = () => { if (btn) { btn.textContent = '✓ Copied!'; btn.classList.add('copied'); setTimeout(() => { if (btn) { btn.textContent = '📋 Copy to Clipboard'; btn.classList.remove('copied'); } }, 2500); } };
  navigator.clipboard.writeText(text).then(confirm).catch(() => { try { fallbackCopy(text); confirm(); } catch {} });
}

// ── AI ANALYSIS ───────────────────────────────────────────────────────────────
function buildCallerProfile() {
  const gvs = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const first = gvs('f_first'), last = gvs('f_last'), dob = gvs('f_dob'), age = calcAge(dob);
  const smoker = gvs('f_smoker'), height = gvs('f_height'), weight = gvs('f_weight'), reason = gvs('f_reason');
  const ep = (() => { try { return JSON.parse(document.getElementById('f_existingPolicy')?.value || '{}'); } catch { return {}; } })();
  const notesList = (() => { try { return JSON.parse(document.getElementById('f_notesList')?.value || '[]'); } catch { return []; } })();
  const notes   = notesList.map(n => n.text).join(' | ');
  const cashOut = (ep.premium && ep.since) ? (parseFloat((ep.premium || '0').replace(/[^0-9.]/g, '')) * 12 * (Math.max(0, new Date().getFullYear() - parseInt(ep.since || '0') - 1)) * 0.2).toFixed(2) : null;
  return `CALLER PROFILE:\nName: ${first} ${last}\nAge: ${age !== null ? age : (dob || 'Unknown')}\nSmoker/Tobacco: ${smoker || 'Unknown'}\nHeight/Weight: ${height || 'Unknown'} / ${weight || 'Unknown'} lbs\nReason Calling: ${reason || 'Not specified'}\nNotes: ${notes || 'None'}\n\nEXISTING POLICY:\nMonthly Premium: $${ep.premium || 'Unknown'}\nCoverage Amount: $${ep.coverage || 'Unknown'}\nCurrent Carrier: ${ep.carrier || 'Unknown'}\nPolicy Since: ${ep.since || 'Unknown'}${cashOut ? '\nPotential Cash-Out: $' + cashOut : ''}`.trim();
}

async function runAIAnalysis() {
  const btn = document.getElementById('ai-run-btn');
  if (btn) { btn.textContent = '⏳ Building prompt…'; btn.disabled = true; btn.style.opacity = '.7'; }
  const panel = document.getElementById('ai-panel');
  if (panel && panel.classList.contains('collapsed')) toggleAIPanel();

  const profile = buildCallerProfile();
  const prompt  = `I have a caller in my PolicyPro CRM. Please analyze them and give me:\n\n1. CALL ANALYSIS — Key situation, cash-out opportunity if applicable, and 2-3 talking points.\n\n2. KNOCKOUT CHECK — For each product type (Final Expense, Term Life, Whole Life, Guaranteed Issue), indicate ✅ Likely qualifies, ⚠️ May qualify with conditions, or ❌ Likely knocked out.\n\n3. PRODUCT RECOMMENDATION — Top 2-3 specific products with carrier name, product type, and why it fits this caller.\n\n${profile}`;

  try {
    await navigator.clipboard.writeText(prompt);
    const el = document.getElementById('ai-output-analysis');
    if (el) el.innerHTML = `<div style="color:var(--green);font-weight:700;margin-bottom:8px">✅ Prompt copied to clipboard!</div><div style="color:var(--text2);font-size:12.5px;line-height:1.7"><strong>Next step:</strong><br>1. Open Claude (claude.ai)<br>2. Paste the prompt (<strong>Ctrl+V</strong>)<br>3. Claude will analyze and recommend<br><br><span style="color:var(--text3);font-size:11.5px">Includes caller details, existing policy info, and cash-out value.</span></div>`;
    toast('📋 Prompt copied — paste into Claude!');
  } catch {
    const el = document.getElementById('ai-output-analysis');
    if (el) el.innerHTML = `<div style="color:var(--gold);font-weight:700;margin-bottom:8px">📋 Copy this prompt:</div><div style="background:var(--bg4);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:11.5px;white-space:pre-wrap;color:var(--text2);max-height:200px;overflow-y:auto;cursor:text;user-select:all">${prompt.replace(/</g,'&lt;')}</div>`;
    toast('📋 Copy the prompt from the panel');
  } finally {
    if (btn) { btn.textContent = '📋 Copy Analysis Prompt for Claude'; btn.disabled = false; btn.style.opacity = '1'; }
  }
}

// ── FOLLOW-UP FROM MODAL ──────────────────────────────────────────────────────
function addFollowUp(recId, sec) {
  const title = document.getElementById('f_fu_title')?.value?.trim();
  if (!title) { toast('⚠️ Enter a follow-up description'); return; }
  const first    = document.getElementById('f_first')?.value?.trim()    || '';
  const last     = document.getElementById('f_last')?.value?.trim()     || '';
  const phone    = document.getElementById('f_phone')?.value?.trim()    || '';
  const due      = document.getElementById('f_fu_due')?.value           || '';
  const priority = document.getElementById('f_fu_priority')?.value      || 'Medium';

  const task = { id: uid(), title, contact: [first, last].filter(Boolean).join(' '), phone, due, priority, status: 'Open', notes: '', created: new Date().toISOString() };
  const tasks = ld('tasks'); tasks.push(task); sv('tasks', tasks);
  updateCounts();
  const titleEl = document.getElementById('f_fu_title'), dueEl = document.getElementById('f_fu_due');
  if (titleEl) titleEl.value = '';
  if (dueEl)   dueEl.value   = '';
  toast('📅 Follow-up added to task list');
}

// ── MOVE RECORD ───────────────────────────────────────────────────────────────
function moveRecord(fromSec, toSec, id) {
  const fromLabel = fromSec === 'prospects' ? 'Prospect' : 'Active Client';
  const toLabel   = toSec   === 'prospects' ? 'Prospect' : 'Active Client';
  const fromData  = ld(fromSec);
  const rec       = fromData.find(r => r.id === id);
  if (!rec) return;
  if (!confirm(`Move ${rec.first} ${rec.last} from ${fromLabel}s to ${toLabel}s?`)) return;

  const keys = FIELD_KEYS[fromSec] || [];
  keys.forEach(k => {
    if (k === 'notesList') { const el = document.getElementById('f_notesList'); if (el) { try { rec.notesList = JSON.parse(el.value); } catch {} } }
    else { const el = document.getElementById('f_' + k); if (el) rec[k] = el.value; }
  });
  const street = rec.addrStreet || '', city = rec.addrCity || '', state = rec.addrState || '', zip = rec.addrZip || '';
  if (street || city || state || zip) rec.address = [street, city, state, zip].filter(Boolean).join(', ');

  if (toSec === 'clients' && ['Prospect','New','Hot','Warm','Cold'].includes(rec.status)) rec.status = 'Client';
  if (toSec === 'prospects' && ['Client','In Force','Pending','Lapsed'].includes(rec.status)) rec.status = 'Prospect';
  if (toSec === 'clients' && !rec.soldDate) rec.soldDate = new Date().toISOString().slice(0, 10);

  sv(fromSec, fromData.filter(r => r.id !== id));
  rec.id = uid(); rec.movedFrom = fromSec; rec.updated = new Date().toISOString();
  const toData = ld(toSec); toData.push(rec); sv(toSec, toData);

  closeM(); go(toSec); updateCounts();
  toast(`✓ ${rec.first} ${rec.last} moved to ${toLabel}s`);
}

// ── HISTORY DETAIL ────────────────────────────────────────────────────────────
function openHistoryDetail(histId) {
  const live = ld('callers').find(r => r.id === histId);
  if (live) { showModal('callers', live, false); return; }

  const hist    = ldCallHistory();
  const histRec = hist.find(r => (r.histId || r.id) === histId || r.id === histId);
  if (!histRec) { toast('⚠️ Record not found'); return; }

  const matchKey = r => (r.phone || '').replace(/\D/g, '') + '|' + (r.first || '').toLowerCase() + '|' + (r.last || '').toLowerCase();
  const histKey  = matchKey(histRec);

  const foundProspect = ld('prospects').find(r => matchKey(r) === histKey);
  if (foundProspect) { showModal('prospects', foundProspect, false); toast('📋 Showing current Prospect record'); return; }

  const foundClient = ld('clients').find(r => matchKey(r) === histKey);
  if (foundClient) { showModal('clients', foundClient, false); toast('🛡 Showing current Active Client record'); return; }

  _historyEditId = histId;
  showModal('callers', histRec, false);
}

function transferFromHistory(histId, dest) {
  const hist = ldCallHistory();
  const rec  = hist.find(r => (r.histId || r.id) === histId);
  if (!rec) { toast('⚠️ Record not found in history'); return; }
  const label = dest === 'prospects' ? 'Prospect' : 'Active Client';
  if (!confirm(`Add ${rec.first} ${rec.last} to ${label}s? Their history entry stays in the call log.`)) return;
  const newRec = Object.assign({}, rec, { id: uid(), status: dest === 'clients' ? 'Client' : 'Prospect', soldDate: dest === 'clients' ? new Date().toISOString().slice(0, 10) : (rec.soldDate || ''), transferredFrom: 'callhistory', updated: new Date().toISOString() });
  delete newRec.histId;
  const destData = ld(dest); destData.push(newRec); sv(dest, destData);
  updateCounts();
  toast(`✓ ${rec.first} ${rec.last} added to ${label}s`);
}

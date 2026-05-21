// ── RENDER FUNCTIONS — v2 (call history fixes) ───────────────────────────────

function renderCurrent() {
  const q = document.getElementById('search-inp').value.toLowerCase();
  if      (section === 'prospects')   renderPeople('prospects', q);
  else if (section === 'clients')     renderPeople('clients', q);
  else if (section === 'callers')     renderPeople('callers', q);
  else if (section === 'callhistory') renderCallHistory();
  else if (section === 'chargebacks') renderChargebacks();
  else if (section === 'tasks')       renderTasks(q);
  else if (section === 'dashboard')   renderDashboard();
}

// ── PEOPLE (Prospects / Clients / Callers) ────────────────────────────────────
function renderPeople(sec, q = '') {
  try {
    let data = ld(sec);
    if (sec === 'callers') {
      const today = new Date().toISOString().slice(0, 10);
      data = data.filter(r => (r.created || '').slice(0, 10) === today);
    }
    if (q) data = data.filter(r => JSON.stringify(r).toLowerCase().includes(q));

    const statusSets = {
      prospects: ['all', 'Hot', 'Warm', 'Cold', 'New'],
      clients:   ['all', 'In Force', 'Lapsed', 'Pending'],
      callers:   ['all', 'New', 'Hot', 'Warm']
    };
    const statuses = statusSets[sec] || ['all'];

    let html = '';

    if (sec === 'callers') {
      html += buildCallerQuickForm();
    }

    if (filterOn) {
      html += `<div class="filter-bar"><span style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.5px">FILTER:</span>
        ${statuses.map(s => `<div class="f-chip ${filterStatus === s ? 'on' : ''}" onclick="filterStatus='${s}';renderCurrent()">${s.toUpperCase()}</div>`).join('')}
      </div>`;
    }

    if (filterOn && filterStatus !== 'all') data = data.filter(r => r.status === filterStatus);

    if (!data.length) {
      document.getElementById('content').innerHTML = html + `<div class="empty"><div class="empty-icon">${sec === 'callers' ? '📞' : '👤'}</div><div class="empty-title">No records found</div><div class="empty-sub">Use the button above to add one</div></div>`;
      if (sec === 'callers') setTimeout(() => { restoreDraft(); initQfResizer(); }, 20);
      return;
    }

    if (view === 'grid') {
      html += buildGridView(sec, data);
    } else if (view === 'list') {
      html += buildListView(sec, data);
    } else {
      html += buildKanbanView(sec, data);
    }

    document.getElementById('content').innerHTML = html;
    if (sec === 'callers') setTimeout(() => { restoreDraft(); initQfResizer(); }, 20);

  } catch (err) {
    console.error('renderPeople error:', err);
    document.getElementById('content').innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Render error</div><div class="empty-sub">${err.message}</div></div>`;
  }
}

function buildGridView(sec, data) {
  const allProspects = sec === 'callers' ? ld('prospects') : [];
  const allClients   = sec === 'callers' ? ld('clients')   : [];
  const matchKey = r => (r.phone || '').replace(/\D/g, '') + '|' + (r.first || '').toLowerCase() + '|' + (r.last || '').toLowerCase();

  let html = `<div style="overflow-x:auto"><table class="g-table"><thead><tr>
    <th>Name</th><th>DOB / Age</th><th>Phone</th>
    <th>Coverage</th><th>Premium/mo</th><th>Carrier</th><th>Product</th>
    ${sec === 'callers' ? '<th>Converted</th><th>Transfer To</th>' : '<th>Commission</th>'}
  </tr></thead><tbody>`;

  data.forEach(r => {
    const age = calcAge(r.dob);
    const firstPol  = Array.isArray(r.policies) && r.policies.length ? r.policies[0] : null;
    const ep = r.existingPolicy || {};
    const dispCoverage = sec === 'callers' ? (ep.coverage || r.coverage || '') : (r.coverage || firstPol?.coverage || '');
    const dispPremium  = sec === 'callers' ? (ep.premium  || r.premium  || '') : (r.premium  || firstPol?.premium  || '');
    const dispCarrier  = sec === 'callers' ? (ep.carrier  || r.carrier  || '') : (r.carrier  || firstPol?.carrier  || '');
    const dispProduct  = r.product || firstPol?.product || '';

    let callerCells = '';
    if (sec === 'callers') {
      const key = matchKey(r);
      const asClient   = allClients.find(c => matchKey(c) === key);
      const asProspect = !asClient && allProspects.find(p => matchKey(p) === key);
      const convertedCell = asClient
        ? `<td onclick="event.stopPropagation()"><span class="tag t-inforce" style="cursor:pointer" onclick="showModal('clients',${JSON.stringify(asClient).replace(/"/g,'&quot;')},false)">🛡 Client</span></td>`
        : asProspect
          ? `<td onclick="event.stopPropagation()"><span class="tag t-prospect" style="cursor:pointer" onclick="showModal('prospects',${JSON.stringify(asProspect).replace(/"/g,'&quot;')},false)">👥 Prospect</span></td>`
          : `<td style="color:var(--text3);font-size:12px">—</td>`;
      callerCells = `${convertedCell}<td onclick="event.stopPropagation()">
        <div style="display:flex;gap:5px">
          <button onclick="transferCaller('${r.id}','prospects')" style="padding:4px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--bg3);color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;white-space:nowrap;transition:all .15s" onmouseover="this.style.background='var(--gold-soft)'" onmouseout="this.style.background='var(--bg3)'">→ Prospect</button>
          <button onclick="transferCaller('${r.id}','clients')" style="padding:4px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--bg3);color:var(--green);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;white-space:nowrap;transition:all .15s" onmouseover="this.style.background='var(--green-soft)'" onmouseout="this.style.background='var(--bg3)'">→ Client</button>
        </div>
      </td>`;
    }

    html += `<tr onclick="openDetail('${sec}','${r.id}')">
      <td style="font-weight:600">${esc(r.first)} ${esc(r.last)}</td>
      <td>
        <div style="font-size:12.5px;color:var(--text2)">${fmtDOB(r.dob)}</div>
        ${age !== null ? `<div class="age-badge" style="margin-top:3px">Age ${age}</div>` : ''}
      </td>
      <td style="color:var(--text2);font-size:12.5px">${esc(r.phone) || '—'}</td>
      <td><span class="mono" style="color:var(--gold);font-size:13px">${r.noInsurance ? '—' : fmtMoney(dispCoverage)}</span></td>
      <td><span class="mono" style="color:var(--green);font-size:13px">${r.noInsurance ? '—' : fmtPrem(dispPremium)}</span></td>
      <td style="font-size:12.5px;${r.noInsurance ? 'color:var(--red);font-weight:700' : 'color:var(--text2);max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'}">${r.noInsurance ? 'No Known Coverage' : (esc(dispCarrier) || '—')}</td>
      <td style="color:var(--text2);font-size:12.5px">${esc(dispProduct) || '—'}</td>
      ${sec === 'callers' ? callerCells : `<td>${commissionTag(r)}</td>`}
    </tr>`;
  });

  html += '</tbody></table></div>';
  return html;
}

function buildListView(sec, data) {
  const allProspects = sec === 'callers' ? ld('prospects') : [];
  const allClients   = sec === 'callers' ? ld('clients')   : [];
  const matchKey = r => (r.phone || '').replace(/\D/g, '') + '|' + (r.first || '').toLowerCase() + '|' + (r.last || '').toLowerCase();

  let html = '<div class="list-wrap">';
  data.forEach(r => {
    const age = calcAge(r.dob);
    const firstPol = Array.isArray(r.policies) && r.policies.length ? r.policies[0] : null;
    const ep2 = r.existingPolicy || {};
    const dispCoverage = sec === 'callers' ? (ep2.coverage || r.coverage || '') : (r.coverage || firstPol?.coverage || '');
    const dispPremium  = sec === 'callers' ? (ep2.premium  || r.premium  || '') : (r.premium  || firstPol?.premium  || '');
    const dispCarrier  = sec === 'callers' ? (ep2.carrier  || r.carrier  || '') : (r.carrier  || firstPol?.carrier  || '');

    let callerBadge = '';
    if (sec === 'callers') {
      const key = matchKey(r);
      const ac = allClients.find(c => matchKey(c) === key);
      const ap = !ac && allProspects.find(p => matchKey(p) === key);
      callerBadge = ac ? `<span class="tag t-inforce">🛡 Client</span>` : ap ? `<span class="tag t-prospect">👥 Prospect</span>` : sTag(r.status || 'New');
    }

    html += `<div class="list-row" onclick="openDetail('${sec}','${r.id}')">
      <div class="lr-name">${esc(r.first)} ${esc(r.last)}</div>
      <div class="lr-co" style="${r.noInsurance ? 'color:var(--red);font-weight:700' : ''}">${r.noInsurance ? 'No Known Coverage' : (esc(dispCarrier) || 'No carrier')}</div>
      ${age !== null ? `<div class="lr-age">Age ${age}</div>` : '<div style="width:52px"></div>'}
      <div class="lr-cov">${fmtMoney(dispCoverage)}</div>
      <div class="lr-prem">${fmtPrem(dispPremium)}</div>
      ${sec === 'callers' ? callerBadge : commissionTag(r)}
      <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
        ${sec === 'callers' ? `
          <button onclick="transferCaller('${r.id}','prospects')" style="padding:4px 9px;border-radius:5px;border:1px solid var(--border2);background:var(--bg3);color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s" onmouseover="this.style.background='var(--gold-soft)'" onmouseout="this.style.background='var(--bg3)'">→ Prospect</button>
          <button onclick="transferCaller('${r.id}','clients')" style="padding:4px 9px;border-radius:5px;border:1px solid var(--border2);background:var(--bg3);color:var(--green);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s" onmouseover="this.style.background='var(--green-soft)'" onmouseout="this.style.background='var(--bg3)'">→ Client</button>
        ` : ''}
        <div class="icon-btn" title="Delete" onclick="event.stopPropagation();deleteRec('${sec}','${r.id}')">🗑</div>
      </div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function buildKanbanView(sec, data) {
  const cols = {
    prospects: { stages: ['New','Hot','Warm','Cold'], colors: { New:'#3b82f6', Hot:'#f43f5e', Warm:'#fb923c', Cold:'#4a5880' } },
    clients:   { stages: ['Pending','In Force','Lapsed'], colors: { Pending:'#fb923c', 'In Force':'#10b981', Lapsed:'#f43f5e' } },
    callers:   { stages: ['New','Hot','Warm','Cold'], colors: { New:'#3b82f6', Hot:'#f43f5e', Warm:'#fb923c', Cold:'#4a5880' } },
  };
  const { stages, colors } = cols[sec] || cols.prospects;

  let html = '<div class="kb-board">';
  stages.forEach(st => {
    const rows = data.filter(r => (r.status || 'New') === st);
    html += `<div class="kb-col">
      <div class="kb-col-hdr"><div class="kb-dot" style="background:${colors[st]}"></div>
        <div class="kb-col-name">${st}</div><div class="kb-col-cnt">${rows.length}</div>
      </div><div class="kb-body">`;

    rows.forEach(r => {
      const age = calcAge(r.dob);
      const firstPol = Array.isArray(r.policies) && r.policies.length ? r.policies[0] : null;
      const dispCoverage = r.coverage || firstPol?.coverage || '';
      const dispPremium  = r.premium  || firstPol?.premium  || '';
      const dispCarrier  = r.carrier  || firstPol?.carrier  || '';
      html += `<div class="kb-card" onclick="openDetail('${sec}','${r.id}')">
        <div class="kc-name">${esc(r.first)} ${esc(r.last)}</div>
        <div class="kc-dob"><span style="font-size:11.5px;color:var(--text3)">DOB: ${fmtDOB(r.dob)}</span>${age !== null ? `<span class="age-badge">Age ${age}</span>` : ''}</div>
        <div class="kc-vals">
          <div class="kc-val-item"><div class="kc-val-lbl">Coverage</div><div class="kc-val-num">${fmtMoney(dispCoverage)}</div></div>
          <div class="kc-val-item"><div class="kc-val-lbl">Premium</div><div class="kc-val-num" style="color:var(--green)">${fmtPrem(dispPremium)}</div></div>
        </div>
        <div class="kc-foot"><span style="font-size:11.5px;color:var(--text3)">${esc(dispCarrier) || 'No carrier'}</span></div>
        ${sec === 'callers' ? `<div style="display:flex;gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)" onclick="event.stopPropagation()">
          <button onclick="transferCaller('${r.id}','prospects')" style="flex:1;padding:5px 4px;border-radius:5px;border:1px solid var(--border2);background:var(--bg4);color:var(--gold);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">→ Prospect</button>
          <button onclick="transferCaller('${r.id}','clients')" style="flex:1;padding:5px 4px;border-radius:5px;border:1px solid var(--border2);background:var(--bg4);color:var(--green);font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif">→ Client</button>
        </div>` : ''}
      </div>`;
    });

    html += `</div><div class="kb-add" onclick="openNew()">＋ Add record</div></div>`;
  });
  html += '</div>';
  return html;
}

// ── TASKS ─────────────────────────────────────────────────────────────────────
function renderTasks(q = '') {
  let data = ld('tasks');
  if (q) data = data.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const open = data.filter(t => t.status === 'Open').length;
  const done = data.filter(t => t.status === 'Done').length;
  let html = `<div class="stats-row">
    <div class="stat-card gold"><div class="stat-label">Open Follow-Ups</div><div class="stat-val gold">${open}</div></div>
    <div class="stat-card green"><div class="stat-label">Completed</div><div class="stat-val green">${done}</div></div>
    <div class="stat-card blue"><div class="stat-label">Total</div><div class="stat-val blue">${data.length}</div></div>
  </div>`;
  if (!data.length) {
    document.getElementById('content').innerHTML = html + `<div class="empty"><div class="empty-icon">✅</div><div class="empty-title">No follow-ups</div></div>`;
    return;
  }
  html += `<div style="overflow-x:auto"><table class="g-table"><thead><tr>
    <th style="width:32px"></th><th>Task</th><th>Contact</th><th>Phone</th>
    <th>Due Date</th><th>Priority</th><th>Status</th><th></th>
  </tr></thead><tbody>`;
  data.forEach(r => {
    const od = r.due && new Date(r.due) < new Date() && r.status === 'Open';
    html += `<tr onclick="openDetail('tasks','${r.id}')" style="${r.status === 'Done' ? 'opacity:.5' : ''}">
      <td onclick="event.stopPropagation()">
        <input type="checkbox" ${r.status === 'Done' ? 'checked' : ''} onchange="toggleTask('${r.id}',this.checked)" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)">
      </td>
      <td style="font-weight:600;${r.status === 'Done' ? 'text-decoration:line-through' : ''}">${esc(r.title)}</td>
      <td style="color:var(--text2)">${esc(r.contact) || '—'}</td>
      <td style="color:var(--text2);font-size:12.5px">${esc(r.phone) || '—'}</td>
      <td style="color:${od ? 'var(--red)' : 'var(--text2)'};font-size:12.5px">${esc(r.due) || '—'}${od ? ' ⚠️' : ''}</td>
      <td>${sTag(r.priority || 'Medium')}</td>
      <td>${sTag(r.status || 'Open')}</td>
      <td onclick="event.stopPropagation()"><div class="icon-btn" onclick="deleteRec('tasks','${r.id}')">🗑</div></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  document.getElementById('content').innerHTML = html;
}

function toggleTask(id, done) {
  const data = ld('tasks');
  const t = data.find(t => t.id === id);
  if (t) { t.status = done ? 'Done' : 'Open'; sv('tasks', data); updateCounts(); renderCurrent(); }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const pros = ld('prospects'), cls = ld('clients'), pip = ld('pipeline'), tasks = ld('tasks'), callers = ld('callers');
  const now = new Date();

  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const q = Math.floor(now.getMonth() / 3);
  const qStart = new Date(now.getFullYear(), q * 3, 1);
  const qEnd   = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
  const yStart = new Date(now.getFullYear(), 0, 1);
  const yEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  function cleanNum(v) { return parseFloat((v || '').toString().replace(/[^0-9.]/g, '')) || 0; }
  function polAnn(p) { const ann = cleanNum(p.annualPremium); return ann > 0 ? ann : cleanNum(p.premium) * 12; }
  function annPrem(r) {
    const pols = Array.isArray(r.policies) ? r.policies : [{ premium: r.premium || 0 }];
    return pols.reduce((a, p) => a + cleanNum(p.premium) * 12, 0);
  }
  function soldDates(r) {
    const pols = Array.isArray(r.policies) ? r.policies.filter(p => p.soldDate) : [];
    if (pols.length) return pols.map(p => new Date(p.soldDate + 'T12:00:00'));
    if (r.soldDate)  return [new Date(r.soldDate + 'T12:00:00')];
    return [new Date(r.created || r.updated || '')];
  }
  function inRange(r, s, e) { return soldDates(r).some(d => d >= s && d <= e); }
  function annPremInRange(r, s, e) {
    if (!Array.isArray(r.policies) || !r.policies.length) return inRange(r, s, e) ? cleanNum(r.premium) * 12 : 0;
    return r.policies.reduce((a, p) => {
      const d = p.soldDate ? new Date(p.soldDate + 'T12:00:00') : (r.soldDate ? new Date(r.soldDate + 'T12:00:00') : new Date(r.created || ''));
      return a + (d >= s && d <= e ? polAnn(p) : 0);
    }, 0);
  }

  const weekPrem    = cls.reduce((a, r) => a + annPremInRange(r, mon, sun), 0);
  const monthPrem   = cls.reduce((a, r) => a + annPremInRange(r, mStart, mEnd), 0);
  const quarterPrem = cls.reduce((a, r) => a + annPremInRange(r, qStart, qEnd), 0);
  const yearPrem    = cls.reduce((a, r) => a + annPremInRange(r, yStart, yEnd), 0);
  const allTimePrem = cls.reduce((a, r) => a + annPrem(r), 0);
  const totalPayout = cls.reduce((a, r) => a + (parseFloat(r.payoutAmt) || 0), 0);

  const soldAnnPrem = cls.reduce((a, r) => {
    const pols = Array.isArray(r.policies) ? r.policies.filter(p => p.soldDate) : [];
    if (pols.length) return a + pols.reduce((s, p) => polAnn(p) + s, 0);
    if (r.soldDate) return a + cleanNum(r.premium) * 12;
    return a;
  }, 0);

  const hot    = pros.filter(r => r.status === 'Hot').length;
  const openFU = tasks.filter(t => t.status === 'Open').length;

  const qLabel    = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'][q];
  const weekLabel = `${mon.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

  const weekBars = [];
  for (let i = 0; i <= 4; i++) {
    const ws = new Date(mon); ws.setDate(mon.getDate() + i * 7);
    const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
    const val   = cls.reduce((a, r) => a + annPremInRange(r, ws, we), 0);
    const label = ws.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' – ' + we.toLocaleDateString([], { month: 'short', day: 'numeric' });
    weekBars.push({ label, val, isCurrent: i === 0 });
  }
  const maxBar = Math.max(...weekBars.map(b => b.val), 1);

  function policyBreakdown(s, e) {
    const rows = [];
    cls.forEach(r => {
      const pols = Array.isArray(r.policies) && r.policies.length
        ? r.policies
        : [{ premium: r.premium || 0, annualPremium: r.annualPremium || '', soldDate: r.soldDate || r.created, carrier: r.carrier, product: r.product }];
      pols.forEach(p => {
        const d = p.soldDate ? new Date(p.soldDate + 'T12:00:00') : (r.soldDate ? new Date(r.soldDate + 'T12:00:00') : new Date(r.created || ''));
        const ann = polAnn(p);
        if (d >= s && d <= e && ann > 0) rows.push({ name: `${r.first} ${r.last}`, carrier: p.carrier || r.carrier || '—', product: p.product || r.product || '—', annual: ann, soldDate: p.soldDate || r.soldDate || r.created, clientId: r.id });
      });
    });
    rows.sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate));
    return rows;
  }

  const weekRows  = policyBreakdown(mon, sun);
  const monthRows = policyBreakdown(mStart, mEnd);

  function breakdownHTML(rows, panelId) {
    if (!rows.length) return `<div id="${panelId}" style="display:none"></div>`;
    return `<div id="${panelId}" style="display:none;margin-top:10px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px">
      ${rows.map(row => `
        <div onclick="openDetail('clients','${row.clientId}')" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;gap:8px" onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
          <div style="min-width:0"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(row.name)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.5)">${esc(row.carrier)}${row.product ? ' · ' + esc(row.product) : ''}</div></div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700">$${row.annual.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            <div style="font-size:10.5px;color:rgba(255,255,255,.45)">${row.soldDate ? new Date(row.soldDate + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}</div>
          </div>
        </div>`).join('')}
    </div>`;
  }

  function expandBtn(panelId, count) {
    if (!count) return '';
    return `<div onclick="(()=>{const p=document.getElementById('${panelId}');const b=document.getElementById('${panelId}_btn');const open=p.style.display==='none';p.style.display=open?'block':'none';b.textContent=open?'▴ Hide':'▾ ${count} polic${count===1?'y':'ies'}'})()" id="${panelId}_btn" style="margin-top:6px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;user-select:none;text-align:center;padding:2px 0" onmouseover="this.style.color='rgba(255,255,255,.85)'" onmouseout="this.style.color='rgba(255,255,255,.5)'">▾ ${count} polic${count===1?'y':'ies'}</div>`;
  }

  document.getElementById('content').innerHTML = `
  <div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">📈 Premium Production (Annualized — 12 × Monthly)</div>
  <div class="stats-row" style="margin-bottom:12px">
    <div class="stat-card gold" style="flex:1">
      <div class="stat-label">This Week</div>
      <div class="stat-val gold" style="font-size:20px">$${weekPrem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">${weekLabel}</div>
      ${expandBtn('dash_week_detail', weekRows.length)}
      ${breakdownHTML(weekRows, 'dash_week_detail')}
    </div>
    <div class="stat-card green" style="flex:1">
      <div class="stat-label">This Month</div>
      <div class="stat-val green" style="font-size:20px">$${monthPrem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">${now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
      ${expandBtn('dash_month_detail', monthRows.length)}
      ${breakdownHTML(monthRows, 'dash_month_detail')}
    </div>
    <div class="stat-card blue" style="flex:1">
      <div class="stat-label">This Quarter</div>
      <div class="stat-val blue" style="font-size:20px">$${quarterPrem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">${qLabel}</div>
    </div>
    <div class="stat-card" style="flex:1;border-color:var(--purple)">
      <div class="stat-label" style="color:var(--text3)">This Year</div>
      <div class="stat-val" style="font-size:20px;color:var(--purple)">$${yearPrem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">${now.getFullYear()}</div>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-card gold"><div class="stat-label">Ann. Premium Sold</div><div class="stat-val gold">$${soldAnnPrem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div class="stat-sub">Active clients (sold policies)</div></div>
    <div class="stat-card blue"><div class="stat-label">Total Carrier Payouts</div><div class="stat-val blue">$${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div class="stat-sub">Logged payout amounts</div></div>
  </div>
  <div class="dash-grid" style="margin-bottom:16px">
    <div class="dash-card">
      <div class="dash-card-title">📅 Weekly Production</div>
      ${weekBars.map(b => {
        const pct = Math.round(b.val / maxBar * 100);
        return `<div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
            <span style="color:${b.isCurrent ? 'var(--gold)' : 'var(--text2)'};font-weight:${b.isCurrent ? 700 : 400}">${b.label}${b.isCurrent ? ' ← This week' : ''}</span>
            <span style="font-family:'JetBrains Mono',monospace;color:${b.isCurrent ? 'var(--gold)' : 'var(--text3)'};font-size:11px">$${b.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style="height:7px;background:var(--bg4);border-radius:4px;overflow:hidden">
            <div style="height:100%;border-radius:4px;background:${b.isCurrent ? 'var(--gold)' : 'var(--blue)'};width:${pct}%;transition:width .4s ease"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="dash-card">
      <div class="dash-card-title">📊 At a Glance</div>
      ${[
        ['👥','Prospects', pros.length],
        ['🛡','Active Clients', cls.length],
        ['📞','Callers Logged', callers.length],
        ['⏳','Open Follow-Ups', openFU],
        ['💰','All-Time Ann. Premium', '$' + allTimePrem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ].map(([ic, lb, vl]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span style="color:var(--text2)">${ic} ${lb}</span>
          <span style="font-weight:700;font-family:'JetBrains Mono',monospace">${vl}</span>
        </div>`).join('')}
    </div>
  </div>`;
}

// ── CHARGEBACKS ───────────────────────────────────────────────────────────────
function renderChargebacks() {
  const cls = ld('clients');
  const rows = [];
  cls.forEach(r => {
    (Array.isArray(r.policies) ? r.policies : []).forEach((p, pi) => {
      if (p.chargeback === 'Yes') rows.push({ client: r, policy: p, policyIdx: pi });
    });
  });

  const totalCB = rows.reduce((a, row) => a + (parseFloat(row.policy.chargebackAmt) || 0), 0);
  let html = `<div class="stats-row">
    <div class="stat-card red">
      <div class="stat-label">Active Chargebacks</div>
      <div class="stat-val red">${rows.length}</div>
      <div class="stat-sub">Across ${[...new Set(rows.map(r => r.client.id))].length} client(s)</div>
    </div>
    <div class="stat-card gold">
      <div class="stat-label">Total Chargeback Amount</div>
      <div class="stat-val gold">$${totalCB.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="stat-sub">Sum of all chargebacks</div>
    </div>
  </div>`;

  if (!rows.length) {
    html += `<div class="empty"><div class="empty-icon">✅</div><div class="empty-title">No chargebacks</div><div class="empty-sub">No active clients have a chargeback recorded</div></div>`;
    document.getElementById('content').innerHTML = html;
    return;
  }

  html += `<div style="overflow-x:auto"><table class="g-table"><thead><tr>
    <th>Client</th><th>DOB / Age</th><th>Phone</th>
    <th>Policy #</th><th>Carrier</th><th>Product</th>
    <th>Coverage</th><th>Premium/mo</th><th>Chargeback Amt</th><th>Sold Date</th>
  </tr></thead><tbody>`;

  rows.forEach(({ client: r, policy: p }) => {
    const age = calcAge(r.dob);
    const hasCBamt = parseFloat(p.chargebackAmt) > 0;
    html += `<tr onclick="openDetail('clients','${r.id}')" style="cursor:pointer">
      <td><div style="font-weight:600">${esc(r.first)} ${esc(r.last)}</div><div style="font-size:11.5px;color:var(--text2)">${esc(r.phone) || '—'}</div></td>
      <td><div style="font-size:12.5px;color:var(--text2)">${fmtDOB(r.dob)}</div>${age !== null ? `<div class="age-badge" style="margin-top:2px">Age ${age}</div>` : ''}</td>
      <td style="color:var(--text2);font-size:12.5px">${esc(r.phone) || '—'}</td>
      <td style="color:var(--text3);font-family:'JetBrains Mono',monospace;font-size:12px">${esc(p.policyNum) || '—'}</td>
      <td style="color:var(--text2);font-size:12.5px">${esc(p.carrier) || '—'}</td>
      <td style="color:var(--text2);font-size:12.5px">${esc(p.product) || '—'}</td>
      <td style="color:var(--gold);font-family:'JetBrains Mono',monospace">${fmtMoney(p.coverage)}</td>
      <td style="color:var(--green);font-family:'JetBrains Mono',monospace">${fmtPrem(p.premium)}</td>
      <td><span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--red)">${hasCBamt ? '$' + parseFloat(p.chargebackAmt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span></td>
      <td style="color:var(--text2);font-size:12.5px">${p.soldDate ? new Date(p.soldDate + 'T12:00:00').toLocaleDateString() : '—'}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  document.getElementById('content').innerHTML = html;
}

// ── CALL HISTORY ─────────────────────────────────────────────────────────────
let chDateFrom = '', chDateTo = '', chSearch = '', chInitialized = false, chActivePill = 'today';

function _chFilter(hist) {
  return hist.filter(r => {
    if (chSearch) {
      const sch = chSearch.toLowerCase();
      const nameMatch  = (`${r.first||''} ${r.last||''}`).toLowerCase().includes(sch);
      const phoneMatch = (r.phone||'').replace(/\D/g,'').includes(chSearch.replace(/\D/g,''));
      const anyMatch   = JSON.stringify(r).toLowerCase().includes(sch);
      return nameMatch || phoneMatch || anyMatch;
    }
    const d = isoToDate(r.created);
    if (chDateFrom && d < chDateFrom) return false;
    if (chDateTo   && d > chDateTo)   return false;
    return true;
  });
}

function _chSetPill(pill) {
  chActivePill = pill;
  chSearch = '';
  const today = new Date().toISOString().slice(0, 10);
  if (pill === 'today') {
    chDateFrom = chDateTo = today;
  } else if (pill === 'week') {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    chDateFrom = mon.toISOString().slice(0, 10);
    chDateTo = today;
  } else if (pill === 'month') {
    const now = new Date();
    chDateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    chDateTo = today;
  } else if (pill === 'all') {
    chDateFrom = chDateTo = '';
  }
  renderCallHistory();
}

function _chBuildDateStrip(hist) {
  // Build call count map for last 60 days
  const countMap = {};
  hist.forEach(r => {
    const d = isoToDate(r.created);
    if (d) countMap[d] = (countMap[d] || 0) + 1;
  });
  const WD = ['S','M','T','W','T','F','S'];
  const today = new Date().toISOString().slice(0, 10);
  const days = [];
  for (let i = 59; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const iso = dt.toISOString().slice(0, 10);
    days.push({ iso, wd: WD[dt.getDay()], num: dt.getDate(), count: countMap[iso] || 0 });
  }
  const isActive = d => chActivePill === 'custom'
    ? d === chDateFrom && d === chDateTo
    : (chActivePill === 'today' && d === today)
      ? true
      : false;

  return days.map(({ iso, wd, num, count }) => {
    const dotSize = count === 0 ? 4 : count < 3 ? 5 : count < 6 ? 7 : 9;
    const active  = chDateFrom === iso && chDateTo === iso && !chSearch;
    const cls     = ['ch-day', count > 0 ? 'has-calls' : '', iso === today ? 'today' : '', active ? 'active' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" onclick="chDateFrom='${iso}';chDateTo='${iso}';chSearch='';chActivePill='custom';renderCallHistory()" title="${iso}${count ? ` — ${count} call${count>1?'s':''}` : ''}">
      <span class="ch-day-wd">${wd}</span>
      <span class="ch-day-num">${num}</span>
      <div class="ch-day-dot" style="width:${dotSize}px;height:${dotSize}px"></div>
    </div>`;
  }).join('');
}

function renderCallHistory() {
  const hist = ldCallHistory();
  const c = document.getElementById('content');
  const today = new Date().toISOString().slice(0, 10);

  if (!chInitialized) { chDateFrom = today; chDateTo = today; chActivePill = 'today'; chInitialized = true; }

  const wasSearchFocused = document.activeElement && document.activeElement.id === 'ch-search';
  const filtered = _chFilter(hist);

  const groups = {};
  filtered.forEach(r => {
    const d = isoToDate(r.created);
    if (!groups[d]) groups[d] = [];
    groups[d].push(r);
  });
  const sortedDates = Object.keys(groups).sort().reverse();

  const pills = ['today','week','month','all','custom'];
  const pillLabels = { today:'Today', week:'Week', month:'Month', all:'All', custom:'Custom' };

  let html = `
  <div class="ch-toolbar">
    <div class="ch-search-wrap">
      <span class="ch-search-icon">🔍</span>
      <input id="ch-search" value="${esc(chSearch)}" placeholder="Name, phone, carrier…"
        oninput="chSearch=this.value;chActivePill=chSearch?'custom':'${chActivePill}';renderCallHistory()">
      <button class="ch-search-clear${chSearch ? ' visible' : ''}" onclick="chSearch='';renderCallHistory()" title="Clear">✕</button>
    </div>
    <span class="ch-count-badge">${filtered.length} call${filtered.length !== 1 ? 's' : ''}</span>
    <div class="ch-pills">
      ${pills.map(p => `<button class="ch-pill${chActivePill===p?' active':''}" onclick="_chSetPill('${p}')">${pillLabels[p]}</button>`).join('')}
    </div>
    <button class="ch-export-btn" onclick="exportCallRange()" title="Export range as CSV">📤</button>
  </div>
  <div class="ch-custom-range${chActivePill==='custom'?' open':''}">
    <span class="cr-label">From</span>
    <input type="date" value="${chDateFrom}" onchange="chDateFrom=this.value;renderCallHistory()">
    <span class="cr-label">To</span>
    <input type="date" value="${chDateTo}" onchange="chDateTo=this.value;renderCallHistory()">
  </div>
  <div class="ch-stat-bar">
    <div class="ch-stat"><div class="ch-stat-stripe" style="background:var(--gold)"></div><div class="ch-stat-body"><div class="ch-stat-label">Calls in Range</div><div class="ch-stat-val" style="color:var(--gold)">${filtered.length}</div></div></div>
    <div class="ch-stat"><div class="ch-stat-stripe" style="background:var(--blue)"></div><div class="ch-stat-body"><div class="ch-stat-label">Days Shown</div><div class="ch-stat-val" style="color:var(--blue)">${sortedDates.length}</div></div></div>
    <div class="ch-stat"><div class="ch-stat-stripe" style="background:var(--text3)"></div><div class="ch-stat-body"><div class="ch-stat-label">Total Logged</div><div class="ch-stat-val" style="color:var(--text2)">${hist.length}</div></div></div>
  </div>`;

  if (hist.length > 0) {
    html += `<div class="ch-date-strip-wrap">
      <div class="ch-strip-label">Jump to Date</div>
      <div class="ch-date-strip" id="ch-strip">${_chBuildDateStrip(hist)}</div>
    </div>`;
  }

  if (!sortedDates.length) {
    html += `<div class="empty"><div class="empty-icon">📅</div><div class="empty-title">No calls found</div><div class="empty-sub">Try a different filter or clear search</div></div>`;
    c.innerHTML = html;
    _chRestoreFocus(wasSearchFocused);
    _chScrollStripToToday();
    return;
  }

  const allProspects = ld('prospects');
  const allClients   = ld('clients');
  const matchKey = r => (r.phone||'').replace(/\D/g,'') + '|' + (r.first||'').toLowerCase() + '|' + (r.last||'').toLowerCase();

  sortedDates.forEach(date => {
    const dayRecs = groups[date];
    html += `<div class="ch-group">
      <div class="ch-date-hdr">
        <span class="ch-date-hdr-label">${fmtDateLabel(date)}</span>
        <span class="ch-date-hdr-badge">${dayRecs.length} call${dayRecs.length!==1?'s':''}</span>
        <div class="ch-date-hdr-line"></div>
        <button class="ch-day-export" onclick="exportSingleDay('${date}')">📤 Export Day</button>
      </div>
      <div class="ch-cards">`;

    dayRecs.forEach(r => {
      const timeStr   = r.created ? new Date(r.created).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—';
      const rid       = r.histId || r.id;
      const key       = matchKey(r);
      const asClient  = allClients.find(cl => matchKey(cl) === key);
      const asProsp   = !asClient && allProspects.find(p => matchKey(p) === key);
      const converted = asClient
        ? `<span class="tag t-inforce" style="cursor:pointer;white-space:nowrap" onclick="event.stopPropagation();showModal('clients',${JSON.stringify(asClient).replace(/"/g,'&quot;')},false)">🛡 Client</span>`
        : asProsp
          ? `<span class="tag t-prospect" style="cursor:pointer;white-space:nowrap" onclick="event.stopPropagation();showModal('prospects',${JSON.stringify(asProsp).replace(/"/g,'&quot;')},false)">👥 Prospect</span>`
          : `<span style="color:var(--text3);font-size:12px">—</span>`;

      html += `<div class="ch-call-card" onclick="openHistoryDetail('${rid}')">
        <span class="ch-call-time">${timeStr}</span>
        <div class="ch-sep"></div>
        <div class="ch-call-person">
          <div class="ch-call-name">${esc(r.first)} ${esc(r.last)}</div>
          <div class="ch-call-phone">${esc(r.phone)||'—'}</div>
        </div>
        <div class="ch-call-mid">
          <div class="ch-call-carrier">${esc(r.carrier)||'—'}</div>
          <div class="ch-call-amounts">
            ${r.coverage ? `<span class="ch-call-cov">${fmtMoney(r.coverage)}</span>` : ''}
            ${r.premium  ? `<span class="ch-call-prem">${fmtPrem(r.premium)}</span>` : ''}
          </div>
        </div>
        <div class="ch-call-right" onclick="event.stopPropagation()">
          ${sTag(r.status||'New')}
          ${converted}
          <div class="ch-call-actions" style="display:flex;gap:4px">
            <button class="ch-act-btn to-p" onclick="transferFromHistory('${rid}','prospects')">→ Prospect</button>
            <button class="ch-act-btn to-c" onclick="transferFromHistory('${rid}','clients')">→ Client</button>
          </div>
        </div>
      </div>`;
    });

    html += `</div></div>`;
  });

  c.innerHTML = html;
  _chRestoreFocus(wasSearchFocused);
  _chScrollStripToToday();
}

function _chRestoreFocus(was) {
  if (!was) return;
  const si = document.getElementById('ch-search');
  if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
}

function _chScrollStripToToday() {
  const strip = document.getElementById('ch-strip');
  if (!strip) return;
  // Scroll to the end (today is last) smoothly
  requestAnimationFrame(() => { strip.scrollLeft = strip.scrollWidth; });
}

// Keep legacy helpers for backward compat
function setChWeek()     { _chSetPill('week'); }
function setChLastWeek() {
  const now = new Date();
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);
  chDateFrom = lastMon.toISOString().slice(0, 10);
  chDateTo   = lastSun.toISOString().slice(0, 10);
  chActivePill = 'custom';
  chSearch = '';
  renderCallHistory();
}

function exportCallRange() {
  const hist = ldCallHistory().filter(r => {
    const d = isoToDate(r.created);
    if (chDateFrom && d < chDateFrom) return false;
    if (chDateTo   && d > chDateTo)   return false;
    return true;
  });
  if (!hist.length) { toast('No calls in selected range'); return; }
  downloadCallExport(hist, `call-history-${chDateFrom || 'all'}-to-${chDateTo || 'all'}`);
}

function exportSingleDay(date) {
  const hist = ldCallHistory().filter(r => isoToDate(r.created) === date);
  if (!hist.length) { toast('No calls on that day'); return; }
  downloadCallExport(hist, `call-log-${date}`);
}

function downloadCallExport(records, filename) {
  const cols = ['Date','Time','First','Last','DOB','Age','Phone','Email','Address','Coverage','Premium','Carrier','Beneficiary','SSN','Height','Weight','DL','Status','Notes'];
  const rows = records.map(r => {
    const dt = r.created ? new Date(r.created) : null;
    return [
      dt ? dt.toLocaleDateString() : '',
      dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      r.first || '', r.last || '', fmtDOB(r.dob), calcAge(r.dob) ?? '',
      r.phone || '', r.email || '', r.address || '',
      r.coverage || '', r.premium || '', r.carrier || '',
      r.beneficiary || '', r.ssn || '', r.height || '', r.weight || '', r.dl || '',
      r.status || '', r.notes || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [cols.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename + '.csv'; a.click();
  toast(`📤 Exported ${records.length} call${records.length !== 1 ? 's' : ''} as CSV`);
}

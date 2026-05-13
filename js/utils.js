// ── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob), n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function fmtDOB(dob) {
  if (!dob) return '—';
  const [y, m, d] = dob.split('-');
  return `${m}/${d}/${y}`;
}

function ageTag(dob) {
  const a = calcAge(dob);
  if (a === null) return '';
  return `<span class="age-badge">Age ${a}</span>`;
}

function fmtMoney(v) {
  if (!v && v !== 0) return '—';
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPrem(v) {
  if (!v && v !== 0) return '—';
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/mo';
}

function initials(n) {
  return (n || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(n) {
  const cols = ['#3b82f6','#8b5cf6','#10b981','#f0b429','#f43f5e','#22d3ee','#fb923c','#a78bfa'];
  let h = 0;
  for (let c of (n || '?')) h = (h * 31 + c.charCodeAt(0)) % cols.length;
  return cols[h];
}

function commissionTag(r) {
  const hasChargeback = (Array.isArray(r.policies) ? r.policies : []).some(p => p.chargeback === 'Yes');
  if (hasChargeback) return `<span class="tag t-lapsed">⚠️ Chargeback</span>`;
  if (r.commission === 'Yes') {
    const dateStr = r.payoutDate
      ? new Date(r.payoutDate + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    return `<span class="tag t-inforce">✓ Received${dateStr ? ' · ' + dateStr : ''}</span>`;
  }
  return `<span class="tag t-pending">Unpaid</span>`;
}

function sTag(s) {
  const map = {
    Hot:'hot', Warm:'warm', Cold:'cold', New:'new', Active:'active',
    Prospect:'prospect', Client:'active',
    Lapsed:'lapsed', 'In Force':'inforce', Pending:'pending', Declined:'declined',
    Open:'new', Done:'active', High:'hot', Medium:'warm', Low:'cold',
    Submitted:'pending', Approved:'active', Issued:'active', Quoted:'cold'
  };
  return `<span class="tag t-${map[s] || 'cold'}">${s || '—'}</span>`;
}

function esc(v) {
  return (v || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function isoToDate(ts) {
  return ts ? ts.slice(0, 10) : '';
}

// ── PHONE AUTO-FORMAT ─────────────────────────────────────────────────────────
function fmtPhoneInput(el) {
  const digits = el.value.replace(/\D/g, '').slice(0, 10);
  if (!digits) { el.value = ''; return; }
  let fmt = '';
  if (digits.length <= 3)      fmt = '(' + digits;
  else if (digits.length <= 6) fmt = '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
  else                         fmt = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  el.value = fmt;
}

function fmtPhoneInputById(id) {
  const el = document.getElementById(id);
  if (el) fmtPhoneInput(el);
}

// ── HEIGHT AUTO-FORMAT ────────────────────────────────────────────────────────
let _heightDeleting = false;

function heightKeydown(e, el) {
  if (e.key === 'Backspace' || e.key === 'Delete') {
    _heightDeleting = true;
    const digits = el.value.replace(/\D/g, '');
    if (digits.length > 0) {
      e.preventDefault();
      const newDigits = digits.slice(0, -1);
      if (!newDigits)            el.value = '';
      else if (newDigits.length === 1) el.value = newDigits + "'";
      else el.value = newDigits[0] + "'" + newDigits.slice(1) + '"';
      if (typeof refreshQuickSummary === 'function') refreshQuickSummary();
    }
  } else {
    _heightDeleting = false;
  }
}

function fmtHeightInput(el) {
  if (_heightDeleting) return;
  const raw    = el.value;
  const digits = raw.replace(/\D/g, '');
  if (!digits)           { el.value = ''; return; }
  if (digits.length === 1) { el.value = digits + "'"; return; }
  const feet   = digits[0];
  const inches = digits.slice(1, 3);
  el.value = `${feet}'${inches}"`;
}

// ── CLIPBOARD HELPERS ─────────────────────────────────────────────────────────
function copyField(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const val = el.value.trim();
  if (!val) { flashBtn(btn, '✗ Empty', false); return; }
  doClipboard(val, btn);
}

function copyFieldFmt(id, btn, fmt) {
  const el = document.getElementById(id);
  if (!el) return;
  let val = el.value.trim();
  if (!val) { flashBtn(btn, '✗ Empty', false); return; }
  if (fmt === 'dob') {
    const age = calcAge(val);
    val = fmtDOB(val) + (age !== null ? ' (Age ' + age + ')' : '');
  }
  doClipboard(val, btn);
}

function doClipboard(text, btn) {
  const ok   = () => flashBtn(btn, '✓', true);
  const fail = () => flashBtn(btn, '✗', false);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(ok).catch(() => {
      try { fallbackCopy(text); ok(); } catch { fail(); }
    });
  } else {
    try { fallbackCopy(text); ok(); } catch { fail(); }
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function flashBtn(btn, label, success) {
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = label;
  btn.classList.toggle('ok', success);
  setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('ok'); }, 1800);
}

// ── PAYOUT PCT & YEARLY BADGE ─────────────────────────────────────────────────
function updateYearlyBadge() {
  const badge = document.getElementById('f_yearly_badge');
  if (!badge) return;
  const mo = parseFloat(document.getElementById('f_premium')?.value || 0);
  if (mo > 0) {
    badge.textContent = '= $' + (mo * 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/yr';
  } else {
    badge.textContent = '';
  }
  updatePayoutPct();
}

function updatePayoutPct() {
  const badge = document.getElementById('f_payout_pct_badge');
  if (!badge) return;
  let pols = [];
  try { pols = JSON.parse(document.getElementById('f_policies')?.value || '[]'); } catch {}
  const yr = pols.reduce((a, p) => a + (parseFloat(p.premium) || 0) * 12, 0);
  const po = parseFloat(document.getElementById('f_payoutAmt')?.value || 0);
  if (yr > 0 && po > 0) {
    const pct = Math.round(po / yr * 100);
    const hi = pct >= 100;
    badge.textContent  = pct + '% of annual';
    badge.style.background = hi ? 'var(--green-soft)' : 'var(--gold-soft)';
    badge.style.border     = '1px solid ' + (hi ? 'var(--green)' : 'var(--gold)');
    badge.style.color      = hi ? 'var(--green)' : 'var(--gold)';
  } else {
    badge.textContent      = '—';
    badge.style.background = 'var(--bg4)';
    badge.style.border     = '1px solid var(--border)';
    badge.style.color      = 'var(--text3)';
  }
}

function updateYrBadge(i) {
  const input = document.querySelector(`[data-pol="${i}"][data-key="premium"]`);
  if (!input) return;
  const yr = (parseFloat(input.value.replace(/[^0-9.]/g, '')) || 0) * 12;
  const badge = document.getElementById('pol_yr_badge_' + i);
  if (badge) badge.textContent = yr > 0 ? '($' + yr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/yr)' : '';
}

// ── DATE LABEL FORMATTER ──────────────────────────────────────────────────────
function fmtDateLabel(d) {
  if (!d) return '—';
  const dt   = new Date(d + 'T12:00:00');
  const today = new Date().toISOString().slice(0, 10);
  const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === today) return 'Today — ' + dt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  if (d === yest)  return 'Yesterday — ' + dt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  return dt.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── CALLER CASH-OUT CALCULATOR ────────────────────────────────────────────────
function updateQfCashOut() {
  const premium = (document.getElementById('qf_premium')?.value || '').replace(/[^0-9.]/g, '');
  const since   = (document.getElementById('qf_policy_since')?.value || '').trim();
  const wrap    = document.getElementById('qf_cashout_wrap');
  const valEl   = document.getElementById('qf_cashout_val');
  if (!wrap || !valEl) return;
  const monthly = parseFloat(premium) || 0;
  const yr      = parseInt(since) || 0;
  const years   = yr ? new Date().getFullYear() - yr : 0;
  if (monthly && years >= 1) {
    const cashOut = monthly * 12 * (years - 1) * 0.2;
    valEl.textContent = '$' + cashOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    wrap.style.display = 'flex';
  } else {
    wrap.style.display = 'none';
  }
}

// ── POLICY SINCE (compact + standard) ────────────────────────────────────────
function updatePolicySince() {
  const val = document.getElementById('cqf_policy_since')?.value;
  const el  = document.getElementById('cqf_duration_val');
  if (!el) return;
  if (!val || val.length < 4) { el.textContent = '—'; return; }
  const year = parseInt(val, 10);
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) { el.textContent = '—'; return; }
  const years = new Date().getFullYear() - year;
  el.textContent = years === 0 ? 'This year' : years === 1 ? '1 yr' : years + ' yrs';
}

function updatePolicySinceStandard() {
  const val  = document.getElementById('qf_policy_since')?.value;
  const wrap = document.getElementById('qf_policy_duration_standard');
  const el   = document.getElementById('qf_duration_val_standard');
  if (!wrap || !el) return;
  if (!val || val.length < 4) { wrap.style.display = 'none'; return; }
  const year = parseInt(val, 10);
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) { wrap.style.display = 'none'; return; }
  const years = new Date().getFullYear() - year;
  el.textContent = years === 0 ? 'This year' : years === 1 ? '1 yr' : years + ' yrs';
  wrap.style.display = 'flex';
  const cEl = document.getElementById('cqf_policy_since');
  if (cEl) { cEl.value = val; updatePolicySince(); }
}

function updatePayoutPctCompact() {
  // Compact mode doesn't show payout pct badge — no-op
}

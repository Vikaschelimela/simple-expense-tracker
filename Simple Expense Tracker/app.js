/**
 * app.js — SpendWise Expense Tracker
 * Security: SHA-256 hashed passwords, secure logout, session isolation
 * UX: Toast notifications, lift animations, shake feedback, slide-in rows
 */

/* ══════════════════════════════════════════════
   SECURITY — PASSWORD HASHING (Web Crypto API)
══════════════════════════════════════════════ */
const SALT = 'sw_spendwise_2025_salt';

async function hashPassword(password, username = '') {
  const raw = `${SALT}:${username.toLowerCase()}:${password}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ══════════════════════════════════════════════
   BOOTSTRAP — seed demo account & guard
══════════════════════════════════════════════ */
(async function bootstrap() {
  await migratePasswords();
  const session = getSession();
  if (session) {
    showApp(session.username);
  } else {
    showAuth();
  }
})();

async function migratePasswords() {
  let users = getUsers();
  let changed = false;

  for (const u of users) {
    if (u.password && !u.passwordHash) {
      u.passwordHash = await hashPassword(u.password, u.username);
      delete u.password;
      changed = true;
    }
  }

  if (!users.find(u => u.username === 'admin')) {
    const hash = await hashPassword('admin123', 'admin');
    users.push({ username: 'admin', passwordHash: hash });
    changed = true;
  }

  if (changed) saveUsers(users);
}

/* ══════════════════════════════════════════════
   SESSION HELPERS
══════════════════════════════════════════════ */
function getSession() {
  try { return JSON.parse(sessionStorage.getItem('sw_session') || 'null'); }
  catch { return null; }
}
function setSession(username) {
  sessionStorage.setItem('sw_session', JSON.stringify({ username, ts: Date.now() }));
}
function clearSession() {
  sessionStorage.removeItem('sw_session');
}
function getUsers() {
  try { return JSON.parse(localStorage.getItem('sw_users') || '[]'); }
  catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem('sw_users', JSON.stringify(users));
}

/* ══════════════════════════════════════════════
   AUTH — SHOW/HIDE PANELS
══════════════════════════════════════════════ */
function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('appScreen').classList.add('hidden');
  showPanel('login');
}

function showApp(username) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  document.getElementById('headerUsername').textContent = username;
  document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

  document.getElementById('expenseDate').value = todayStr();
  document.getElementById('budgetMonth').value = currentMonthStr();

  populateMonthFilter();
  renderAll();
}

function showPanel(panel) {
  const loginPanel    = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const tabLogin      = document.getElementById('tabLogin');
  const tabRegister   = document.getElementById('tabRegister');
  clearFormFeedback();

  if (panel === 'login') {
    loginPanel.classList.remove('hidden');
    registerPanel.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginPanel.classList.add('hidden');
    registerPanel.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

/* ══════════════════════════════════════════════
   ✦ AUTH CARD SHAKE — visual error feedback
══════════════════════════════════════════════ */
function shakeAuthCard() {
  const wrapper = document.getElementById('authWrapper') || document.querySelector('.auth-wrapper');
  if (!wrapper) return;
  // Remove class first to allow re-trigger
  wrapper.classList.remove('shake');
  void wrapper.offsetWidth; // force reflow
  wrapper.classList.add('shake');
  wrapper.addEventListener('animationend', () => {
    wrapper.classList.remove('shake');
  }, { once: true });
}

/* ══════════════════════════════════════════════
   AUTH — LOGIN
══════════════════════════════════════════════ */
async function handleLogin() {
  clearFormFeedback();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showError('loginError', 'Please enter both username and password.');
    shakeAuthCard();
    return;
  }

  const users = getUsers();
  const candidate = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!candidate) {
    showError('loginError', '❌ Invalid username or password.');
    shakeAuthCard();
    return;
  }

  const hash = await hashPassword(password, candidate.username);

  if (candidate.passwordHash !== hash) {
    showError('loginError', '❌ Invalid username or password.');
    shakeAuthCard();
    return;
  }

  document.getElementById('loginPassword').value = '';

  setSession(candidate.username);
  showToast(`Welcome back, ${candidate.username}! 👋`, 'success');
  showApp(candidate.username);
}

/* ══════════════════════════════════════════════
   AUTH — REGISTER
══════════════════════════════════════════════ */
async function handleRegister() {
  clearFormFeedback();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  if (!username || !password || !confirm) {
    showError('registerError', 'All fields are required.');
    shakeAuthCard();
    return;
  }
  if (username.length < 3) {
    showError('registerError', 'Username must be at least 3 characters.');
    shakeAuthCard();
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError('registerError', 'Username may only contain letters, numbers, and underscores.');
    shakeAuthCard();
    return;
  }
  if (password.length < 6) {
    showError('registerError', 'Password must be at least 6 characters.');
    shakeAuthCard();
    return;
  }
  if (password !== confirm) {
    showError('registerError', '❌ Passwords do not match.');
    shakeAuthCard();
    return;
  }

  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    showError('registerError', '⚠️ That username is already taken. Choose another.');
    shakeAuthCard();
    return;
  }

  const passwordHash = await hashPassword(password, username);
  users.push({ username, passwordHash });
  saveUsers(users);

  showSuccess('registerSuccess', '✅ Account created! Signing you in...');
  document.getElementById('regUsername').value = '';
  document.getElementById('regPassword').value = '';
  document.getElementById('regConfirm').value  = '';

  setTimeout(() => showPanel('login'), 1600);
}

/* ══════════════════════════════════════════════
   AUTH — LOGOUT (secure & clean)
══════════════════════════════════════════════ */
function handleLogout() {
  clearSession();

  const sensitiveFields = [
    'loginUsername', 'loginPassword',
    'regUsername', 'regPassword', 'regConfirm'
  ];
  sensitiveFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.setAttribute('autocomplete', id.includes('Password') ? 'new-password' : 'off');
    }
  });

  document.querySelectorAll('.pw-toggle').forEach(btn => {
    const icon  = btn.querySelector('i');
    const input = btn.closest('.input-pw-wrap')?.querySelector('input');
    if (input) input.type = 'password';
    if (icon)  { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
  });

  clearFormFeedback();
  showToast('Logged out securely. See you soon! 👋', 'info');
  showAuth();
}

/* ══════════════════════════════════════════════
   FEEDBACK HELPERS
══════════════════════════════════════════════ */
function clearFormFeedback() {
  ['loginError', 'registerError', 'registerSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

/* ══════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════ */
function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    warn:    'fa-triangle-exclamation',
    info:    'fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ══════════════════════════════════════════════
   PASSWORD TOGGLE
══════════════════════════════════════════════ */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

/* ══════════════════════════════════════════════
   DATE HELPERS
══════════════════════════════════════════════ */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y,m,d] = dateStr.split('-');
  return new Date(+y, +m-1, +d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [y,m] = monthStr.split('-');
  return new Date(+y, +m-1).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
}
function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

/* ══════════════════════════════════════════════
   EXPENSE STORAGE (per-user keys)
══════════════════════════════════════════════ */
function expKey() {
  const s = getSession();
  return s ? `sw_expenses_${s.username}` : null;
}
function getExpenses() {
  const k = expKey();
  if (!k) return [];
  try { return JSON.parse(localStorage.getItem(k) || '[]'); }
  catch { return []; }
}
function saveExpenses(list) {
  const k = expKey();
  if (k) localStorage.setItem(k, JSON.stringify(list));
}

/* ══════════════════════════════════════════════
   BUDGET STORAGE (per-user keys)
══════════════════════════════════════════════ */
function budgetKey() {
  const s = getSession();
  return s ? `sw_budgets_${s.username}` : null;
}
function getBudgets() {
  const k = budgetKey();
  if (!k) return {};
  try { return JSON.parse(localStorage.getItem(k) || '{}'); }
  catch { return {}; }
}
function saveBudgets(budgets) {
  const k = budgetKey();
  if (k) localStorage.setItem(k, JSON.stringify(budgets));
}
function getBudgetForMonth(month) {
  return getBudgets()[month] || 0;
}

/* ══════════════════════════════════════════════
   SET BUDGET
══════════════════════════════════════════════ */
function setBudget() {
  const month  = document.getElementById('budgetMonth').value;
  const amount = parseFloat(document.getElementById('budgetAmount').value);

  if (!month)                        { showToast('Please select a month.', 'warn'); return; }
  if (isNaN(amount) || amount <= 0)  { showToast('Enter a valid budget amount.', 'warn'); return; }

  const budgets = getBudgets();
  budgets[month] = amount;
  saveBudgets(budgets);
  showToast(`Budget set to ${fmt(amount)} for ${formatMonth(month)} ✅`, 'success');
  renderAll();
}

/* ══════════════════════════════════════════════
   ADD EXPENSE  — marks first row as .row-new
══════════════════════════════════════════════ */
// Track the id of the most recently added expense for the highlight animation
let _lastAddedId = null;

function addExpense() {
  const desc     = document.getElementById('expenseDesc').value.trim();
  const amount   = parseFloat(document.getElementById('expenseAmount').value);
  const category = document.getElementById('expenseCategory').value;
  const date     = document.getElementById('expenseDate').value;

  if (!desc)                         { showToast('Please enter a description.', 'warn'); return; }
  if (isNaN(amount) || amount <= 0)  { showToast('Enter a valid amount.', 'warn'); return; }
  if (!date)                         { showToast('Please select a date.', 'warn'); return; }

  const newExpense = { id: crypto.randomUUID(), desc, amount, category, date };
  _lastAddedId = newExpense.id;

  const list = getExpenses();
  list.push(newExpense);
  saveExpenses(list);

  document.getElementById('expenseDesc').value   = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseDate').value   = todayStr();

  showToast(`"${desc}" added (${fmt(amount)}) 🎉`, 'success');
  populateMonthFilter();
  renderAll();

  // Clear the highlight tracker after one render cycle
  setTimeout(() => { _lastAddedId = null; }, 2500);
}

/* ══════════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════════ */
function openEditModal(id) {
  const expense = getExpenses().find(e => e.id === id);
  if (!expense) return;
  document.getElementById('editId').value       = expense.id;
  document.getElementById('editDesc').value     = expense.desc;
  document.getElementById('editAmount').value   = expense.amount;
  document.getElementById('editCategory').value = expense.category;
  document.getElementById('editDate').value     = expense.date;
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}
function saveEdit() {
  const id       = document.getElementById('editId').value;
  const desc     = document.getElementById('editDesc').value.trim();
  const amount   = parseFloat(document.getElementById('editAmount').value);
  const category = document.getElementById('editCategory').value;
  const date     = document.getElementById('editDate').value;

  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    showToast('Please fill in all fields correctly.', 'warn');
    return;
  }

  const list = getExpenses();
  const idx  = list.findIndex(e => e.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], desc, amount, category, date };
  saveExpenses(list);
  closeEditModal();
  showToast('Expense updated successfully ✅', 'success');
  renderAll();
}

/* ══════════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════════ */
let _pendingDeleteId = null;
function deleteExpense(id) {
  _pendingDeleteId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() {
  _pendingDeleteId = null;
  document.getElementById('deleteModal').classList.add('hidden');
}
function confirmDelete() {
  if (!_pendingDeleteId) return;
  const list = getExpenses().filter(e => e.id !== _pendingDeleteId);
  saveExpenses(list);
  closeDeleteModal();
  showToast('Expense deleted.', 'info');
  populateMonthFilter();
  renderAll();
}

/* ══════════════════════════════════════════════
   FILTER / SORT EXPENSES
══════════════════════════════════════════════ */
function filterExpenses() { renderExpenseTable(); }

function getFilteredSortedExpenses() {
  const filterMonth = document.getElementById('filterMonth')?.value || '';
  const search      = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sort        = document.getElementById('sortSelect')?.value || 'date-desc';

  let list = getExpenses();
  if (filterMonth) list = list.filter(e => e.date && e.date.startsWith(filterMonth));
  if (search) {
    list = list.filter(e =>
      e.desc.toLowerCase().includes(search) ||
      e.category.toLowerCase().includes(search)
    );
  }
  list.sort((a, b) => {
    if (sort === 'date-asc')    return new Date(a.date) - new Date(b.date);
    if (sort === 'date-desc')   return new Date(b.date) - new Date(a.date);
    if (sort === 'amount-asc')  return a.amount - b.amount;
    if (sort === 'amount-desc') return b.amount - a.amount;
    return 0;
  });
  return list;
}

/* ══════════════════════════════════════════════
   POPULATE MONTH FILTER
══════════════════════════════════════════════ */
function populateMonthFilter() {
  const sel = document.getElementById('filterMonth');
  if (!sel) return;
  const months = [...new Set(getExpenses().map(e => e.date?.slice(0,7)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="">All Months</option>';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = formatMonth(m);
    sel.appendChild(opt);
  });
}

/* ══════════════════════════════════════════════
   RENDER — EXPENSE TABLE
   ✦ Rows slide in from left; newest row gets .row-new highlight
══════════════════════════════════════════════ */
function renderExpenseTable() {
  const list   = getFilteredSortedExpenses();
  const tbody  = document.getElementById('expenseTableBody');
  const empty  = document.getElementById('emptyState');
  const footer = document.getElementById('tableSummaryRow');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (list.length === 0) {
    if (empty)  empty.classList.remove('hidden');
    if (footer) footer.textContent = '';
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.forEach((e, i) => {
    const tr = document.createElement('tr');
    // ✦ Stagger animation delay for slide-in cascade effect
    tr.style.animationDelay = `${i * 45}ms`;
    // ✦ Mark the newly added row for the highlight animation
    if (e.id === _lastAddedId) tr.classList.add('row-new');

    tr.innerHTML = `
      <td>${i+1}</td>
      <td><strong>${escHtml(e.desc)}</strong></td>
      <td><span class="cat-pill">${escHtml(e.category)}</span></td>
      <td class="amount-cell">${fmt(e.amount)}</td>
      <td>${formatDate(e.date)}</td>
      <td class="action-cell">
        <button class="btn-edit-row" onclick="openEditModal('${e.id}')" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-del-row" onclick="deleteExpense('${e.id}')" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const total = list.reduce((s, e) => s + e.amount, 0);
  if (footer) {
    footer.textContent = `Showing ${list.length} expense${list.length !== 1 ? 's' : ''} — Total: ${fmt(total)}`;
  }
}

/* ══════════════════════════════════════════════
   RENDER — SUMMARY CARDS
══════════════════════════════════════════════ */
function renderSummary() {
  const filterMonth = document.getElementById('filterMonth')?.value || '';
  const month       = filterMonth || currentMonthStr();
  let   list        = getExpenses();
  if (filterMonth) list = list.filter(e => e.date?.startsWith(filterMonth));

  const spent  = list.reduce((s, e) => s + e.amount, 0);
  const budget = getBudgetForMonth(month);
  const remain = Math.max(0, budget - spent);

  setText('summaryBudget',    fmt(budget));
  setText('summarySpent',     fmt(spent));
  setText('summaryRemaining', fmt(remain));
  setText('summaryCount',     list.length.toString());

  renderBudgetBar(spent, budget);
  renderSuggestion(spent, budget);
}

/* ══════════════════════════════════════════════
   RENDER — BUDGET PROGRESS BAR
══════════════════════════════════════════════ */
function renderBudgetBar(spent, budget) {
  const pct    = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const fill   = document.getElementById('progressFill');
  const badge  = document.getElementById('budgetStatusBadge');
  const pctTxt = document.getElementById('budgetPctText');
  const spTxt  = document.getElementById('budgetSpentText');
  const rmTxt  = document.getElementById('budgetRemText');

  if (fill) {
    fill.style.width = pct + '%';
    fill.classList.remove('pf-warn', 'pf-danger');
    if (budget > 0 && spent > budget) fill.classList.add('pf-danger');
    else if (pct >= 80) fill.classList.add('pf-warn');
  }

  if (badge) {
    badge.className = 'status-badge';
    if (budget <= 0) {
      badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> No Budget Set';
      badge.classList.add('b-safe');
    } else if (spent > budget) {
      badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Budget Exceeded';
      badge.classList.add('b-danger');
    } else if (pct >= 80) {
      badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Close to Limit';
      badge.classList.add('b-warning');
    } else {
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Within Budget';
      badge.classList.add('b-safe');
    }
  }

  if (pctTxt) pctTxt.textContent = pct.toFixed(1) + '%';
  if (spTxt)  spTxt.textContent  = 'Spent: ' + fmt(spent);
  if (rmTxt)  rmTxt.textContent  = budget > 0
    ? 'Remaining: ' + fmt(Math.max(0, budget - spent))
    : 'Set a budget to track usage';
}

/* ══════════════════════════════════════════════
   RENDER — SMART SUGGESTION
══════════════════════════════════════════════ */
function renderSuggestion(spent, budget) {
  const box = document.getElementById('budgetSuggestion');
  if (!box) return;
  if (budget <= 0) { box.classList.add('hidden'); return; }

  const pct = (spent / budget) * 100;
  box.classList.remove('hidden', 'sug-good', 'sug-warn', 'sug-danger');

  if (spent > budget) {
    box.classList.add('sug-danger');
    box.innerHTML = '🚨 <strong>Budget exceeded!</strong> Review your expenses immediately.';
  } else if (pct >= 80) {
    box.classList.add('sug-warn');
    box.innerHTML = '⚠️ <strong>You are close to your monthly budget limit.</strong> Consider reducing spending.';
  } else if (pct <= 50) {
    box.classList.add('sug-good');
    box.innerHTML = '✅ <strong>Great job!</strong> You are managing your budget well. Keep it up!';
  } else {
    box.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════════
   RENDER ALL
══════════════════════════════════════════════ */
function renderAll() {
  renderSummary();
  renderExpenseTable();
}

/* ══════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════ */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ══════════════════════════════════════════════
   MODAL — CLOSE ON BACKDROP / ESC
   + RIPPLE on all primary & danger buttons
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Close modals on backdrop click or Escape key
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) backdrop.classList.add('hidden');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });

  // ✦ RIPPLE effect — inject keyframe once, apply on all action buttons
  const rippleStyle = document.createElement('style');
  rippleStyle.id = 'rippleStyle';
  rippleStyle.textContent = `@keyframes rippleEffect { to { transform: scale(2.5); opacity: 0; } }`;
  document.head.appendChild(rippleStyle);

  function addRipple(btn, e) {
    const ripple = document.createElement('span');
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.32);
      width: ${size}px; height: ${size}px;
      left: ${e.clientX - rect.left - size/2}px;
      top:  ${e.clientY - rect.top  - size/2}px;
      transform: scale(0); pointer-events: none;
      animation: rippleEffect .52s ease forwards;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  document.querySelectorAll('.btn-primary, .btn-danger').forEach(btn => {
    btn.addEventListener('click', function(e) { addRipple(this, e); });
  });

  // Re-attach ripple for dynamically added buttons (table rows rebuilt on each render)
  // Using event delegation on the table body instead
  const tableBody = document.getElementById('expenseTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', e => {
      const btn = e.target.closest('.btn-edit-row, .btn-del-row');
      if (btn) {
        // Small pulse on click for table buttons
        btn.style.transform = 'scale(0.85)';
        setTimeout(() => { btn.style.transform = ''; }, 150);
      }
    });
  }

  // ✦ Enter key support for login/register forms
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginUsername')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('regConfirm')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
});

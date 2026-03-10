/**
 * app.js — SpendWise Expense Tracker
 * Handles: auth, expenses, budget, smart suggestions, UI updates
 */

/* ══════════════════════════════════════════════
   BOOTSTRAP — seed demo account & guard
══════════════════════════════════════════════ */
(function bootstrap() {
  // Seed demo account
  const users = JSON.parse(localStorage.getItem('sw_users') || '[]');
  if (!users.find(u => u.username === 'admin')) {
    users.push({ username: 'admin', password: 'admin123' });
    localStorage.setItem('sw_users', JSON.stringify(users));
  }

  // Restore session
  const session = getSession();
  if (session) {
    showApp(session.username);
  } else {
    showAuth();
  }
})();

/* ══════════════════════════════════════════════
   SESSION HELPERS
══════════════════════════════════════════════ */
function getSession() {
  return JSON.parse(localStorage.getItem('sw_session') || 'null');
}
function setSession(username) {
  localStorage.setItem('sw_session', JSON.stringify({ username }));
}
function clearSession() {
  localStorage.removeItem('sw_session');
}
function getUsers() {
  return JSON.parse(localStorage.getItem('sw_users') || '[]');
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
}
function showApp(username) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  // Set avatar + name in header
  document.getElementById('headerUsername').textContent = username;
  document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

  // Set default date on expense form
  document.getElementById('expenseDate').value = todayStr();
  // Set budget month default
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
   AUTH — LOGIN
══════════════════════════════════════════════ */
function handleLogin() {
  clearFormFeedback();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    showError('loginError', 'Please enter both username and password.');
    return;
  }

  const users = getUsers();
  const user  = users.find(u => u.username === username && u.password === password);

  if (!user) {
    showError('loginError', '❌ Invalid username or password. Try admin / admin123');
    return;
  }

  setSession(username);
  showApp(username);
}

/* ══════════════════════════════════════════════
   AUTH — REGISTER
══════════════════════════════════════════════ */
function handleRegister() {
  clearFormFeedback();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  if (!username || !password || !confirm) {
    showError('registerError', 'All fields are required.');
    return;
  }
  if (username.length < 3) {
    showError('registerError', 'Username must be at least 3 characters.');
    return;
  }
  if (password.length < 6) {
    showError('registerError', 'Password must be at least 6 characters.');
    return;
  }
  if (password !== confirm) {
    showError('registerError', '❌ Passwords do not match.');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    showError('registerError', '⚠️ That username is already taken. Choose another.');
    return;
  }

  users.push({ username, password });
  saveUsers(users);
  showSuccess('registerSuccess', '✅ Account created! You can now sign in.');
  document.getElementById('regUsername').value = '';
  document.getElementById('regPassword').value = '';
  document.getElementById('regConfirm').value  = '';
  setTimeout(() => showPanel('login'), 1600);
}

/* ══════════════════════════════════════════════
   AUTH — LOGOUT
══════════════════════════════════════════════ */
function handleLogout() {
  clearSession();
  showAuth();
}

/* ══════════════════════════════════════════════
   FEEDBACK HELPERS
══════════════════════════════════════════════ */
function clearFormFeedback() {
  ['loginError','registerError','registerSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  });
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
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
   EXPENSE STORAGE
══════════════════════════════════════════════ */
function expKey() {
  const s = getSession();
  return s ? `sw_expenses_${s.username}` : null;
}
function getExpenses() {
  const k = expKey();
  return k ? JSON.parse(localStorage.getItem(k) || '[]') : [];
}
function saveExpenses(list) {
  const k = expKey();
  if (k) localStorage.setItem(k, JSON.stringify(list));
}

/* ══════════════════════════════════════════════
   BUDGET STORAGE
══════════════════════════════════════════════ */
function budgetKey() {
  const s = getSession();
  return s ? `sw_budgets_${s.username}` : null;
}
function getBudgets() {
  const k = budgetKey();
  return k ? JSON.parse(localStorage.getItem(k) || '{}') : {};
}
function saveBudgets(obj) {
  const k = budgetKey();
  if (k) localStorage.setItem(k, JSON.stringify(obj));
}
function getBudgetForMonth(month) {
  return parseFloat(getBudgets()[month] || 0);
}

/* ══════════════════════════════════════════════
   SET BUDGET
══════════════════════════════════════════════ */
function setBudget() {
  const month  = document.getElementById('budgetMonth').value;
  const amount = parseFloat(document.getElementById('budgetAmount').value);
  if (!month || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid month and budget amount.');
    return;
  }
  const budgets = getBudgets();
  budgets[month] = amount;
  saveBudgets(budgets);
  renderAll();
}

/* ══════════════════════════════════════════════
   ADD EXPENSE
══════════════════════════════════════════════ */
function addExpense() {
  const desc     = document.getElementById('expenseDesc').value.trim();
  const amount   = parseFloat(document.getElementById('expenseAmount').value);
  const category = document.getElementById('expenseCategory').value;
  const date     = document.getElementById('expenseDate').value;

  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill in description, amount, and date.');
    return;
  }

  const expenses = getExpenses();
  expenses.unshift({
    id: Date.now().toString(),
    desc, amount, category, date,
    createdAt: new Date().toISOString()
  });
  saveExpenses(expenses);

  // Reset form
  document.getElementById('expenseDesc').value   = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseDate').value   = todayStr();
  document.getElementById('expenseCategory').value = 'Food';

  populateMonthFilter();
  renderAll();
}

/* ══════════════════════════════════════════════
   DELETE EXPENSE
══════════════════════════════════════════════ */
let pendingDeleteId = null;

function deleteExpense(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  pendingDeleteId = null;
}
function confirmDelete() {
  if (!pendingDeleteId) return;
  const list = getExpenses().filter(e => e.id !== pendingDeleteId);
  saveExpenses(list);
  pendingDeleteId = null;
  closeDeleteModal();
  populateMonthFilter();
  renderAll();
}

/* ══════════════════════════════════════════════
   EDIT EXPENSE
══════════════════════════════════════════════ */
function openEditModal(id) {
  const e = getExpenses().find(ex => ex.id === id);
  if (!e) return;
  document.getElementById('editId').value         = e.id;
  document.getElementById('editDesc').value       = e.desc;
  document.getElementById('editAmount').value     = e.amount;
  document.getElementById('editCategory').value   = e.category;
  document.getElementById('editDate').value       = e.date;
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}
function saveEdit() {
  const id   = document.getElementById('editId').value;
  const desc = document.getElementById('editDesc').value.trim();
  const amount = parseFloat(document.getElementById('editAmount').value);
  const category = document.getElementById('editCategory').value;
  const date = document.getElementById('editDate').value;

  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const list = getExpenses();
  const idx  = list.findIndex(e => e.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], desc, amount, category, date };
  saveExpenses(list);
  closeEditModal();
  renderAll();
}

/* ══════════════════════════════════════════════
   FILTER / SORT EXPENSES
══════════════════════════════════════════════ */
function filterExpenses() {
  renderExpenseTable();
}

function getFilteredSortedExpenses() {
  const filterMonth = document.getElementById('filterMonth')?.value || '';
  const search      = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sort        = document.getElementById('sortSelect')?.value || 'date-desc';

  let list = getExpenses();

  if (filterMonth) {
    list = list.filter(e => e.date && e.date.startsWith(filterMonth));
  }
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
    opt.value = m;
    opt.textContent = formatMonth(m);
    sel.appendChild(opt);
  });
}

/* ══════════════════════════════════════════════
   RENDER — EXPENSE TABLE
══════════════════════════════════════════════ */
function renderExpenseTable() {
  const list   = getFilteredSortedExpenses();
  const tbody  = document.getElementById('expenseTableBody');
  const empty  = document.getElementById('emptyState');
  const footer = document.getElementById('tableSummaryRow');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (list.length === 0) {
    if (empty) empty.classList.remove('hidden');
    if (footer) footer.textContent = '';
    return;
  }
  if (empty) empty.classList.add('hidden');

  list.forEach((e, i) => {
    const tr = document.createElement('tr');
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
    if (pct > 100 || spent > budget && budget > 0) fill.classList.add('pf-danger');
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
  if (rmTxt)  rmTxt.textContent  = budget > 0 ? 'Remaining: ' + fmt(Math.max(0, budget - spent)) : 'Set a budget to track usage';
}

/* ══════════════════════════════════════════════
   RENDER — SMART SUGGESTION
══════════════════════════════════════════════ */
function renderSuggestion(spent, budget) {
  const box = document.getElementById('budgetSuggestion');
  if (!box) return;

  if (budget <= 0) {
    box.classList.add('hidden');
    return;
  }

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
    // 50–80%: neutral, just hide
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
   CLOSE MODALS ON BACKDROP CLICK
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
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
});

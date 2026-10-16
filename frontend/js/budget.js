/**
 * budget.js – Budget page logic.
 * Features:
 *   - Period selector (month/year)
 *   - Set overall or per-category budget (upsert)
 *   - List budgets with progress bars and over-budget warnings
 *   - Delete a budget entry
 */

'use strict';

let expenseCategories = [];
let isSubmitting      = false;

// ── Entry point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const now = new Date();
  populateYearSelect('bud-year', now.getFullYear());
  document.getElementById('bud-month').value = now.getMonth() + 1;

  await loadExpenseCategories();
  loadBudgets();
  bindEvents();
});

// ── Load expense categories for the form dropdown ─────────────────────────────
async function loadExpenseCategories() {
  try {
    const res = await api.getCategories('expense');
    expenseCategories = res.data || [];
    populateCategoryDropdown();
  } catch {
    showToast('Failed to load categories.', 'error');
  }
}

function populateCategoryDropdown() {
  const sel = document.getElementById('bud-category');
  sel.innerHTML = '<option value="">Select category</option>';
  expenseCategories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

// ── Bind UI events ────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('btn-load-budgets').addEventListener('click', loadBudgets);

  // Toggle category dropdown visibility based on budget type
  document.getElementById('bud-type').addEventListener('change', e => {
    const isCategory = e.target.value === 'category';
    document.getElementById('bud-cat-group').style.display = isCategory ? '' : 'none';
  });

  document.getElementById('bud-form').addEventListener('submit', e => {
    e.preventDefault();
    saveBudget();
  });
}

// ── Load budgets for selected period ─────────────────────────────────────────
async function loadBudgets() {
  const month = parseInt(document.getElementById('bud-month').value, 10);
  const year  = parseInt(document.getElementById('bud-year').value,  10);

  document.getElementById('bud-list').innerHTML = '<div class="loader"><div class="spinner"></div> Loading…</div>';
  document.getElementById('bud-warnings').innerHTML = '';

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('bud-period-label').textContent = `${MONTH_NAMES[month - 1]} ${year}`;

  try {
    const res = await api.getBudgets(month, year);
    if (!res.success) throw new Error(res.message);
    renderBudgets(res.data);
    renderWarnings(res.data);
  } catch (err) {
    document.getElementById('bud-list').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ── Render budget progress list ───────────────────────────────────────────────
function renderBudgets(budgets) {
  const container = document.getElementById('bud-list');

  if (!budgets || budgets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </div>
        <h3>No budgets set</h3>
        <p>Use the form to set a monthly or category budget.</p>
      </div>`;
    return;
  }

  container.innerHTML = budgets.map(b => {
    const label     = b.category_id === null ? 'Overall Monthly Budget' : b.category_name;
    const pct       = b.percent_used;
    const barClass  = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
    const overClass = b.over_budget ? 'over' : '';

    return `
      <div class="budget-row">
        <div class="budget-row-header">
          <div class="budget-row-name">${label}</div>
          <button class="btn btn-danger btn-sm" onclick="removeBudget(${b.id}, '${label}')" title="Remove budget" style="padding:3px 7px">✕</button>
        </div>
        <div class="budget-row-header" style="margin-bottom:4px">
          <div style="font-size:.8rem;color:var(--color-text-muted)">
            Spent: ${formatCurrency(b.spent)} / ${formatCurrency(b.amount)}
          </div>
          <div class="budget-row-amounts">
            Remaining: <span class="${overClass}">${b.over_budget ? '-' : ''}${formatCurrency(Math.abs(b.remaining))}</span>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ${barClass}" style="width:${Math.min(100, pct)}%"></div>
        </div>
        <div style="font-size:.75rem;color:var(--color-text-muted);text-align:right;margin-top:4px">${pct}% used</div>
      </div>`;
  }).join('');
}

// ── Render over-budget warnings ───────────────────────────────────────────────
function renderWarnings(budgets) {
  const container = document.getElementById('bud-warnings');
  const overBudget = budgets.filter(b => b.over_budget);

  if (overBudget.length === 0) { container.innerHTML = ''; return; }

  const list = overBudget.map(b => {
    const label = b.category_id === null ? 'Overall Monthly Budget' : b.category_name;
    const over  = Math.abs(b.remaining);
    return `<li><strong>${label}</strong> — over by ${formatCurrency(over)}</li>`;
  }).join('');

  container.innerHTML = `
    <div class="alert alert-warning" style="margin-top:0;flex-direction:column;align-items:flex-start;gap:6px">
      <div style="display:flex;align-items:center;gap:8px;font-weight:600">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Over-budget alert
      </div>
      <ul style="padding-left:24px;font-size:.845rem">${list}</ul>
    </div>`;
}

// ── Save budget ───────────────────────────────────────────────────────────────
async function saveBudget() {
  if (isSubmitting) return;

  const month      = parseInt(document.getElementById('bud-month').value, 10);
  const year       = parseInt(document.getElementById('bud-year').value,  10);
  const budgetType = document.getElementById('bud-type').value;
  const categoryId = document.getElementById('bud-category').value;
  const amount     = document.getElementById('bud-amount').value;

  // Validation
  let valid = true;
  document.getElementById('err-bud-amount').classList.add('hidden');
  document.getElementById('err-bud-cat').classList.add('hidden');
  document.getElementById('bud-amount').classList.remove('error');

  if (!amount || parseFloat(amount) <= 0) {
    document.getElementById('err-bud-amount').classList.remove('hidden');
    document.getElementById('bud-amount').classList.add('error');
    valid = false;
  }

  if (budgetType === 'category' && !categoryId) {
    document.getElementById('err-bud-cat').classList.remove('hidden');
    valid = false;
  }

  if (!valid) return;

  isSubmitting = true;
  document.getElementById('btn-save-budget').textContent = 'Saving…';

  const body = {
    month,
    year,
    amount: parseFloat(amount),
    category_id: budgetType === 'category' ? categoryId : null,
  };

  try {
    const res = await api.saveBudget(body);
    if (!res.success) throw new Error(res.message);
    showToast('Budget saved.', 'success');
    document.getElementById('bud-amount').value = '';
    loadBudgets();
  } catch (err) {
    document.getElementById('bud-form-alert').innerHTML =
      `<div class="alert alert-error" style="margin-bottom:12px">${err.message}</div>`;
    setTimeout(() => { document.getElementById('bud-form-alert').innerHTML = ''; }, 5000);
  } finally {
    isSubmitting = false;
    document.getElementById('btn-save-budget').textContent = 'Save Budget';
  }
}

// ── Delete budget ─────────────────────────────────────────────────────────────
async function removeBudget(id, label) {
  const confirmed = await showConfirm(`Remove budget for "${label}"?`);
  if (!confirmed) return;

  try {
    await api.deleteBudget(id);
    showToast('Budget removed.', 'success');
    loadBudgets();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

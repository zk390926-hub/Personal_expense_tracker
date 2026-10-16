/**
 * app.js – Dashboard page logic.
 * Fetches summary data from /api/dashboard and renders:
 *   - Stats cards (income, expenses, savings, savings rate)
 *   - Income vs Expenses chart (last 6 months)
 *   - Expense by category (inline bars)
 *   - Recent transactions list
 */

'use strict';

let monthlyChart = null; // Chart.js instance – kept to allow updates

// ── Entry point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();

  // Populate month/year selectors
  populateYearSelect('sel-year', now.getFullYear());
  document.getElementById('sel-month').value = now.getMonth() + 1;

  loadDashboard();

  document.getElementById('btn-refresh-dashboard').addEventListener('click', loadDashboard);
  document.getElementById('sel-month').addEventListener('change', loadDashboard);
  document.getElementById('sel-year').addEventListener('change', loadDashboard);
});

// ── Load dashboard data ───────────────────────────────────────────────────────
async function loadDashboard() {
  const month = parseInt(document.getElementById('sel-month').value, 10);
  const year  = parseInt(document.getElementById('sel-year').value,  10);

  // Show loaders
  document.getElementById('category-breakdown').innerHTML   = '<div class="loader"><div class="spinner"></div> Loading…</div>';
  document.getElementById('recent-transactions').innerHTML  = '<div class="loader"><div class="spinner"></div> Loading…</div>';
  setStatPlaceholders();

  try {
    const res = await api.getDashboard(month, year);
    if (!res.success) throw new Error(res.message);
    renderDashboard(res.data);
  } catch (err) {
    showAlert('dash-alert', `Failed to load dashboard: ${err.message}`, 'error');
  }
}

// ── Render all dashboard sections ────────────────────────────────────────────
function renderDashboard(data) {
  renderStats(data);
  renderChart(data.monthly_trend);
  renderCategoryBreakdown(data.category_breakdown, data.total_expenses);
  renderRecentTransactions(data.recent_transactions);
}

// ── Stats cards ───────────────────────────────────────────────────────────────
function setStatPlaceholders() {
  ['stat-income','stat-expenses','stat-savings','stat-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

function renderStats(data) {
  document.getElementById('stat-income').textContent   = formatCurrency(data.total_income);
  document.getElementById('stat-expenses').textContent = formatCurrency(data.total_expenses);

  const savingsEl = document.getElementById('stat-savings');
  savingsEl.textContent  = formatCurrency(data.net_savings);
  savingsEl.className    = `stat-card-value ${data.net_savings >= 0 ? 'savings' : 'expense'}`;

  const rateEl = document.getElementById('stat-rate');
  rateEl.textContent = data.savings_rate.toFixed(1) + '%';
  rateEl.className   = `stat-card-value ${data.savings_rate >= 0 ? 'savings' : 'expense'}`;

  document.getElementById('stat-income-sub').textContent   = 'this month';
  document.getElementById('stat-expenses-sub').textContent = 'this month';
  document.getElementById('stat-savings-sub').textContent  =
    data.total_income > 0 ? `${data.savings_rate.toFixed(1)}% of income` : 'no income recorded';
}

// ── Monthly trend chart ───────────────────────────────────────────────────────
function renderChart(trend) {
  const ctx = document.getElementById('chart-monthly');
  if (!ctx) return;

  const labels   = trend.map(t => shortMonth(t.month) + ' ' + String(t.year).slice(2));
  const incomes  = trend.map(t => t.income);
  const expenses = trend.map(t => t.expenses);

  if (monthlyChart) {
    monthlyChart.data.labels        = labels;
    monthlyChart.data.datasets[0].data = incomes;
    monthlyChart.data.datasets[1].data = expenses;
    monthlyChart.update();
    return;
  }

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           'Income',
          data:            incomes,
          backgroundColor: 'rgba(45,106,79,.75)',
          borderRadius:    3,
        },
        {
          label:           'Expenses',
          data:            expenses,
          backgroundColor: 'rgba(181,55,58,.65)',
          borderRadius:    3,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + formatCurrency(ctx.parsed.y),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          beginAtZero: true,
          ticks: {
            font:     { size: 11 },
            callback: v => '₹' + Number(v).toLocaleString('en-IN'),
          },
        },
      },
    },
  });
}

// ── Category breakdown ────────────────────────────────────────────────────────
function renderCategoryBreakdown(breakdown, totalExpenses) {
  const container = document.getElementById('category-breakdown');

  if (!breakdown || breakdown.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
        <h3>No expenses this month</h3>
        <p>Add expense transactions to see a breakdown.</p>
      </div>`;
    return;
  }

  const max = breakdown[0].total; // sorted desc by server

  container.innerHTML = breakdown.map(cat => {
    const pct = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;
    const barW = max > 0 ? Math.round((cat.total / max) * 100) : 0;
    return `
      <div class="category-row">
        <div class="category-row-name" title="${cat.category}">${cat.category}</div>
        <div class="category-row-bar">
          <div class="category-row-bar-fill" style="width:${barW}%"></div>
        </div>
        <div class="category-row-amount">${formatCurrency(cat.total)}</div>
        <div style="flex:0 0 36px;text-align:right;font-size:.75rem;color:var(--color-text-muted)">${pct}%</div>
      </div>`;
  }).join('');
}

// ── Recent transactions ───────────────────────────────────────────────────────
function renderRecentTransactions(txns) {
  const container = document.getElementById('recent-transactions');

  if (!txns || txns.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <h3>No transactions yet</h3>
        <p>Start by adding your first income or expense.</p>
        <a href="pages/transactions.html" class="btn btn-primary">Add Transaction</a>
      </div>`;
    return;
  }

  container.innerHTML = txns.map(t => {
    const isIncome = t.type === 'income';
    const icon = isIncome
      ? `<svg viewBox="0 0 24 24"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>`
      : `<svg viewBox="0 0 24 24"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="6" x2="12" y2="18"/></svg>`;

    return `
      <div class="tx-list-item">
        <div class="tx-list-icon ${t.type}">${icon}</div>
        <div class="tx-list-info">
          <div class="tx-list-desc">${t.description || t.category_name}</div>
          <div class="tx-list-meta">${t.category_name} · ${formatDate(t.transaction_date)}</div>
        </div>
        <div class="tx-list-amount ${t.type}">${isIncome ? '+' : '-'}${formatCurrency(t.amount)}</div>
      </div>`;
  }).join('');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function shortMonth(m) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] || '';
}

function showAlert(containerId, message, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="alert alert-${type}">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${message}
    </div>`;
  setTimeout(() => { el.innerHTML = ''; }, 6000);
}

/**
 * reports.js – Monthly Reports page logic.
 * Loads a monthly report from the API and renders:
 *   - Summary stats
 *   - Income vs Expenses bar chart
 *   - Expense category breakdown (horizontal bars)
 *   - Full transaction table for the month
 * Also handles CSV export of the month's transactions.
 */

'use strict';

let reportChart = null;
let reportData  = null; // cached for CSV export

// ── Entry point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  populateYearSelect('rep-year', now.getFullYear());
  document.getElementById('rep-month').value = now.getMonth() + 1;

  document.getElementById('btn-load-report').addEventListener('click', loadReport);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);

  loadReport();
});

// ── Load report ───────────────────────────────────────────────────────────────
async function loadReport() {
  const month = parseInt(document.getElementById('rep-month').value, 10);
  const year  = parseInt(document.getElementById('rep-year').value,  10);

  document.getElementById('rep-category-list').innerHTML  = '<div class="loader"><div class="spinner"></div> Loading…</div>';
  document.getElementById('rep-tx-tbody').innerHTML       = '<tr><td colspan="5"><div class="loader"><div class="spinner"></div> Loading…</div></td></tr>';
  setStatPlaceholders();

  try {
    const res = await api.getMonthlyReport(month, year);
    if (!res.success) throw new Error(res.message);
    reportData = res.data;
    renderReport(reportData);
  } catch (err) {
    document.getElementById('rep-alert').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderReport(data) {
  renderStats(data);
  renderChart(data);
  renderCategories(data.expense_by_category, data.total_expenses);
  renderTransactionTable(data.transactions);

  // Top category label
  const topEl = document.getElementById('rep-top-cat');
  topEl.textContent = data.top_expense_category
    ? `Highest: ${data.top_expense_category}`
    : '';
}

function setStatPlaceholders() {
  ['rep-income','rep-expenses','rep-savings','rep-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

function renderStats(data) {
  document.getElementById('rep-income').textContent   = formatCurrency(data.total_income);
  document.getElementById('rep-expenses').textContent = formatCurrency(data.total_expenses);

  const savEl = document.getElementById('rep-savings');
  savEl.textContent = formatCurrency(data.net_savings);
  savEl.className   = `stat-card-value ${data.net_savings >= 0 ? 'savings' : 'expense'}`;

  const rateEl = document.getElementById('rep-rate');
  rateEl.textContent = data.savings_rate.toFixed(1) + '%';
  rateEl.className   = `stat-card-value ${data.savings_rate >= 0 ? 'savings' : 'expense'}`;
}

function renderChart(data) {
  const ctx = document.getElementById('chart-report');
  if (!ctx) return;

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const label = `${MONTH_NAMES[data.month - 1]} ${data.year}`;

  if (reportChart) {
    reportChart.data.labels              = [label];
    reportChart.data.datasets[0].data   = [data.total_income];
    reportChart.data.datasets[1].data   = [data.total_expenses];
    reportChart.update();
    return;
  }

  reportChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   [label],
      datasets: [
        {
          label:           'Income',
          data:            [data.total_income],
          backgroundColor: 'rgba(45,106,79,.75)',
          borderRadius:    4,
          barThickness:    50,
        },
        {
          label:           'Expenses',
          data:            [data.total_expenses],
          backgroundColor: 'rgba(181,55,58,.65)',
          borderRadius:    4,
          barThickness:    50,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => ' ' + formatCurrency(ctx.parsed.y) } },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: v => '₹' + Number(v).toLocaleString('en-IN') },
        },
      },
    },
  });
}

function renderCategories(breakdown, totalExpenses) {
  const container = document.getElementById('rep-category-list');

  if (!breakdown || breakdown.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:24px"><p>No expense categories for this month.</p></div>';
    return;
  }

  const max = breakdown[0].total;
  container.innerHTML = breakdown.map(cat => {
    const pct  = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;
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

function renderTransactionTable(txns) {
  const tbody = document.getElementById('rep-tx-tbody');

  if (!txns || txns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:24px"><p>No transactions for this month.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = txns.map(t => `
    <tr>
      <td>${formatDate(t.transaction_date)}</td>
      <td>${escapeHtml(t.description || '—')}</td>
      <td class="hide-mobile">${escapeHtml(t.category_name)}</td>
      <td><span class="badge badge-${t.type}">${t.type}</span></td>
      <td class="td-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
    </tr>`).join('');
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV() {
  if (!reportData || !reportData.transactions) {
    showToast('Load a report first before exporting.', 'warning');
    return;
  }

  const rows = [
    ['Date', 'Description', 'Category', 'Type', 'Amount (INR)'],
    ...reportData.transactions.map(t => [
      t.transaction_date ? new Date(t.transaction_date).toISOString().slice(0, 10) : '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category_name,
      t.type,
      t.type === 'income' ? t.amount : -t.amount,
    ]),
  ];

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  a.href     = url;
  a.download = `expenses_${MONTH_NAMES[reportData.month - 1]}_${reportData.year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully.', 'success');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * transactions.js – Transactions page logic.
 * Features: list with pagination, search, filters, sort, add, edit, delete.
 */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let allCategories = [];
let currentPage   = 1;
let currentSort   = { by: 'transaction_date', order: 'desc' };
let currentMeta   = { total: 0, pages: 1 };
let isSubmitting  = false;

// ── Entry point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  loadTransactions();
  bindEvents();
});

// ── Load categories for filter + form dropdowns ───────────────────────────────
async function loadCategories() {
  try {
    const res = await api.getCategories();
    allCategories = res.data || [];
    populateFilterCategory();
  } catch {
    showToast('Failed to load categories.', 'error');
  }
}

function populateFilterCategory() {
  const sel = document.getElementById('filter-category');
  sel.innerHTML = '<option value="">All categories</option>';
  allCategories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.type})`;
    sel.appendChild(opt);
  });
}

function populateFormCategory(type) {
  const sel = document.getElementById('tx-category');
  sel.innerHTML = '<option value="">Select category</option>';
  const filtered = type ? allCategories.filter(c => c.type === type) : allCategories;
  filtered.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

// ── Build query params from current filters / sort / page ─────────────────────
function buildParams() {
  const params = {
    page:       currentPage,
    limit:      20,
    sort_by:    currentSort.by,
    sort_order: currentSort.order,
  };

  const search    = document.getElementById('filter-search').value.trim();
  const type      = document.getElementById('filter-type').value;
  const categoryId = document.getElementById('filter-category').value;
  const dateFrom  = document.getElementById('filter-date-from').value;
  const dateTo    = document.getElementById('filter-date-to').value;

  if (search)     params.search      = search;
  if (type)       params.type        = type;
  if (categoryId) params.category_id = categoryId;
  if (dateFrom)   params.start_date  = dateFrom;
  if (dateTo)     params.end_date    = dateTo;

  return params;
}

// ── Load and render transaction table ─────────────────────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('tx-tbody');
  tbody.innerHTML = '<tr><td colspan="6"><div class="loader"><div class="spinner"></div> Loading…</div></td></tr>';

  try {
    const res = await api.getTransactions(buildParams());
    if (!res.success) throw new Error(res.message);
    currentMeta = res.meta;
    renderTable(res.data);
    renderPagination();
    document.getElementById('tx-count').textContent = `${res.meta.total} Transaction${res.meta.total !== 1 ? 's' : ''}`;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="alert alert-error">${err.message}</div></td></tr>`;
  }
}

// ── Render table rows ─────────────────────────────────────────────────────────
function renderTable(txns) {
  const tbody = document.getElementById('tx-tbody');

  if (!txns || txns.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon"><svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
            <h3>No transactions found</h3>
            <p>Try adjusting your filters or add a new transaction.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = txns.map(t => `
    <tr>
      <td>${formatDate(t.transaction_date)}</td>
      <td>${escapeHtml(t.description || '—')}</td>
      <td class="hide-mobile">${escapeHtml(t.category_name)}</td>
      <td><span class="badge badge-${t.type}">${t.type}</span></td>
      <td class="td-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
      <td class="td-actions hide-mobile">
        <button class="btn btn-ghost btn-sm" onclick="openEditModal(${t.id})" title="Edit">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${t.id}, '${escapeHtml(t.description || t.category_name)}')" title="Delete">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          Delete
        </button>
      </td>
    </tr>`).join('');
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function renderPagination() {
  const container = document.getElementById('tx-pagination');
  const { pages } = currentMeta;

  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">‹ Prev</button>`;
  for (let p = 1; p <= pages; p++) {
    if (pages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== pages) {
      if (p === currentPage - 3 || p === currentPage + 3) html += '<span style="padding:0 4px">…</span>';
      continue;
    }
    html += `<button class="${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }
  html += `<button ${currentPage === pages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">Next ›</button>`;
  container.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  loadTransactions();
}

// ── Events ────────────────────────────────────────────────────────────────────
function bindEvents() {
  // Add transaction button
  document.getElementById('btn-add-transaction').addEventListener('click', openAddModal);

  // Filter apply / reset
  document.getElementById('btn-apply-filter').addEventListener('click', () => { currentPage = 1; loadTransactions(); });
  document.getElementById('btn-reset-filter').addEventListener('click', resetFilters);

  // Sort buttons
  document.getElementById('btn-sort-date').addEventListener('click', () => toggleSort('transaction_date'));
  document.getElementById('btn-sort-amount').addEventListener('click', () => toggleSort('amount'));

  // Search on Enter
  document.getElementById('filter-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') { currentPage = 1; loadTransactions(); }
  });

  // Modal close buttons
  document.getElementById('btn-close-tx-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-tx').addEventListener('click', closeModal);

  // Type change → refresh categories
  document.getElementById('tx-type').addEventListener('change', e => {
    populateFormCategory(e.target.value);
  });

  // Form submit
  document.getElementById('btn-save-tx').addEventListener('click', saveTransaction);
}

function resetFilters() {
  document.getElementById('filter-search').value    = '';
  document.getElementById('filter-type').value      = '';
  document.getElementById('filter-category').value  = '';
  document.getElementById('filter-date-from').value = '';
  document.getElementById('filter-date-to').value   = '';
  currentPage = 1;
  loadTransactions();
}

function toggleSort(column) {
  if (currentSort.by === column) {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.by    = column;
    currentSort.order = 'desc';
  }
  currentPage = 1;
  loadTransactions();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('tx-modal-title').textContent = 'Add Transaction';
  document.getElementById('tx-id').value         = '';
  document.getElementById('tx-type').value       = 'expense';
  document.getElementById('tx-amount').value     = '';
  document.getElementById('tx-date').value       = new Date().toISOString().slice(0, 10);
  document.getElementById('tx-description').value = '';
  populateFormCategory('expense');
  clearFormErrors();
  document.getElementById('tx-form-alert').innerHTML = '';
  document.getElementById('tx-modal').classList.add('open');
}

async function openEditModal(id) {
  try {
    const res = await api.getTransaction(id);
    if (!res.success) throw new Error(res.message);
    const t = res.data;

    document.getElementById('tx-modal-title').textContent = 'Edit Transaction';
    document.getElementById('tx-id').value          = t.id;
    document.getElementById('tx-type').value        = t.type;
    populateFormCategory(t.type);
    document.getElementById('tx-category').value   = t.category_id;
    document.getElementById('tx-amount').value     = parseFloat(t.amount).toFixed(2);
    document.getElementById('tx-date').value       = t.transaction_date
      ? new Date(t.transaction_date).toISOString().slice(0, 10)
      : '';
    document.getElementById('tx-description').value = t.description || '';
    clearFormErrors();
    document.getElementById('tx-form-alert').innerHTML = '';
    document.getElementById('tx-modal').classList.add('open');
  } catch (err) {
    showToast(`Failed to load transaction: ${err.message}`, 'error');
  }
}

function closeModal() {
  document.getElementById('tx-modal').classList.remove('open');
  isSubmitting = false;
}

// ── Save (create / update) ────────────────────────────────────────────────────
async function saveTransaction() {
  if (isSubmitting) return;

  const type       = document.getElementById('tx-type').value;
  const amount     = document.getElementById('tx-amount').value;
  const categoryId = document.getElementById('tx-category').value;
  const date       = document.getElementById('tx-date').value;
  const desc       = document.getElementById('tx-description').value.trim();
  const txId       = document.getElementById('tx-id').value;

  // Frontend validation
  let valid = true;
  clearFormErrors();

  if (!amount || parseFloat(amount) <= 0) {
    showFieldError('err-amount', 'tx-amount');
    valid = false;
  }
  if (!categoryId) {
    showFieldError('err-category', 'tx-category');
    valid = false;
  }
  if (!date) {
    showFieldError('err-date', 'tx-date');
    valid = false;
  }
  if (!valid) return;

  isSubmitting = true;
  document.getElementById('btn-save-tx').textContent = 'Saving…';

  const body = { type, amount: parseFloat(amount), category_id: parseInt(categoryId, 10), description: desc, transaction_date: date };

  try {
    if (txId) {
      await api.updateTransaction(txId, body);
      showToast('Transaction updated successfully.', 'success');
    } else {
      await api.createTransaction(body);
      showToast('Transaction added successfully.', 'success');
    }
    closeModal();
    loadTransactions();
  } catch (err) {
    document.getElementById('tx-form-alert').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  } finally {
    isSubmitting = false;
    document.getElementById('btn-save-tx').textContent = 'Save Transaction';
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────────
async function deleteTransaction(id, label) {
  const confirmed = await showConfirm(`Delete "${label}"? This action cannot be undone.`);
  if (!confirmed) return;

  try {
    await api.deleteTransaction(id);
    showToast('Transaction deleted.', 'success');
    // If last item on page, go back one page
    if (currentMeta.total - 1 <= (currentPage - 1) * 20 && currentPage > 1) currentPage--;
    loadTransactions();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function showFieldError(errId, inputId) {
  document.getElementById(errId).classList.remove('hidden');
  document.getElementById(inputId).classList.add('error');
}

function clearFormErrors() {
  ['err-amount','err-category','err-date'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  ['tx-amount','tx-category','tx-date'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

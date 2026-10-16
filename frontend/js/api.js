/**
 * api.js – Shared API communication layer.
 * All fetch calls go through this module so the base URL is set once.
 */

const API_BASE = 'http://localhost:5000/api';

/**
 * Generic fetch wrapper.
 * Returns parsed JSON or throws an error with a human-readable message.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const defaults = {
    headers: { 'Content-Type': 'application/json' },
  };
  const config = { ...defaults, ...options };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({ success: false, message: 'Invalid server response.' }));

  if (!response.ok) {
    const msg = data.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Convenience methods ───────────────────────────────────────────────────────

const api = {
  // Categories
  getCategories(type = '') {
    const q = type ? `?type=${type}` : '';
    return apiFetch(`/categories${q}`);
  },

  // Transactions
  getTransactions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/transactions${q ? '?' + q : ''}`);
  },
  getTransaction(id)         { return apiFetch(`/transactions/${id}`); },
  createTransaction(body)    { return apiFetch('/transactions',      { method: 'POST', body }); },
  updateTransaction(id, body){ return apiFetch(`/transactions/${id}`,{ method: 'PUT',  body }); },
  deleteTransaction(id)      { return apiFetch(`/transactions/${id}`,{ method: 'DELETE' }); },

  // Dashboard
  getDashboard(month, year)  { return apiFetch(`/dashboard?month=${month}&year=${year}`); },

  // Reports
  getMonthlyReport(month, year){ return apiFetch(`/reports/monthly?month=${month}&year=${year}`); },

  // Budgets
  getBudgets(month, year)    { return apiFetch(`/budgets?month=${month}&year=${year}`); },
  saveBudget(body)           { return apiFetch('/budgets',      { method: 'POST', body }); },
  deleteBudget(id)           { return apiFetch(`/budgets/${id}`,{ method: 'DELETE' }); },
};

// ── Shared utility: format currency in Indian Rupees ─────────────────────────
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Shared utility: format date as DD MMM YYYY ───────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  // Use UTC parts to avoid timezone offset issues with DATE columns.
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// ── Shared utility: show a toast notification ─────────────────────────────────
function showToast(message, type = 'success', durationMs = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

// ── Shared utility: confirm dialog ───────────────────────────────────────────
function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    const msgEl   = document.getElementById('confirm-message');
    const okBtn   = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    msgEl.textContent = message;
    overlay.classList.add('open');

    function cleanup(result) {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }

    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ── Shared utility: populate year selects ────────────────────────────────────
function populateYearSelect(selectId, selectedYear) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = selectedYear || new Date().getFullYear();
  sel.innerHTML = '';
  for (let y = current + 1; y >= 2020; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === current) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ── Shared utility: mobile sidebar toggle ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('btn-hamburger');
  const sidebar   = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    // Close sidebar when a nav link is clicked on mobile
    sidebar.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => sidebar.classList.remove('open'));
    });
  }
});

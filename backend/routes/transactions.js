// routes/transactions.js
// CRUD operations for income/expense transactions.
// All SQL queries use parameterized statements to prevent injection.

'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

// Build an ISO date string from a JS Date or a date string,
// normalised to YYYY-MM-DD (no time component).
function toDateString(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function isPositiveNumber(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n > 0;
}

/* ------------------------------------------------------------------ *
 * GET /api/transactions
 * Query params: type, category_id, start_date, end_date, search,
 *               sort_by (date|amount), sort_order (asc|desc),
 *               page, limit
 * ------------------------------------------------------------------ */
router.get('/', async (req, res) => {
  try {
    const {
      type, category_id, start_date, end_date, search,
      sort_by = 'transaction_date', sort_order = 'desc',
      page = 1, limit = 50,
    } = req.query;

    let sql = `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.created_at,
        t.updated_at,
        c.id   AS category_id,
        c.name AS category_name,
        c.type AS category_type
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE 1=1`;
    const params = [];

    if (type === 'income' || type === 'expense') {
      sql += ' AND t.type = ?';
      params.push(type);
    }
    if (category_id && !isNaN(parseInt(category_id, 10))) {
      sql += ' AND t.category_id = ?';
      params.push(parseInt(category_id, 10));
    }
    if (start_date && toDateString(start_date)) {
      sql += ' AND t.transaction_date >= ?';
      params.push(toDateString(start_date));
    }
    if (end_date && toDateString(end_date)) {
      sql += ' AND t.transaction_date <= ?';
      params.push(toDateString(end_date));
    }
    if (search) {
      sql += ' AND t.description LIKE ?';
      params.push(`%${search}%`);
    }

    // Whitelist sort column to prevent injection
    const allowedSort = ['transaction_date', 'amount', 'created_at'];
    const sortCol     = allowedSort.includes(sort_by) ? sort_by : 'transaction_date';
    const sortDir     = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY t.${sortCol} ${sortDir}`;

    // Count total matching rows for pagination info
    const countSql           = `SELECT COUNT(*) AS total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE 1=1${sql.split('WHERE 1=1')[1].split('ORDER BY')[0]}`;
    const [countRows]        = await db.query(countSql, params);
    const total              = countRows[0].total;

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset   = (pageNum - 1) * limitNum;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [rows] = await db.query(sql, params);
    return res.json({
      success: true,
      data:    rows,
      meta:    { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('transactions GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching transactions.' });
  }
});

/* ------------------------------------------------------------------ *
 * GET /api/transactions/:id
 * ------------------------------------------------------------------ */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid transaction ID.' });

    const [rows] = await db.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
              t.created_at, t.updated_at,
              c.id AS category_id, c.name AS category_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('transactions GET/:id error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching transaction.' });
  }
});

/* ------------------------------------------------------------------ *
 * POST /api/transactions
 * Body: { type, amount, category_id, description, transaction_date }
 * ------------------------------------------------------------------ */
router.post('/', async (req, res) => {
  try {
    const { type, amount, category_id, description = '', transaction_date } = req.body;

    // --- Validation ---
    const errors = [];
    if (type !== 'income' && type !== 'expense') errors.push('type must be "income" or "expense".');
    if (!isPositiveNumber(amount))               errors.push('amount must be a positive number.');
    if (!category_id || isNaN(parseInt(category_id, 10))) errors.push('A valid category_id is required.');
    if (!transaction_date || !toDateString(transaction_date)) errors.push('A valid transaction_date is required (YYYY-MM-DD).');
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors });

    const catId   = parseInt(category_id, 10);
    const dateStr = toDateString(transaction_date);

    // Confirm category exists and matches type
    const [catRows] = await db.query('SELECT id, type FROM categories WHERE id = ?', [catId]);
    if (catRows.length === 0) return res.status(400).json({ success: false, message: 'Category not found.' });
    if (catRows[0].type !== type) return res.status(400).json({ success: false, message: `Category type mismatch: category is "${catRows[0].type}" but transaction type is "${type}".` });

    const [result] = await db.query(
      'INSERT INTO transactions (type, amount, category_id, description, transaction_date) VALUES (?, ?, ?, ?, ?)',
      [type, parseFloat(amount).toFixed(2), catId, description.trim(), dateStr]
    );

    const [newRow] = await db.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
              c.id AS category_id, c.name AS category_name
       FROM transactions t JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ success: true, message: 'Transaction created.', data: newRow[0] });
  } catch (err) {
    console.error('transactions POST error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating transaction.' });
  }
});

/* ------------------------------------------------------------------ *
 * PUT /api/transactions/:id
 * ------------------------------------------------------------------ */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid transaction ID.' });

    const [existing] = await db.query('SELECT id FROM transactions WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found.' });

    const { type, amount, category_id, description = '', transaction_date } = req.body;

    const errors = [];
    if (type !== 'income' && type !== 'expense') errors.push('type must be "income" or "expense".');
    if (!isPositiveNumber(amount))               errors.push('amount must be a positive number.');
    if (!category_id || isNaN(parseInt(category_id, 10))) errors.push('A valid category_id is required.');
    if (!transaction_date || !toDateString(transaction_date)) errors.push('A valid transaction_date is required (YYYY-MM-DD).');
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors });

    const catId   = parseInt(category_id, 10);
    const dateStr = toDateString(transaction_date);

    const [catRows] = await db.query('SELECT id, type FROM categories WHERE id = ?', [catId]);
    if (catRows.length === 0) return res.status(400).json({ success: false, message: 'Category not found.' });
    if (catRows[0].type !== type) return res.status(400).json({ success: false, message: `Category type mismatch.` });

    await db.query(
      'UPDATE transactions SET type=?, amount=?, category_id=?, description=?, transaction_date=? WHERE id=?',
      [type, parseFloat(amount).toFixed(2), catId, description.trim(), dateStr, id]
    );

    const [updatedRow] = await db.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
              c.id AS category_id, c.name AS category_name
       FROM transactions t JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    return res.json({ success: true, message: 'Transaction updated.', data: updatedRow[0] });
  } catch (err) {
    console.error('transactions PUT error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating transaction.' });
  }
});

/* ------------------------------------------------------------------ *
 * DELETE /api/transactions/:id
 * ------------------------------------------------------------------ */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid transaction ID.' });

    const [existing] = await db.query('SELECT id FROM transactions WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found.' });

    await db.query('DELETE FROM transactions WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Transaction deleted.' });
  } catch (err) {
    console.error('transactions DELETE error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting transaction.' });
  }
});

module.exports = router;

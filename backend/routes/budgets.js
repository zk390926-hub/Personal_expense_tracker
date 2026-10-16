// routes/budgets.js
// GET /api/budgets        — list budgets for a given month/year
// POST /api/budgets       — create or update a budget (upsert)

'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

/* ------------------------------------------------------------------ *
 * GET /api/budgets?month=&year=
 * Returns budget rows with current spending calculated from DB.
 * ------------------------------------------------------------------ */
router.get('/', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year  = parseInt(req.query.year,  10);

    if (!month || month < 1 || month > 12) return res.status(400).json({ success: false, message: 'month must be 1–12.' });
    if (!year  || year  < 2000)            return res.status(400).json({ success: false, message: 'year must be 2000 or later.' });

    // Fetch budgets for this period
    const [budgets] = await db.query(
      `SELECT b.id, b.month, b.year, b.amount,
              b.category_id,
              c.name AS category_name
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.month = ? AND b.year = ?
       ORDER BY b.category_id IS NULL DESC, c.name`,
      [month, year]
    );

    // Calculate actual spending per category for the period
    const [spending] = await db.query(
      `SELECT category_id, SUM(amount) AS spent
       FROM transactions
       WHERE type = 'expense'
         AND MONTH(transaction_date) = ?
         AND YEAR(transaction_date)  = ?
       GROUP BY category_id`,
      [month, year]
    );

    // Total expenses for overall budget comparison
    const [totalRow] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent
       FROM transactions
       WHERE type = 'expense'
         AND MONTH(transaction_date) = ?
         AND YEAR(transaction_date)  = ?`,
      [month, year]
    );

    const spendingMap = {};
    spending.forEach(s => { spendingMap[s.category_id] = parseFloat(s.spent); });
    const totalSpent = parseFloat(totalRow[0].total_spent);

    const enriched = budgets.map(b => {
      const spent     = b.category_id === null ? totalSpent : (spendingMap[b.category_id] || 0);
      const remaining = parseFloat(b.amount) - spent;
      return {
        ...b,
        amount:    parseFloat(b.amount),
        spent,
        remaining,
        over_budget: remaining < 0,
        percent_used: parseFloat(b.amount) > 0
          ? Math.min(100, Math.round((spent / parseFloat(b.amount)) * 100))
          : 0,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('budgets GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching budgets.' });
  }
});

/* ------------------------------------------------------------------ *
 * POST /api/budgets
 * Body: { month, year, category_id (optional), amount }
 * Uses INSERT … ON DUPLICATE KEY UPDATE for upsert behaviour.
 * ------------------------------------------------------------------ */
router.post('/', async (req, res) => {
  try {
    let { month, year, category_id = null, amount } = req.body;

    month = parseInt(month, 10);
    year  = parseInt(year,  10);
    const amt = parseFloat(amount);

    const errors = [];
    if (!month || month < 1 || month > 12) errors.push('month must be 1–12.');
    if (!year  || year  < 2000)            errors.push('year must be 2000 or later.');
    if (isNaN(amt) || amt <= 0)            errors.push('amount must be a positive number.');
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(' '), errors });

    let catId = null;
    if (category_id !== null && category_id !== undefined && category_id !== '') {
      catId = parseInt(category_id, 10);
      if (isNaN(catId)) return res.status(400).json({ success: false, message: 'Invalid category_id.' });

      const [catRows] = await db.query('SELECT id, type FROM categories WHERE id = ? AND type = ?', [catId, 'expense']);
      if (catRows.length === 0) return res.status(400).json({ success: false, message: 'Expense category not found.' });
    }

    // Upsert: if a budget for this month/year/category already exists, update it.
    await db.query(
      `INSERT INTO budgets (month, year, category_id, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
      [month, year, catId, amt.toFixed(2)]
    );

    return res.status(201).json({ success: true, message: 'Budget saved.' });
  } catch (err) {
    console.error('budgets POST error:', err);
    return res.status(500).json({ success: false, message: 'Server error saving budget.' });
  }
});

/* ------------------------------------------------------------------ *
 * DELETE /api/budgets/:id
 * ------------------------------------------------------------------ */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid budget ID.' });

    const [existing] = await db.query('SELECT id FROM budgets WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Budget not found.' });

    await db.query('DELETE FROM budgets WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Budget removed.' });
  } catch (err) {
    console.error('budgets DELETE error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting budget.' });
  }
});

module.exports = router;

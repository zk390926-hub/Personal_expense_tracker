// routes/dashboard.js
// GET /api/dashboard?month=&year=
// Returns monthly income, expenses, savings, savings rate,
// recent transactions, and expense breakdown by category.

'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year  = parseInt(req.query.year,  10);

    if (!month || month < 1 || month > 12) return res.status(400).json({ success: false, message: 'month must be 1–12.' });
    if (!year  || year  < 2000)            return res.status(400).json({ success: false, message: 'year must be 2000 or later.' });

    // --- Totals ---
    const [totals] = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
       FROM transactions
       WHERE MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?`,
      [month, year]
    );

    const totalIncome   = parseFloat(totals[0].total_income);
    const totalExpenses = parseFloat(totals[0].total_expenses);
    const netSavings    = totalIncome - totalExpenses;
    const savingsRate   = totalIncome > 0
      ? parseFloat(((netSavings / totalIncome) * 100).toFixed(2))
      : 0;

    // --- Expense breakdown by category ---
    const [categoryBreakdown] = await db.query(
      `SELECT c.name AS category, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense'
         AND MONTH(t.transaction_date) = ?
         AND YEAR(t.transaction_date)  = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [month, year]
    );

    // --- Recent 10 transactions ---
    const [recent] = await db.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
              c.name AS category_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 10`,
      [month, year]
    );

    // --- Monthly income vs expenses for last 6 months ---
    const [monthly] = await db.query(
      `SELECT
         YEAR(transaction_date)  AS year,
         MONTH(transaction_date) AS month,
         COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
       FROM transactions
       WHERE transaction_date >= DATE_SUB(LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01')), INTERVAL 5 MONTH)
         AND transaction_date <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01'))
       GROUP BY YEAR(transaction_date), MONTH(transaction_date)
       ORDER BY year, month`,
      [year, month, year, month]
    );

    return res.json({
      success: true,
      data: {
        month, year,
        total_income:    totalIncome,
        total_expenses:  totalExpenses,
        net_savings:     netSavings,
        savings_rate:    savingsRate,
        category_breakdown: categoryBreakdown.map(r => ({
          category: r.category,
          total:    parseFloat(r.total),
        })),
        recent_transactions: recent.map(r => ({
          ...r,
          amount: parseFloat(r.amount),
        })),
        monthly_trend: monthly.map(r => ({
          year:     r.year,
          month:    r.month,
          income:   parseFloat(r.income),
          expenses: parseFloat(r.expenses),
        })),
      },
    });
  } catch (err) {
    console.error('dashboard GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading dashboard.' });
  }
});

module.exports = router;

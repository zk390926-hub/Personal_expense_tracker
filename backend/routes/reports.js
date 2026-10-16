// routes/reports.js
// GET /api/reports/monthly?month=&year=  — monthly financial report

'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

router.get('/monthly', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year  = parseInt(req.query.year,  10);

    if (!month || month < 1 || month > 12) return res.status(400).json({ success: false, message: 'month must be 1–12.' });
    if (!year  || year  < 2000)            return res.status(400).json({ success: false, message: 'year must be 2000 or later.' });

    // Totals
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

    // Expense breakdown by category
    const [expenseByCategory] = await db.query(
      `SELECT c.id AS category_id, c.name AS category, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'expense'
         AND MONTH(t.transaction_date) = ?
         AND YEAR(t.transaction_date)  = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [month, year]
    );

    // Income breakdown by category
    const [incomeByCategory] = await db.query(
      `SELECT c.id AS category_id, c.name AS category, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'income'
         AND MONTH(t.transaction_date) = ?
         AND YEAR(t.transaction_date)  = ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [month, year]
    );

    // All transactions for the month (for CSV export)
    const [transactions] = await db.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
              c.name AS category_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE MONTH(t.transaction_date) = ? AND YEAR(t.transaction_date) = ?
       ORDER BY t.transaction_date DESC`,
      [month, year]
    );

    const topExpenseCategory = expenseByCategory.length > 0 ? expenseByCategory[0].category : null;

    return res.json({
      success: true,
      data: {
        month, year,
        total_income:    totalIncome,
        total_expenses:  totalExpenses,
        net_savings:     netSavings,
        savings_rate:    savingsRate,
        top_expense_category: topExpenseCategory,
        expense_by_category: expenseByCategory.map(r => ({
          category_id: r.category_id,
          category:    r.category,
          total:       parseFloat(r.total),
        })),
        income_by_category: incomeByCategory.map(r => ({
          category_id: r.category_id,
          category:    r.category,
          total:       parseFloat(r.total),
        })),
        transactions: transactions.map(r => ({
          ...r,
          amount: parseFloat(r.amount),
        })),
      },
    });
  } catch (err) {
    console.error('reports/monthly GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error generating report.' });
  }
});

module.exports = router;

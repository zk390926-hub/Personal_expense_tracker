// routes/categories.js
// GET /api/categories  — returns all categories, optionally filtered by type.

'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../config/database');

// GET /api/categories?type=income|expense
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let sql    = 'SELECT id, name, type FROM categories';
    const params = [];

    if (type === 'income' || type === 'expense') {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY type, name';
    const [rows] = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('categories GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching categories.' });
  }
});

module.exports = router;

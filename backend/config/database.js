// config/database.js
// Creates and exports a mysql2 connection pool using environment variables.
// The pool reuses connections for efficiency and handles reconnects automatically.

'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'expense_tracker',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  // Return JS Date objects for DATE/DATETIME columns
  dateStrings:        false,
});

// Verify connectivity when the module is first loaded.
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected — database:', process.env.DB_NAME || 'expense_tracker');
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    console.error('    Check your .env file and ensure the MySQL server is running.');
  });

module.exports = pool;

-- ============================================================
-- sample_data.sql  –  Optional seed data for development
-- This file creates realistic sample transactions for testing.
-- Run AFTER schema.sql:
--   mysql -u root -p expense_tracker < database/sample_data.sql
-- ============================================================

USE expense_tracker;

-- Remove existing sample data (safe to re-run)
DELETE FROM transactions WHERE description LIKE '[SAMPLE]%';

-- ── October 2024 ──────────────────────────────────────────
-- Income
INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'income', 55000.00, id, '[SAMPLE] Monthly salary', '2024-10-01'
FROM categories WHERE name = 'Salary' AND type = 'income';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'income', 8500.00, id, '[SAMPLE] Freelance project payment', '2024-10-12'
FROM categories WHERE name = 'Freelance' AND type = 'income';

-- Expenses
INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 15000.00, id, '[SAMPLE] Monthly rent', '2024-10-01'
FROM categories WHERE name = 'Rent' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 4200.00, id, '[SAMPLE] Grocery shopping', '2024-10-05'
FROM categories WHERE name = 'Food' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 1800.00, id, '[SAMPLE] Electricity bill', '2024-10-08'
FROM categories WHERE name = 'Bills & Utilities' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 950.00, id, '[SAMPLE] Petrol', '2024-10-10'
FROM categories WHERE name = 'Transportation' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 2300.00, id, '[SAMPLE] Online shopping', '2024-10-14'
FROM categories WHERE name = 'Shopping' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 600.00, id, '[SAMPLE] Movie tickets', '2024-10-18'
FROM categories WHERE name = 'Entertainment' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 1200.00, id, '[SAMPLE] Doctor visit', '2024-10-22'
FROM categories WHERE name = 'Healthcare' AND type = 'expense';

-- ── September 2024 ────────────────────────────────────────
INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'income', 55000.00, id, '[SAMPLE] Monthly salary', '2024-09-01'
FROM categories WHERE name = 'Salary' AND type = 'income';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 15000.00, id, '[SAMPLE] Monthly rent', '2024-09-01'
FROM categories WHERE name = 'Rent' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 3800.00, id, '[SAMPLE] Food expenses', '2024-09-10'
FROM categories WHERE name = 'Food' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 2000.00, id, '[SAMPLE] Internet + phone bill', '2024-09-15'
FROM categories WHERE name = 'Bills & Utilities' AND type = 'expense';

INSERT INTO transactions (type, amount, category_id, description, transaction_date)
SELECT 'expense', 5500.00, id, '[SAMPLE] College fees', '2024-09-20'
FROM categories WHERE name = 'Education' AND type = 'expense';

-- ── Sample budgets for October 2024 ──────────────────────
INSERT IGNORE INTO budgets (month, year, category_id, amount)
VALUES (10, 2024, NULL, 40000.00);  -- Overall budget

INSERT IGNORE INTO budgets (month, year, category_id, amount)
SELECT 10, 2024, id, 5000.00
FROM categories WHERE name = 'Food' AND type = 'expense';

INSERT IGNORE INTO budgets (month, year, category_id, amount)
SELECT 10, 2024, id, 2000.00
FROM categories WHERE name = 'Entertainment' AND type = 'expense';

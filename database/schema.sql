-- ============================================================
-- Personal Expense Tracker - Database Schema
-- MySQL / MariaDB
-- Run: mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS expense_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE expense_tracker;

-- ============================================================
-- Table: categories
-- Stores predefined income and expense categories.
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  type       ENUM('income', 'expense') NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_name_type (name, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: transactions
-- Each row represents one income or expense entry.
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               INT            NOT NULL AUTO_INCREMENT,
  type             ENUM('income', 'expense') NOT NULL,
  amount           DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id      INT            NOT NULL,
  description      VARCHAR(255)   NOT NULL DEFAULT '',
  transaction_date DATE           NOT NULL,
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_type (type),
  INDEX idx_category_id (category_id),
  CONSTRAINT fk_transactions_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: budgets
-- Stores monthly overall budgets and per-category limits.
-- category_id NULL  → overall monthly budget for that month/year
-- category_id SET   → per-category limit for that month/year
-- The unique constraint prevents duplicate entries.
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id          INT            NOT NULL AUTO_INCREMENT,
  month       TINYINT        NOT NULL COMMENT '1-12',
  year        SMALLINT       NOT NULL,
  category_id INT            NULL     DEFAULT NULL COMMENT 'NULL for overall monthly budget',
  amount      DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Prevent duplicate overall budget per month/year
  UNIQUE KEY uq_budget_overall (month, year, category_id),
  CONSTRAINT fk_budgets_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed: Default Categories
-- ============================================================
INSERT IGNORE INTO categories (name, type) VALUES
  -- Income categories
  ('Salary',      'income'),
  ('Allowance',   'income'),
  ('Freelance',   'income'),
  ('Other Income','income'),
  -- Expense categories
  ('Food',              'expense'),
  ('Transportation',    'expense'),
  ('Shopping',          'expense'),
  ('Education',         'expense'),
  ('Bills & Utilities', 'expense'),
  ('Healthcare',        'expense'),
  ('Entertainment',     'expense'),
  ('Rent',              'expense'),
  ('Other',             'expense');

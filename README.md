# Personal Expense Tracker

A full-stack personal finance web application that helps you record income, manage daily expenses, categorize spending, monitor monthly savings, and understand where your money goes.

---

## Problem Statement

Managing personal finances manually is time-consuming and error-prone. Most people lack visibility into their spending patterns, which leads to poor budgeting decisions. This project provides a simple, organized tool to track income and expenses, analyze spending by category, and set monthly budget goals — all stored in a relational SQL database.

---

## Project Objectives

1. Allow users to record income and expense transactions with category, date, and description.
2. Provide a monthly dashboard showing income, expenses, savings, and savings rate.
3. Enable filtering, searching, editing, and deleting transactions.
4. Generate monthly reports with category breakdowns.
5. Support budget limits (overall and per category) with progress tracking and over-budget alerts.
6. Export transaction data to CSV for offline analysis.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Monthly totals, savings rate, category breakdown, 6-month trend chart, recent transactions |
| **Transactions** | Full CRUD, search, filter by type/category/date range, sort by date/amount, pagination |
| **Reports** | Monthly income vs expenses chart, category bars, full transaction list, CSV export |
| **Budgets** | Set overall and per-category limits, progress bars, over-budget warnings |
| **Categories** | 13 predefined categories (4 income, 9 expense), stored in SQL |
| **Validation** | Frontend and backend input validation, parameterized SQL queries |
| **Responsive** | Works on desktop, tablet, and mobile |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Charts | Chart.js 4 (CDN) |
| Backend | Node.js, Express.js |
| Database | MySQL 8 / MariaDB 10.6+ |
| ORM/Driver | mysql2 (promise-based) |
| Security | helmet, cors, parameterized queries |
| Dev tools | nodemon, dotenv |

---

## Project Folder Structure

```
personal-expense-tracker/
├── frontend/
│   ├── index.html              ← Dashboard
│   ├── pages/
│   │   ├── transactions.html
│   │   ├── reports.html
│   │   └── budget.html
│   ├── css/
│   │   ├── style.css
│   │   └── responsive.css
│   └── js/
│       ├── api.js              ← Shared API client + helpers
│       ├── app.js              ← Dashboard logic
│       ├── transactions.js
│       ├── reports.js
│       └── budget.js
├── backend/
│   ├── server.js               ← Express entry point
│   ├── config/
│   │   └── database.js         ← MySQL connection pool
│   ├── routes/
│   │   ├── transactions.js
│   │   ├── categories.js
│   │   ├── budgets.js
│   │   ├── dashboard.js
│   │   └── reports.js
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql              ← Tables + seed categories
│   └── sample_data.sql         ← Optional realistic test data
├── .gitignore
└── README.md
```

---

## System Architecture and Data Flow

```
Browser (HTML + CSS + JS)
        │  HTTP fetch (JSON)
        ▼
Express REST API (Node.js : 5000)
        │  mysql2 parameterized queries
        ▼
MySQL / MariaDB  (expense_tracker database)
```

1. The user opens a page in the browser.
2. The page JS calls `api.js` helper functions.
3. `api.js` sends HTTP requests to `http://localhost:5000/api/...`.
4. Express routes query the MySQL database.
5. The API returns JSON; the JS renders it in the DOM.

---

## Database Schema

### categories

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| name | VARCHAR(100) | |
| type | ENUM('income','expense') | |
| created_at | DATETIME | Default: NOW() |

Unique constraint on `(name, type)`.

### transactions

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| type | ENUM('income','expense') | |
| amount | DECIMAL(12,2) | > 0 |
| category_id | INT FK → categories.id | |
| description | VARCHAR(255) | |
| transaction_date | DATE | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### budgets

| Column | Type | Notes |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| month | TINYINT | 1–12 |
| year | SMALLINT | |
| category_id | INT FK → categories.id | NULL = overall budget |
| amount | DECIMAL(12,2) | > 0 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

Unique constraint on `(month, year, category_id)` prevents duplicates.

---

## Installation Prerequisites

- **Node.js** v18 or later — https://nodejs.org
- **MySQL** 8 or **MariaDB** 10.6+ — https://dev.mysql.com/downloads/
- A MySQL client (`mysql` CLI or MySQL Workbench)
- A static file server for the frontend (VS Code Live Server, or any HTTP server)

---

## Step-by-Step Setup

### 1. Clone / download the project

Place the project folder at a convenient location (e.g., `Desktop/Personal Expense Tracker`).

### 2. Create the MySQL database and tables

Open the MySQL CLI (replace `root` with your MySQL username if different):

```bash
mysql -u root -p < database/schema.sql
```

This creates the `expense_tracker` database, all three tables, and inserts the 13 default categories.

#### (Optional) Load sample data

```bash
mysql -u root -p expense_tracker < database/sample_data.sql
```

Sample transactions are labelled `[SAMPLE]` for easy identification.

### 3. Configure environment variables

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=expense_tracker
PORT=5000
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

> **Never commit `.env` to version control.**

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Start the backend

```bash
# Development (auto-restart on file changes)
npm run dev

# OR production
npm start
```

You should see:
```
✅  MySQL connected — database: expense_tracker
🚀  Expense Tracker API running at http://localhost:5000
```

### 6. Open the frontend

Open `frontend/index.html` using **VS Code Live Server** (right-click → Open with Live Server) or any local HTTP server.

> **Do not open `index.html` directly via `file://`** — the browser will block the API fetch calls due to CORS. Use a local server on port 5500 (or update `FRONTEND_ORIGIN` accordingly).

Alternatively with Node's `http-server`:
```bash
npx http-server frontend -p 5500
```

---

## API Endpoint Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/categories?type=income\|expense` | List categories |
| GET | `/transactions` | List transactions (with filters) |
| GET | `/transactions/:id` | Get single transaction |
| POST | `/transactions` | Create transaction |
| PUT | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |
| GET | `/dashboard?month=&year=` | Monthly summary |
| GET | `/reports/monthly?month=&year=` | Monthly report |
| GET | `/budgets?month=&year=` | List budgets for period |
| POST | `/budgets` | Create/update a budget |
| DELETE | `/budgets/:id` | Delete a budget |
| GET | `/health` | Health check |

### Transaction filter parameters (GET /transactions)

| Param | Description |
|---|---|
| `type` | `income` or `expense` |
| `category_id` | Filter by category |
| `start_date` | YYYY-MM-DD |
| `end_date` | YYYY-MM-DD |
| `search` | Description search |
| `sort_by` | `transaction_date` (default) or `amount` |
| `sort_order` | `asc` or `desc` |
| `page` | Page number |
| `limit` | Records per page (max 200) |

---

## Sample Calculations

Given a month with:
- Salary: ₹55,000
- Freelance: ₹8,500
- Rent: ₹15,000
- Food: ₹4,200
- Bills: ₹1,800
- Other expenses: ₹5,050

**Total income** = ₹55,000 + ₹8,500 = **₹63,500**

**Total expenses** = ₹15,000 + ₹4,200 + ₹1,800 + ₹5,050 = **₹26,050**

**Net savings** = ₹63,500 − ₹26,050 = **₹37,450**

**Savings rate** = (₹37,450 / ₹63,500) × 100 = **58.98%**

All calculations are performed in SQL on the server. The frontend never sends pre-calculated totals.

---

## Screenshots

*(Add screenshots after running the application)*

- [ ] Dashboard — stats cards, category breakdown, monthly chart
- [ ] Transactions — table with filters active
- [ ] Add Transaction — modal form
- [ ] Reports — monthly chart + category bars
- [ ] Budget — progress bars with over-budget warning

---

## Known Limitations

- Single-user application — no authentication or multi-user support.
- Currency is fixed to Indian Rupees (₹).
- Categories are predefined; the UI does not support creating custom categories (categories can be added directly in MySQL).
- The frontend must be served from a local HTTP server (not `file://`) due to browser CORS restrictions.
- No HTTPS in local development; add a reverse proxy (nginx, Caddy) before deploying.

## Future Enhancements

- User authentication and multi-user support
- Recurring transaction templates
- Income vs expense goal projections
- Custom category creation from the UI
- Dark mode toggle
- PWA / offline support
- Email or notification reminders for budget alerts

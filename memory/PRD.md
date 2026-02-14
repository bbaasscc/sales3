# Sales Dashboard PRD - Four Seasons Heating & Cooling

## Original Problem Statement
Sales performance dashboard for FSHAC salespeople, evolved into a full CRM with sales pipeline, lead management, and multi-user support.

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI, Pandas, PyJWT (auth)
- **Database**: MongoDB (leads, users, pipeline actions, client notes, schedules)
- **Auth**: JWT-based with bcrypt password hashing. @fshac.com domain restriction.

## User Roles
- **Admin**: Global view, salesperson comparison, user role management, can filter by salesperson
- **Salesperson**: Sees only their own leads, dashboard, follow-ups, and data

## 4-Module Structure

### Module 1 — DASHBOARD (view only)
- 5 color-coded blocks: My Money (green), How Can I Earn More? (amber), What Am I Selling? (blue), Closed Sales (purple)
- KPIs filtered by authenticated user (or admin's selected salesperson)
- Payments by install_date, SPIFF Breakdown, Charts, Sales table

### Module 2 — FOLLOW-UPS (pipeline + actions)
- Leads with pending follow-ups, priority system, overdue indicators
- 7-step "Closing Flow" with email + SMS templates
- Customizable schedule dates + notes per step

### Module 3 — DATA (full CRUD)
- All leads in searchable/filterable table
- Add new lead (email parser or manual), edit, delete
- **Import XLS** button: upload .xls/.xlsx file, leads auto-assigned to current user

### Module 4 — ADMIN (admin users only)
- Global Overview: Total leads, closed deals, revenue, commission, closing rate across all salespeople
- Comparison Charts: Revenue/Commission and Leads/Closed bars per salesperson
- Salesperson Comparison Table: Click name to filter entire dashboard
- User Management: View all users, change roles (admin/salesperson)

## API Endpoints
### Auth
- `POST /api/auth/register` — Self-registration (email @fshac.com, name, customer_number, password)
- `POST /api/auth/login` — Returns JWT token + user info
- `GET /api/auth/me` — Current user info
- `PUT /api/auth/user/{user_id}/role` — Admin: change user role

### Admin
- `GET /api/admin/salespeople` — List all users (admin only)
- `GET /api/admin/comparison` — Salesperson comparison stats (admin only)

### Dashboard & Leads
- `GET /api/dashboard/kpis` — KPIs (filtered by user, accepts salesperson_id for admin)
- `GET/POST /api/leads` — CRUD leads (filtered by user)
- `PUT/DELETE /api/leads/{id}` — Update/delete lead
- `POST /api/leads/import-xls` — Upload XLS, assign to current user
- `POST /api/leads/parse-email` — Parse dispatch email
- `POST /api/leads/import` — Re-import from Google Sheet

### Follow-ups & Pipeline
- `GET/POST /api/followup/action` — Pipeline step tracking
- `GET/POST /api/client/notes` — Priority, next follow-up, comments
- `GET/POST /api/pipeline/schedule` — Custom pipeline dates

## What's Been Implemented

### Feb 14, 2026 - Multi-User & Admin System
- [x] JWT authentication with bcrypt password hashing
- [x] Self-registration restricted to @fshac.com emails
- [x] User roles: admin and salesperson
- [x] Data isolation: salespeople see only their assigned leads
- [x] Admin panel with global stats and salesperson comparison
- [x] Admin dashboard filtering by salesperson
- [x] User management (role changes)
- [x] XLS file import per user
- [x] Logout functionality
- [x] All 53 existing leads assigned to Benjamin S. Cardarelli

### Feb 13, 2026 - Core Application
- [x] Full dashboard with 5 color-coded blocks
- [x] MongoDB as primary data source
- [x] 3-tab navigation: Dashboard | Follow-ups | Data
- [x] Sales pipeline with 7 steps, customizable dates/notes
- [x] Email (Outlook via mailto:) + SMS (clipboard) templates
- [x] Priority system (High/Med/Low) with overdue indicators
- [x] Lead CRUD: add (paste email parser), edit (auto-calc commission), delete
- [x] Auto-import from Google Sheet on first load
- [x] Client notes, pipeline schedule persistence in MongoDB

## Test Accounts
- **Admin**: admin@fshac.com / admin123
- **Salesperson**: benjamin@fshac.com / test123

## P1 — TODO
- [ ] Refactor App.js into component files (2000+ lines)
- [ ] Refactor server.py into modules
- [ ] Export data to CSV/PDF
- [ ] Improve mobile UX for Data tab

## P2 — BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking with progress bars
- [ ] Notifications / reminders

# Sales Dashboard PRD - Four Seasons Heating & Cooling

## Original Problem Statement
Sales performance dashboard for FSHAC salespeople, evolved into a full CRM with sales pipeline, lead management, and multi-user support.

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI, Pandas, PyJWT (auth)
- **Database**: MongoDB (leads, users, pipeline actions, client notes, schedules)
- **Auth**: JWT-based with bcrypt. Accepts @fshac.com and @gmail.com domains.

## User Roles
- **Admin** (bsanchezcar@gmail.com): Global view, salesperson comparison, user role management, filter by salesperson
- **Salesperson** (benjamin@fshac.com): Sees only their own leads, dashboard, follow-ups, and data

## 4-Tab Structure

### Tab 1 — DASHBOARD (view only)
- KPI cards: Revenue, Commission, Closed Deals, Leads, Closing Rate, Avg Ticket
- Payments by install_date, SPIFF Breakdown, Charts, Sales table
- Filtered by authenticated user (admins see all or filter by salesperson)

### Tab 2 — FOLLOW-UPS (pipeline + actions)
- Leads with pending follow-ups, priority system, overdue indicators
- 7-step "Closing Flow" with email + SMS templates
- Customizable schedule dates + notes per step

### Tab 3 — DATA (full CRUD)
- All leads in searchable/filterable table
- Add new lead (email parser or manual), edit, delete
- **Import XLS** button: upload .xls/.xlsx, leads auto-assigned to current user

### Tab 4 — ADMIN (admin users only)
- Global Overview: Total leads, closed deals, revenue, commission, closing rate
- Comparison Charts: Revenue/Commission and Leads/Closed per salesperson
- Salesperson Comparison Table: Click name to filter dashboard
- User Management: View users, change roles

## API Endpoints
### Auth
- `POST /api/auth/register` — Self-registration (@fshac.com or @gmail.com)
- `POST /api/auth/login` — Returns JWT token
- `GET /api/auth/me` — Current user info
- `PUT /api/auth/user/{user_id}/role` — Admin: change role

### Admin
- `GET /api/admin/salespeople` — List users (admin only)
- `GET /api/admin/comparison` — Salesperson stats (admin only)

### Dashboard & Leads
- `GET /api/dashboard/kpis` — KPIs (auto-filtered by user)
- `GET /api/leads` — List leads (auto-filtered by user)
- `POST /api/leads` — Create lead (auto-assigns to user)
- `PUT /api/leads/{id}` — Update lead (auth required)
- `DELETE /api/leads/{id}` — Delete lead (auth required)
- `POST /api/leads/import-xls` — Upload XLS (auth required)

### Follow-ups & Pipeline
- `GET/POST/DELETE /api/followup/action` — Pipeline step tracking
- `GET/POST /api/client/notes` — Priority, follow-up, comments
- `GET/POST /api/pipeline/schedule` — Custom pipeline dates

## What's Been Implemented

### Feb 14, 2026 - Multi-User & General Audit
- [x] JWT auth with bcrypt, self-registration
- [x] Admin: bsanchezcar@gmail.com / Benja123
- [x] Salesperson: benjamin@fshac.com / test123
- [x] Data isolation + fallback safety
- [x] Admin panel with global stats + comparison charts
- [x] XLS import per user
- [x] Field renamed: "Customer Number" → "Sales Number"
- [x] Auth protection on PUT/DELETE leads endpoints
- [x] Removed destructive auto-import from Google Sheet
- [x] "Update" button only refreshes data, no re-import
- [x] Cleaned test/garbage users from DB
- [x] All 53 leads assigned to Benjamin (22 SALE, 20 PENDING, 11 LOST)

### Feb 13, 2026 - Core Application
- [x] Full dashboard with KPI blocks
- [x] MongoDB as primary data source
- [x] 3-tab navigation + sales pipeline
- [x] Email + SMS templates
- [x] Priority system + overdue indicators
- [x] Lead CRUD with email parser
- [x] Client notes, pipeline schedules

## Test Accounts
- **Admin**: bsanchezcar@gmail.com / Benja123
- **Salesperson**: benjamin@fshac.com / test123

## Verified Data (Feb 14, 2026)
- Total Leads: 53 | SALE: 22 | PENDING: 20 | LOST: 11
- Revenue: $216,906 | Commission: $25,470.99 | Closing Rate: 41.5%

## Testing Status
- Iteration 10: 15/15 backend, all frontend flows verified
- Test file: /app/backend/tests/test_crm_comprehensive.py

## P1 — TODO
- [ ] Refactor App.js (2000+ lines) into component files
- [ ] Refactor server.py into modules
- [ ] Export data to CSV/PDF

## P2 — BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking with progress bars
- [ ] Notifications / reminders

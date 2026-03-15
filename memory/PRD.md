# Sales Management App - PRD

## Original Problem Statement
Sales dashboard application for a company with "Admin" and "Salesperson" roles. The app manages leads, tracks KPIs, handles commissions, and automates workflows.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Recharts + Shadcn/UI
- **Backend**: Python FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access (admin/salesperson)

## Code Structure
```
/app/backend/
  ├── server.py (entry point, router registration)
  ├── database.py (MongoDB connection)
  ├── models.py (Pydantic models)
  ├── auth.py (JWT auth)
  ├── utils.py (helpers)
  ├── routers/ (admin, auth_routes, dashboard, email_ingest, leads, pipeline, tasks)
  └── services/ (kpi_service, sync_service)
/app/frontend/src/
  ├── App.js (main app, state management)
  ├── components/ (DashboardTab, StatusTab, EarningsTab, SaleConversionModal, Modals, etc.)
  ├── pages/ (LoginPage, AdminPanel, AdminOverview)
  └── lib/constants.js
```

## User Personas
1. **Salesperson**: Manages own leads, tracks performance KPIs, views earnings
2. **Admin**: Company-wide overview, salespeople comparison, all data access, email ingest config

## What's Been Implemented

### Core Features (Complete)
- Role-based authentication (Admin, Salesperson)
- Salesperson Dashboard: Sales Metrics KPIs (closing rate, DPA, avg ticket), charts, closed sales table
- Status Tab: All Leads, Pipeline, Tasks sub-views with quick actions
- Earnings Tab: Financial info, commissions, SPIFFs breakdown
- Admin: Overview, Salespeople comparison, All Data, Email Ingest config
- Lead CRUD: Create, edit, delete, import XLS, parse email
- Conditional EditLeadModal: Appointment Info vs Sale Details based on status
- Sale Conversion Modal: Products, accessories, self-gen, promo code
- Email auto-ingestion from Gmail (IMAP polling every minute)
- Data standardization: Unit types dropdown, uppercase normalization
- Pipeline/Follow-up workflow with email/SMS templates (8-day closing flow)
- Pending Installation Reminder System (auto tasks)
- Remove from Pipeline button (without deleting lead)
- Auto-cleanup: Pipeline cleared when status changes from PENDING
- All extended fields saved correctly: additional_phones, products, sale_accessories, is_self_gen, promo_code

### Deployment Audit (Mar 2026)
- Full health check passed: All 3 users, all endpoints, all CRUD flows
- Data integrity: 168 leads, 0 orphan data, 0 non-PENDING in follow-ups
- KPIs verified: Admin totals = SP1 + SP2
- DB cleanup: 51 non-PENDING leads cleared from follow-up, orphan pipeline data removed

## Pending/Backlog

### P1
- [ ] Automatic Commission Calculation Rules
- [ ] Follow-up System for Sold Clients (upselling)

### P2
- [ ] Commission Calculator Tool (standalone)
- [ ] Notifications (real-time alerts)
- [ ] Export Data to CSV/Excel
- [ ] Gamification (badges, leaderboards)

### Refactoring
- [ ] Consolidate KPI calculation logic between kpi_service.py and admin.py

## Key API Endpoints
- `POST /api/auth/login` / `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/leads`
- `GET /api/dashboard/kpis`
- `GET /api/tasks` / `PUT /api/tasks/{id}/complete` / `PUT /api/tasks/{id}/dismiss`
- `POST /api/pipeline/remove-client`
- `GET/POST /api/email-ingest/config` / `POST /api/email-ingest/check-now`
- `GET /api/pay-periods`

## Test Credentials
- Admin: Bsanchezcar@gmail.com / Benja123
- Salesperson 1: Bcardarelli@fshac.com / Benja123
- Salesperson 2: Fbarbagallo@fshac.com / Franco123

## DB Collections
- users, leads, pending_tasks, pipeline_schedules, followup_actions, client_notes, email_ingest_config, excel_config

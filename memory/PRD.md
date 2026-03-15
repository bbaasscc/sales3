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
- Salesperson Dashboard: Sales Metrics KPIs, charts, closed sales table
- Status Tab: All Leads, Pipeline, Tasks views
- Earnings Tab: Financial info, commissions, SPIFFs
- Admin: Overview, Salespeople comparison, All Data, Email Ingest config
- Lead CRUD: Create, edit, delete, import XLS, parse email
- Conditional EditLeadModal: Appointment Info vs Sale Details based on status
- Sale Conversion Modal: Products, accessories, self-gen, promo code
- Email auto-ingestion from Gmail (IMAP polling)
- Data standardization: Unit types, uppercase normalization
- Pipeline/Follow-up workflow with email/SMS templates

### Recently Implemented (Feb 2026)
- **P0: Pending Installation Reminder System** (Tasks)
  - Auto-creates task when lead's install_date set to 'PENDING'
  - Auto-completes task when firm install date is set
  - Tasks view in StatusTab with Set Date, Call, Dismiss actions
  - Completed tasks section (collapsible)
  - Backend: /api/tasks endpoints (GET, PUT /complete, PUT /dismiss)
- **P1: Enhanced Status Tab**
  - Three sub-views: All Leads, Pipeline, Tasks
  - Quick action buttons: Call, Pipeline on lead rows
  - INSTALL badge for leads with pending installations
  - Red badge on Tasks tab showing active task count
- **P1: Additional Phones & Sale Data Fix**
  - Fixed LeadUpdate model to include: additional_phones, products, sale_accessories, is_self_gen, promo_code
  - These fields were being silently dropped before
- **Pipeline Cleanup & Auto-removal for Deploy**
  - Fixed: Only PENDING leads appear in follow-ups (was excluding only SALE before)
  - Auto-cleanup: When status changes from PENDING to any other status (SALE, LOST, CANCEL, etc.), follow_up_date is cleared and pipeline data removed automatically
  - DB cleanup: Cleared 51 non-PENDING leads from follow-up, removed 12 orphan schedules and 39 orphan actions
  - Backend: kpi_service.py follow-up filter changed from `status != 'SALE'` to `status == 'PENDING'`

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
- `GET/POST /api/email-ingest/config`
- `POST /api/email-ingest/check-now`

## Test Credentials
- Admin: Bsanchezcar@gmail.com / Benja123
- Salesperson 1: Bcardarelli@fshac.com / Benja123
- Salesperson 2: Fbarbagallo@fshac.com / Franco123

## DB Collections
- users, leads, pending_tasks, pipeline_schedules, pipeline_actions, client_notes, email_ingest_config, excel_config

# Sales Dashboard PRD

## Original Problem Statement
Sales dashboard application for a company with "Admin" and "Salesperson" roles, featuring role-based dashboards, lead management, and data tracking.

## Architecture
- **Frontend**: React, Tailwind CSS, Recharts, Shadcn/UI
- **Backend**: Python FastAPI, Pymongo, pandas
- **Database**: MongoDB Atlas
- **Sync**: Periodic auto-sync (5min) from production to preview seed file

## What's Implemented
- Multi-user auth (Admin, Salesperson roles)
- Salesperson dashboard with KPIs, charts, financial summaries
- Admin overview with company-wide aggregates
- Admin comparison table for salespeople ranking
- Data table with sorting, search, inline status editing
- Follow-ups tab with pipeline management
- Lead CRUD (create, edit, delete, import XLS)
- New statuses: Cancel Appt, Rescheduled, Credit Reject
- Auto data seeding and periodic sync
- Health endpoint for Kubernetes

## Bug Fixes Applied (Feb 26, 2026)
- **Default filter to "All Periods"**: Changed `payPeriod` init from `getCurrentPayPeriod()` to `"all"`
- **Quick filter logic fix**: Fixed `total_visits` not being filtered for "week"/"2weeks" filters due to `end_date` being None causing the condition to fall through to unfiltered branch
- **Cancel/Rescheduled date filtering**: Now also filtered by date range when a quick filter is active

## Pending Tasks
### P0
- Follow-up management (add/remove leads from follow-up list)

### P1
- Add Accessories/Promo Codes fields to lead modal
- "Pending" Installation Date option with reminders

### P2
- Follow-up for sold clients (upselling)
- Commission Calculator
- Notifications
- Export to CSV/Excel
- Gamification

## Credentials
- Admin: Bsanchezcar@gmail.com / Benja123
- Salesperson 1: Bcardarelli@fshac.com / Benja123
- Salesperson 2: Fbarbagallo@fshac.com / Franco123

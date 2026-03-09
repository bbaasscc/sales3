# Sales Dashboard PRD

## Original Problem Statement
Sales dashboard application for a company with "Admin" and "Salesperson" roles, featuring role-based dashboards, lead management, and data tracking.

## Architecture
- **Frontend**: React, Tailwind CSS, Recharts, Shadcn/UI
- **Backend**: Python FastAPI, Pymongo, pandas
- **Database**: MongoDB Atlas
- **Sync**: Periodic auto-sync (5min) from production to preview seed file
- **Email Ingest**: Gmail IMAP integration for automatic lead creation

## What's Implemented
- Multi-user auth (Admin, Salesperson roles)
- Salesperson dashboard with KPIs, charts, financial summaries
- Admin overview with company-wide aggregates
- Admin comparison table for salespeople ranking
- Data table with sorting, search, inline status editing
- Follow-ups tab with pipeline management
- Lead CRUD (create, edit, delete, import XLS)
- New statuses: Cancel Appt, Rescheduled, Credit Reject
- Auto data seeding and periodic sync (includes followup_actions and client_notes)
- Health endpoint for Kubernetes
- **Email Auto-Ingest**: Gmail IMAP polling, automatic lead creation from forwarded salesrequest emails, phone number correction, salesman# to salesperson mapping

## Bug Fixes Applied (Feb 26, 2026)
- Default filter to "All Periods"
- Quick filter logic fix (total_visits for week/2weeks)
- Cancel/Rescheduled date filtering
- Incomplete sales data fix (close_date fallback to visit_date)
- Production data sync from deployed app
- Avg ticket excludes $0 value sales

## Current Data State (Mar 9, 2026)
- Benjamin: 79 leads (28 SALE), Salesman #10149
- Franco: 79 leads (25 SALE), Salesman #10068
- Total: 158 leads
- Email config: uploadinglead@gmail.com, filter: salesrequest, 5min interval, ACTIVE

## Credentials
- Admin: Bsanchezcar@gmail.com / Benja123
- Salesperson 1: Bcardarelli@fshac.com / Benja123 (#10149)
- Salesperson 2: Fbarbagallo@fshac.com / Franco123 (#10068)
- Email Ingest: uploadinglead@gmail.com

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

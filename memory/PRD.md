# Sales Dashboard PRD

## Original Problem Statement
Create a web dashboard from an Excel file online that displays real-time salesperson statistics. The dashboard should read data from the central table and create all KPIs. Must update when the Excel file is modified and allow filtering by dates (week, 2 weeks, month, year) and bi-weekly pay periods.

## Architecture
- **Frontend**: React with Recharts for visualizations, Shadcn UI components, Tailwind CSS
- **Backend**: FastAPI with pandas for data processing
- **Database**: MongoDB for configuration storage
- **Data Source**: Google Sheets (public URL)

## User Personas
- Sales manager: Benjamin S. Cardarelli (Four Seasons Heating & Cooling)
- Needs quick insights on sales metrics, commissions, and follow-ups

## Dashboard Layout (5 Color-Coded Blocks) - Updated Feb 13, 2026

### Block 1 - MY MONEY (Green #ECFDF5, border #10B981)
- **My Performance**: 5 KPIs (Revenue, Commission, Closed Deals, Closing Rate, Avg Ticket)
- Thin separator
- **Payments (Install Date)**: 3 items (Installations, Commission Payable, SPIFF Included)
- All unified in one green container

### Block 2 - HOW CAN I EARN MORE? (Amber #FFFBEB, border #F59E0B)
- Under Book Price (5% Commission): Sales at 5%, Revenue, Commission
- SPIFF Breakdown: Total banner + brand cards + distribution chart

### Block 3 - WHAT AM I SELLING? (Blue #EFF6FF, border #3B82F6)
- 3 charts max: Unit Type (pie), Revenue by Type (bar), Monthly Revenue (area)
- Deal Status chart was removed to reduce scroll fatigue

### Block 4 - CLOSED SALES (Purple #F5F3FF, border #8B5CF6)
- Sales table with mobile-optimized columns (City hidden on lg, Unit hidden on xl)
- Click for detail modal

### Block 5 - ACTION REQUIRED (Red #FEF2F2, border #EF4444)
- Visually strongest block with gradient top bar, shadow, pulsing phone icon
- Badge count for total follow-ups
- Follow-ups table with urgency indicators

## Metric Calculation Logic (IMPORTANT)
- **Executive Summary** (Revenue, Commission, Closed Deals, Avg Ticket): Based on **close_date**
- **Leads**: Based on **visit_date** within period (still calculated, removed from display)
- **Closing Rate**: Closed Deals (from leads with SALE status) / Total Leads
- **Commission Payment**: Based on **install_date** (when commission is actually paid)
- **Follow-ups**: Leads with visit_date in period, status != SALE

## What's Been Implemented

### Phase 1-3: Initial MVP through Branding (Complete)
- Backend Excel/Google Sheets parsing, KPI calculations, date filtering
- Frontend dashboard with charts, tables, modals
- Four Seasons branding, mobile responsive design

### Phase 4: Metric Restructuring (Feb 12-13, 2026) - Complete
- Executive Summary based on close_date
- Commission Payment section based on install_date
- Leads/Closing Rate based on visit_date

### Phase 5: Visual Block Redesign (Feb 13, 2026) - Complete
- [x] 5 color-coded blocks with distinct backgrounds and left borders
- [x] Block 1 merged: Performance KPIs + Payments in one green container
- [x] Block 2 motivational title: "How Can I Earn More?"
- [x] Block 3 reduced to 3 charts (removed Deal Status)
- [x] Block 4 mobile-optimized table columns
- [x] Block 5 visually strongest: gradient bar, pulsing icon, badge count, shadow
- [x] Removed Leads KPI from display, removed Revenue from Payments section
- [x] Wider spacing between blocks (space-y-8 sm:space-y-10)

## P0 Features (Critical) - ALL COMPLETE
- [x] All 5 blocks with visual differentiation
- [x] Data parsing from Google Sheets
- [x] All KPI calculations
- [x] Date filtering (Pay Period + Quick filters)
- [x] Company branding + Mobile responsiveness
- [x] Interactive modals (Sales + Follow-ups)

## P1 Features (Important) - TODO
- [ ] Export data to CSV/PDF
- [ ] Custom date range picker
- [ ] Email notifications for urgent follow-ups

## P2 Features (Nice to Have) - BACKLOG
- [ ] Comparison between periods (YoY, MoM)
- [ ] Goal tracking with progress bars
- [ ] Multiple salesperson support
- [ ] Dark mode
- [ ] Refactor App.js into smaller components
- [ ] Refactor server.py into smaller functions

## Known Issues - ALL RESOLVED
- [x] Fixed "Truth value of Series is ambiguous" error
- [x] Fixed Pay Period filter timezone issue
- [x] Fixed Follow-ups not showing with period filter

## Testing Status (Feb 13, 2026)
- Backend: 100% (14 API tests passed)
- Frontend: 100% (All 5 blocks, modals, filters, buttons working)
- Test reports: /app/test_reports/iteration_5.json, iteration_6.json

## API Endpoints
- `GET /api/dashboard/kpis` - Main KPI endpoint (params: date_filter, pay_period)
- `POST /api/config/excel` - Set Excel URL
- `GET /api/config/excel` - Get Excel URL
- `GET /api/pay-periods` - List pay periods
- `POST /api/dashboard/refresh` - Refresh data

## Branding
- **Company**: Four Seasons Heating & Cooling
- **Colors**: Red (#C62828), Navy (#1E3A5F), White, Light Gray (#F5F5F5)
- **Block Colors**: Green, Amber, Blue, Purple, Red
- **Salesperson**: Benjamin S. Cardarelli

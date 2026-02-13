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

## Core Requirements
1. **KPI Display**: Total Revenue, Commission, Closed Deals, Closing Rate, Leads, Avg Ticket
2. **Commission Payment Section**: Based on install_date (when commission is paid)
3. **Under Book Price**: Sales at 5% commission rate
4. **SPIFF Breakdown**: By product (APCO X, Samsung, Mitsubishi, Surge Protector, Duct Cleaning)
5. **Pending Follow-Ups**: With urgency indicators and client details modal
6. **Sales This Period**: Clickable with detail modal
7. **Date Filtering**: Pay Period (bi-weekly based on install date), Quick filters

## Metric Calculation Logic (IMPORTANT)
- **Executive Summary** (Revenue, Commission, Closed Deals, Avg Ticket): Based on **close_date**
- **Leads**: Based on **visit_date** within period
- **Closing Rate**: Closed Deals (from leads with SALE status) / Total Leads
- **Commission Payment**: Based on **install_date** (when commission is actually paid)
- **Follow-ups**: Leads with visit_date in period, status != SALE

## What's Been Implemented (Feb 2026)

### Phase 1 - Initial MVP
- [x] Backend Excel/Google Sheets parsing with pandas
- [x] KPI calculation endpoint with date filtering
- [x] Frontend dashboard with KPI cards
- [x] Interactive charts (Pie, Bar, Area)
- [x] Sales records table
- [x] Refresh button with toast notifications

### Phase 2 - Enhancements
- [x] Pay Period filter (bi-weekly based on install date)
- [x] SPIFF Commission tracking by product
- [x] Under Book Price (5%) section
- [x] Follow-up section with urgency color-coding
- [x] Monthly trend chart in chronological order
- [x] Settings dialog with Google Sheet connection

### Phase 3 - Branding & UX
- [x] Four Seasons logo in header
- [x] Fixed header layout - filters centered, buttons on right
- [x] Mobile responsive design (iPhone/Samsung)
- [x] Abbreviated name "B. Cardarelli" for mobile views

### Phase 4 - Metric Restructuring (Feb 12-13, 2026)
- [x] Executive Summary based on close_date
- [x] NEW: Commission Payment section based on install_date
- [x] Leads/Closing Rate based on visit_date
- [x] Sales This Period with clickable detail modal
- [x] Follow-ups filtered by visit_date
- [x] Commission breakdown in sale modal (Base + SPIFF)
- [x] Fixed duplicate column handling in pandas

## P0 Features (Critical) - COMPLETE
- [x] Data parsing from Google Sheets
- [x] All KPI calculations
- [x] Dashboard display
- [x] Date filtering (Pay Period + Quick filters)
- [x] Company branding
- [x] Mobile responsiveness
- [x] Commission Payment section

## P1 Features (Important) - TODO
- [ ] Export data to CSV/PDF
- [ ] Custom date range picker (specific start/end dates)
- [ ] Email notifications for urgent follow-ups

## P2 Features (Nice to Have) - BACKLOG
- [ ] Comparison between periods (YoY, MoM)
- [ ] Goal tracking with progress bars
- [ ] Multiple salesperson support
- [ ] Dark mode

## Known Issues - RESOLVED
- [x] Fixed "Truth value of Series is ambiguous" error (duplicate columns)
- [x] Fixed Pay Period filter not working (end_date timezone issue)
- [x] Fixed Follow-ups not showing in period filter (was using install_date)

## API Endpoints
- `GET /api/` - Health check
- `GET /api/dashboard/kpis` - Main KPI endpoint
  - Query params: `date_filter`, `pay_period`
- `GET /api/config/excel` - Get current Excel URL
- `POST /api/config/excel` - Set Excel URL

## File Structure
```
/app
├── backend/
│   ├── server.py          # FastAPI backend (700+ lines)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component (1100+ lines)
│   │   ├── index.css      # Global styles
│   │   └── components/ui/ # Shadcn components
│   └── package.json
└── memory/
    └── PRD.md             # This file
```

## Branding
- **Company**: Four Seasons Heating & Cooling
- **Colors**: Red (#C62828), White, Dark Gray (#374151)
- **Salesperson**: Benjamin S. Cardarelli

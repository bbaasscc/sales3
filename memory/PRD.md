# Sales Dashboard PRD

## Original Problem Statement
Create a web dashboard from an Excel file online that displays real-time salesperson statistics. The dashboard should read data from the central table and create all KPIs. Must update when the Excel file is modified and allow filtering by dates (week, 2 weeks, month, year) and bi-weekly pay periods.

## Architecture
- **Frontend**: React with Recharts for visualizations, Shadcn UI components
- **Backend**: FastAPI with pandas/openpyxl for Excel parsing
- **Database**: MongoDB for configuration storage
- **Data Source**: Google Sheets (public URL)

## User Personas
- Sales managers tracking HVAC salesperson performance (Benjamin S. Cardarelli)
- Company administrators needing quick insights on sales metrics

## Core Requirements (Static)
1. KPI Display: Total Revenue, Commission, SPIFF Commission, Total Commission, Avg Commission %
2. Performance Metrics: Closed Deals, Closing Rate, Average Ticket, Total Visits
3. Unit Type Analysis: Count and revenue by unit type
4. Date Filtering: Week, 2 weeks, month, year, all time
5. Pay Period Filtering: Bi-weekly periods based on install date
6. Branding: Four Seasons Heating & Cooling logo, colors (Red #C62828, White, Dark Gray)
7. Responsiveness: Mobile (iPhone/Samsung) and Tablet compatible

## What's Been Implemented (Feb 2026)
### Phase 1 (Initial MVP)
- [x] Backend Excel parsing with pandas/openpyxl
- [x] KPI calculation endpoint with date filtering
- [x] Frontend dashboard with KPI cards
- [x] Interactive charts (Pie, Bar, Area)
- [x] Sales records table
- [x] Refresh button with toast notifications

### Phase 2 (Enhancements)
- [x] Pay Period filter (bi-weekly based on install date)
- [x] SPIFF Commission tracking by product (APCO X, Samsung, Mitsubishi, Surge Protector, Duct Cleaning)
- [x] Price Margin (5%) section with dedicated metrics
- [x] Follow-up section with urgency color-coding
- [x] Monthly trend chart in chronological order
- [x] Settings dialog with Google Sheet connection

### Phase 3 (Feb 8, 2026) - Branding & UX
- [x] Four Seasons logo in header (from company URL)
- [x] Fixed header layout - filters centered, buttons on right (no overlap)
- [x] Mobile responsive header with collapsible filters
- [x] Abbreviated name "B. Cardarelli" for mobile views
- [x] Backend cleanup (removed avg_sales_cycle - already clean)

## P0 Features (Critical) - COMPLETE
- [x] Excel/Google Sheets data parsing
- [x] KPI calculations
- [x] Dashboard display
- [x] Date filtering
- [x] Pay period filtering
- [x] Company branding
- [x] Mobile responsiveness

## P1 Features (Important)
- [ ] Export data to CSV/PDF
- [ ] Custom date range picker (specific start/end dates)

## P2 Features (Nice to Have)
- [ ] Email notifications for targets
- [ ] Comparison between periods
- [ ] Goal tracking
- [ ] Multiple salesperson support

## Next Tasks
1. Add export functionality (CSV/PDF)
2. Add data caching to improve load times
3. Custom date range picker

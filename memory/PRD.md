# Sales Dashboard PRD

## Original Problem Statement
Create a web dashboard from an Excel file online that displays real-time salesperson statistics. The dashboard should read data from the central table and create all KPIs. Must update when the Excel file is modified and allow filtering by dates (week, 2 weeks, month, year).

## Architecture
- **Frontend**: React with Recharts for visualizations, Shadcn UI components
- **Backend**: FastAPI with pandas/openpyxl for Excel parsing
- **Database**: MongoDB for configuration storage
- **Data Source**: Excel file from public URL

## User Personas
- Sales managers tracking HVAC salesperson performance
- Company administrators needing quick insights on sales metrics

## Core Requirements (Static)
1. KPI Display: Total Revenue, Total Commission, Closed Deals, Closing Rate, Average Ticket, Total Visits, Avg Sales Cycle Days, Price Margin (5%)
2. Unit Type Analysis: Count and revenue by unit type
3. Date Filtering: Week, 2 weeks, month, year, all time
4. Manual Refresh: Button to reload data from Excel

## What's Been Implemented (Jan 2026)
- [x] Backend Excel parsing with pandas/openpyxl
- [x] KPI calculation endpoint with date filtering
- [x] Frontend dashboard with 8 KPI cards
- [x] 4 Interactive charts (Pie, Bar, Area charts)
- [x] Sales records table
- [x] Date filter dropdown
- [x] Refresh button with toast notifications
- [x] Modern minimal light theme design (Manrope/DM Sans/JetBrains Mono fonts)

## P0 Features (Critical)
- [x] Excel data parsing
- [x] KPI calculations
- [x] Dashboard display
- [x] Date filtering

## P1 Features (Important)
- [ ] Export data to CSV/PDF
- [ ] Custom date range picker (specific start/end dates)
- [ ] Multiple salesperson support

## P2 Features (Nice to Have)
- [ ] Email notifications for targets
- [ ] Comparison between periods
- [ ] Goal tracking

## Next Tasks
1. Add custom date range picker for specific date filtering
2. Add export functionality (CSV/PDF)
3. Add data caching to improve load times
4. Consider adding more detailed drill-down views

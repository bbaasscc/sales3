# Sales Dashboard PRD

## Original Problem Statement
Create a web dashboard from an Excel file online that displays real-time salesperson statistics for Four Seasons Heating & Cooling.

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI, Pandas
- **Database**: MongoDB (config + follow-up action tracking)
- **Data Source**: Google Sheets (public URL)

## Dashboard Layout (5 Color-Coded Blocks)
1. **MY MONEY** (Green): 5 KPIs + 3 Payment items (unified)
2. **HOW CAN I EARN MORE?** (Amber): Under Book Price + SPIFF Breakdown
3. **WHAT AM I SELLING?** (Blue): 3 charts (Unit Type, Revenue, Monthly)
4. **CLOSED SALES** (Purple): Table with detail modals
5. **ACTION REQUIRED** (Red): Follow-ups with Email/SMS action buttons

## What's Been Implemented

### Phase 1-4: Core Dashboard (Complete)
- All KPI calculations, date filtering, pay periods, branding, mobile responsive

### Phase 5: Visual Block Redesign (Feb 13, 2026)
- 5 color-coded blocks with distinct backgrounds and titles

### Phase 6: Quality Fixes (Feb 13, 2026)
- Money formatting (2 decimal places), floating point fix
- Mobile responsive payments section, .gitignore cleanup
- Follow-up days calculation fix (timezone issue)

### Phase 7: Email/SMS Follow-up Actions (Feb 13, 2026)
- [x] 4 pre-written email templates (Thank You, Follow Up, $200 Discount, Personal Touch)
- [x] 4 pre-written SMS templates (Thank You, Follow Up, $200 Discount, Strong Close)
- [x] Email opens Outlook via mailto: with pre-filled subject + body
- [x] SMS copies to clipboard for easy paste
- [x] Action tracking in MongoDB (records which templates sent to which client)
- [x] Green checkmarks on sent templates, count badges on buttons
- [x] Templates auto-fill client's first name (ALLCAPS -> Title Case)

## API Endpoints
- `GET /api/dashboard/kpis` - Main KPI endpoint
- `POST /api/config/excel` - Set Excel URL
- `GET /api/followup/actions` - Get all follow-up action records
- `POST /api/followup/action` - Record email/SMS sent
- `DELETE /api/followup/action` - Remove action record

## P1 Features - TODO
- [ ] Export data to CSV/PDF
- [ ] Custom date range picker

## P2 Features - BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking with progress bars
- [ ] Multiple salesperson support
- [ ] Refactor App.js into smaller components

## Testing Status (Feb 13, 2026)
- Iteration 8: Backend 100% (9/9), Frontend 100%
- All previous iterations passed

## Branding
- **Company**: Four Seasons Heating & Cooling
- **Salesperson**: Benjamin S. Cardarelli
- **Block Colors**: Green, Amber, Blue, Purple, Red

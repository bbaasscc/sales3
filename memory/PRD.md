# Sales Dashboard PRD - Four Seasons Heating & Cooling

## Original Problem Statement
Sales performance dashboard for Benjamin S. Cardarelli with live data from Google Sheets, evolved into a full CRM with sales pipeline and lead management.

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI, Pandas
- **Database**: MongoDB (leads, pipeline actions, client notes, schedules)
- **Data Source**: Google Sheets (initial import) → MongoDB (primary)

## 3-Module Structure

### Module 1 — DASHBOARD (view only)
- 5 color-coded blocks: My Money (green), How Can I Earn More? (amber), What Am I Selling? (blue), Closed Sales (purple)
- KPIs: Revenue, Commission, Closed Deals, Closing Rate, Avg Ticket
- Payments by install_date: Installations, Commission Payable, SPIFF Included
- Under Book Price (5%), SPIFF Breakdown by brand, Charts (3 max), Sales table

### Module 2 — FOLLOW-UPS (pipeline + actions)
- Leads with pending follow-ups, priority (High/Med/Low), "Since Visit" days with overdue indicators
- Pipeline: 7-step "Closing Flow" (Day 0/2/4/6/8) with email + SMS templates
- Customizable schedule dates + notes per step
- Checkmark toggles (independent of send/copy)
- Client detail modal: dates, pipeline status, notes, next follow-up

### Module 3 — DATA (full CRUD)
- All 53+ leads in searchable/filterable table
- Status filters: All, SALE, PENDING, LOST
- Click to edit ALL fields: commission auto-calculated (Ticket × % + SPIFFs)
- Add new lead: paste dispatch email → auto-parse, or manual entry (minimal fields)
- Delete with confirmation
- SPIFF details (APCO X, Samsung, Mitsubishi, Surge, Duct, Self Gen Mits)

## Sales Pipeline (HVAC Post-Visit Closing Flow)
- Day 0: Email (Positioning) + SMS (Reinforcement)
- Day 2: Email (Soft Close)
- Day 4: SMS (Trigger) + Email (Incentive $200)
- Day 6: SMS (Decision Message)
- Day 8: Email (Final Push)

## Key Business Logic
- **Executive Summary**: based on close_date
- **Leads/Closing Rate**: based on visit_date
- **Commission Payment**: based on install_date
- **Commission $** = (Ticket Value × Commission %) + sum(SPIFF details)
- **Follow-ups**: leads with visit_date in period, status ≠ SALE

## API Endpoints
- `GET /api/dashboard/kpis` — KPIs (auto-imports from Sheet if MongoDB empty)
- `GET/POST /api/leads` — CRUD leads
- `PUT/DELETE /api/leads/{id}` — Update/delete lead
- `POST /api/leads/parse-email` — Parse dispatch email
- `POST /api/leads/import` — Re-import from Google Sheet
- `GET/POST /api/followup/action` — Pipeline step tracking
- `GET/POST /api/client/notes` — Priority, next follow-up, comments
- `GET/POST /api/pipeline/schedule` — Custom pipeline dates

## What's Been Implemented (Feb 13, 2026)
- [x] Full dashboard with 5 color-coded blocks
- [x] MongoDB as primary data source (53 leads imported)
- [x] 3-tab navigation: Dashboard | Follow-ups | Data
- [x] Sales pipeline with 7 steps, customizable dates/notes
- [x] Email (Outlook via mailto:) + SMS (clipboard) templates
- [x] Priority system (High/Med/Low) with overdue indicators
- [x] Lead CRUD: add (paste email parser), edit (auto-calc commission), delete
- [x] Auto-import from Google Sheet on first load
- [x] Money formatting (2 decimals), responsive mobile design
- [x] Client notes, pipeline schedule persistence in MongoDB

## P1 — TODO
- [ ] Export data to CSV/PDF
- [ ] Improve mobile UX for Data tab

## P2 — BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking with progress bars
- [ ] Multiple salesperson support
- [ ] Refactor App.js into component files

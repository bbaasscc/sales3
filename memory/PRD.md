# Sales Dashboard PRD - Four Seasons Heating & Cooling

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI (modular), PyJWT, Pandas
- **Database**: MongoDB
- **Auth**: JWT + bcrypt

## Backend Structure
```
backend/
  server.py          (606 lines) Entry point + leads/dashboard/import routes
  database.py        (11 lines) MongoDB connection
  auth.py            (55 lines) JWT utilities + user dependencies
  models.py          (96 lines) All Pydantic models
  routers/
    auth_routes.py   (53 lines) Register, login, me, role update
    admin.py         (166 lines) Salespeople list, comparison + ranking
    pipeline.py      (81 lines) Follow-up actions, client notes, schedules
```

## Frontend Structure
```
src/
  App.js              (580 lines) Auth wrapper + MainDashboard orchestrator
  lib/constants.js     Brand colors, pipeline steps, pay periods
  components/
    shared.js          SummaryCard, ChartCard, SectionHeader, SpiffBrandCard
    DashboardTab.jsx   Salesperson dashboard (Blocks 1-4)
    FollowupsTab.jsx   Follow-ups pipeline
    DataTab.jsx        Data table with CRUD
    Modals.jsx         All modal components (7 modals)
  pages/
    LoginPage.js       Login/Register
    AdminPanel.js      Admin Salespeople ranking + User Management
    AdminOverview.js   Admin Overview + equipment + accessories
```

## Users
| Email | Role | Pass |
|---|---|---|
| bsanchezcar@gmail.com | admin | Benja123 |
| bcardarelli@fshac.com | salesperson | Benja123 |
| fbarbagallo@fshac.com | salesperson | Franco123 |

## Salesperson (3 tabs): Dashboard | Follow-ups | Data
- **Dashboard**: My Money KPIs, Payments, SPIFF Breakdown, What Am I Selling (charts), Closed Sales table
- **Follow-ups**: Action Required pipeline, Pipeline Complete, Client Detail modal with notes
- **Data**: Search, status filters, New Lead, Import XLS, Edit Lead modal

## Admin (3 tabs): Overview | Salespeople | All Data
- **Overview**: Company Totals, Key Rates (R%, Avg Ticket, GP%, PM Jobs, PM%), Lead Status pie, Equipment Revenue + Breakdown, Accessories Sold
- **Salespeople**: Full ranking table (Overall, R%, Sales, Avg Ticket, Net Value, Total Jobs, PM Jobs, GP%, PM%), User Management
- **All Data**: All leads with Salesperson column

## Data
- 53 leads total: 23 SALE, 19 PENDING, 11 LOST
- Benjamin S. Cardarelli: all leads
- Franco Barbagallo: 0 leads

## Completed
- [x] JWT auth with role-based access
- [x] Admin/salesperson separate experiences
- [x] Data isolation per salesperson
- [x] Frontend refactored (App.js 2160→580 lines)
- [x] Backend refactored into modules (server.py 1435→606 lines)
- [x] Admin ranking with all metrics + rank badges
- [x] Admin equipment types + accessories
- [x] Comprehensive testing: 100% pass (28 backend + full frontend)
- [x] Added /health endpoint for Kubernetes deployment (Feb 2026)
- [x] Auto-seed on startup: seed_data.json populates empty Atlas DB on deploy (Feb 2026)

## P1 TODO
- [ ] Commission Calculator
- [ ] Export CSV/PDF

## P2 BACKLOG
- [ ] Notifications/reminders
- [ ] Gamification (badges/leaderboards)

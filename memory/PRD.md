# Sales Dashboard PRD - Four Seasons Heating & Cooling

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI (modular), PyJWT, Pandas
- **Database**: MongoDB (leads, users, goals, pipeline actions, client notes, schedules)
- **Auth**: JWT + bcrypt

## Backend Structure (Refactored Feb 14, 2026)
```
backend/
  server.py          Entry point + leads/dashboard/import routes
  database.py        MongoDB connection
  auth.py            JWT utilities + user dependencies
  models.py          All Pydantic models (including GoalCreate)
  routers/
    auth_routes.py   Register, login, me, role update
    admin.py         Salespeople list, comparison + ranking
    pipeline.py      Follow-up actions, client notes, schedules
    goals.py         Goals CRUD + period comparison
```

## Frontend Component Architecture
```
src/
  App.js              Auth wrapper + MainDashboard orchestrator
  lib/constants.js     Brand colors, pipeline steps, pay periods
  components/
    shared.js          SummaryCard, ChartCard, SectionHeader, SpiffBrandCard
    DashboardTab.jsx   Salesperson dashboard (Blocks 1-4)
    FollowupsTab.jsx   Follow-ups pipeline
    GoalsTab.jsx       NEW: Goals + Period Comparison
    DataTab.jsx        Data table with CRUD
    Modals.jsx         All modal components
  pages/
    LoginPage.js       Login/Register
    AdminPanel.js      Admin Salespeople ranking
    AdminOverview.js   Admin Overview + equipment + accessories
```

## Users
| Email | Role | Pass |
|---|---|---|
| bsanchezcar@gmail.com | admin | Benja123 |
| bcardarelli@fshac.com | salesperson | Benja123 |
| fbarbagallo@fshac.com | salesperson | Franco123 |

## Salesperson Tabs: Dashboard | Follow-ups | Goals | Data
- **Goals tab**: Set personal goals (Revenue, Deals, Commission) per pay period. Progress rings. Period comparison with delta indicators vs previous period.

## Admin Tabs: Overview | Salespeople | All Data
- **Overview**: Company totals, key rates, lead status, equipment revenue/breakdown, accessories
- **Salespeople**: Full ranking table with R%, Sales, Avg Ticket, Net Value, Total Jobs, PM Jobs, GP%, PM%

## Completed
- [x] JWT auth with role-based access
- [x] Admin/salesperson separate experiences
- [x] Data isolation per salesperson
- [x] Frontend refactored (~580 lines App.js)
- [x] Backend refactored into modules (Feb 14, 2026)
- [x] Admin ranking with all metrics + rank badges
- [x] Admin equipment types + accessories
- [x] Goals & Period Comparison tab for salespeople (Feb 14, 2026)

## P1 TODO
- [ ] Export CSV/PDF

## P2 BACKLOG
- [ ] Notifications/reminders
- [ ] Goal history across periods

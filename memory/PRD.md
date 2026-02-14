# Sales Dashboard PRD - Four Seasons Heating & Cooling

## Architecture
- **Frontend**: React, Recharts, Shadcn UI, Tailwind CSS
- **Backend**: FastAPI, Pandas, PyJWT
- **Database**: MongoDB (leads, users, pipeline actions, client notes, schedules)
- **Auth**: JWT + bcrypt. Domains: @fshac.com, @gmail.com

## Users
| Email | Name | Role | Pass |
|---|---|---|---|
| bsanchezcar@gmail.com | Benjamin Sanchez | admin | Benja123 |
| bcardarelli@fshac.com | Benjamin S. Cardarelli | salesperson | Benja123 |
| fbarbagallo@fshac.com | Franco Barbagallo | salesperson | Franco123 |

## Admin Experience
- **Tabs**: Overview | Salespeople | All Data
- **Overview**: Company-level KPIs, Revenue/Commission charts, Leads/Conversions charts, Salesperson Performance ranking table
- **Salespeople**: User management, role changes
- **All Data**: All leads with "Salesperson" column, full search/filter/CRUD
- Can click salesperson name -> see their specific dashboard

## Salesperson Experience
- **Tabs**: Dashboard | Follow-ups | Data
- **Dashboard**: My Money, How Can I Earn More, What Am I Selling, Closed Sales
- **Follow-ups**: Pipeline with 7 steps, email/SMS templates, priority/overdue
- **Data**: Their own leads, search/filter, New Lead, Import XLS

## Data
- Benjamin: 53 leads (22 SALE, 20 PENDING, 11 LOST) - $216,906 revenue
- Franco: 0 leads (new)

## Frontend Component Architecture (Refactored Feb 14, 2026)
```
src/
  App.js               (~580 lines) Auth wrapper + MainDashboard orchestrator
  lib/
    constants.js        Brand colors, pipeline steps, pay periods, helpers
  components/
    shared.js           SummaryCard, ChartCard, SectionHeader, SpiffBrandCard
    DashboardTab.jsx    Salesperson dashboard (Blocks 1-4: Money, Earn, Selling, Sales)
    FollowupsTab.jsx    Follow-ups pipeline (Action Required + Pipeline Complete)
    DataTab.jsx         Data table with search/filter/CRUD/import
    Modals.jsx          PipelineModal, NewLeadModal, DeleteConfirmModal,
                        ClientDetailModal, SaleDetailModal, InstallationsModal, EditLeadModal
  pages/
    LoginPage.js        Login/Register
    AdminPanel.js       Admin Salespeople tab
    AdminOverview.js    Admin Overview tab
```

## Completed
- [x] JWT auth with role-based access
- [x] Admin overview with company KPIs + comparison charts
- [x] Separate admin/salesperson experiences
- [x] Data isolation (salespeople see only their leads)
- [x] XLS import per user
- [x] Auth on destructive endpoints (PUT/DELETE leads)
- [x] All leads assigned to correct salesperson
- [x] Removed obsolete Data Source settings modal (Feb 14, 2026)
- [x] Frontend refactored: App.js from ~2160 to ~580 lines (Feb 14, 2026)

## P1 TODO
- [ ] Refactor server.py into modules (routers, models, services)
- [ ] Export CSV/PDF

## P2 BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking
- [ ] Notifications/reminders

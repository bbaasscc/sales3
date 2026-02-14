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
- **Overview**: Company-level KPIs (Revenue, Commission, Closed, Total Leads, Lost), Key Rates (R%, Access %, Avg Ticket, GP%, PM Jobs, PM%), Lead Status pie chart, Equipment Revenue chart + Breakdown table, Accessories Sold (APCO X, Samsung, Mitsubishi, Surge Protector, Duct Cleaning, Self Gen Mits)
- **Salespeople**: Full ranking table with columns: Overall Rank, Salesperson, R% + Rank, Access % + Rank, Sales + Rank, Avg Ticket + Rank, Net Value + Rank, Total Jobs + Rank, PM Jobs, GP % + Rank, PM % + Rank. User Management section.
- **All Data**: All leads with "Salesperson" column, full search/filter/CRUD
- Can click salesperson name -> see their specific dashboard

## Salesperson Experience
- **Tabs**: Dashboard | Follow-ups | Data
- **Dashboard**: My Money, How Can I Earn More, What Am I Selling, Closed Sales
- **Follow-ups**: Pipeline with 7 steps, email/SMS templates, priority/overdue
- **Data**: Their own leads, search/filter, New Lead, Import XLS

## Key Metrics
- **R%** = Closing Rate (closed/total * 100)
- **Access %** = Non-lost leads rate ((total - lost) / total * 100)
- **GP %** = Average commission percentage across sales
- **PM** = Price Margin = Under Book Price = 5% commission jobs
- **PM %** = PM jobs / total sales * 100
- **Overall Rank** = Average of all individual metric ranks

## Frontend Component Architecture
```
src/
  App.js               (~580 lines) Auth wrapper + MainDashboard orchestrator
  lib/constants.js      Brand colors, pipeline steps, pay periods, helpers
  components/
    shared.js           SummaryCard, ChartCard, SectionHeader, SpiffBrandCard
    DashboardTab.jsx    Salesperson dashboard (Blocks 1-4)
    FollowupsTab.jsx    Follow-ups pipeline
    DataTab.jsx         Data table with search/filter/CRUD/import
    Modals.jsx          All modal components (7 modals)
  pages/
    LoginPage.js        Login/Register
    AdminPanel.js       Admin Salespeople ranking + User Management
    AdminOverview.js    Admin Overview (company totals + key rates + pie)
```

## Completed
- [x] JWT auth with role-based access
- [x] Admin overview with company KPIs + key rates + lead status
- [x] Salesperson ranking table with all metrics + rank badges
- [x] Separate admin/salesperson experiences
- [x] Data isolation (salespeople see only their leads)
- [x] XLS import per user
- [x] Auth on destructive endpoints
- [x] Removed obsolete Data Source modal (Feb 14, 2026)
- [x] Frontend refactored: App.js from ~2160 to ~580 lines (Feb 14, 2026)
- [x] Admin Overview: equipment types + revenue + accessories sold (Feb 14, 2026)

## P1 TODO
- [ ] Refactor server.py into modules (routers, models, services)
- [ ] Export CSV/PDF

## P2 BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking
- [ ] Notifications/reminders

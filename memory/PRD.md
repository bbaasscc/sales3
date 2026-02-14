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
- Can click salesperson name → see their specific dashboard

## Salesperson Experience
- **Tabs**: Dashboard | Follow-ups | Data
- **Dashboard**: My Money, How Can I Earn More, What Am I Selling, Closed Sales
- **Follow-ups**: Pipeline with 7 steps, email/SMS templates, priority/overdue
- **Data**: Their own leads, search/filter, New Lead, Import XLS

## Data
- Benjamin: 53 leads (22 SALE, 20 PENDING, 11 LOST) - $216,906 revenue
- Franco: 0 leads (new)

## Completed (Feb 14, 2026)
- [x] JWT auth with role-based access
- [x] Admin overview with company KPIs + comparison charts
- [x] Separate admin/salesperson experiences
- [x] Data isolation (salespeople see only their leads)
- [x] XLS import per user
- [x] Auth on destructive endpoints (PUT/DELETE leads)
- [x] All leads assigned to correct salesperson

## P1 TODO
- [ ] Refactor App.js (~2000 lines) into components
- [ ] Refactor server.py into modules
- [ ] Export CSV/PDF

## P2 BACKLOG
- [ ] Period comparison (YoY, MoM)
- [ ] Goal tracking
- [ ] Notifications/reminders

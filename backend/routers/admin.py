from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from database import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Pay periods
PAY_PERIODS = [
    ("Dec 25, 2025 - Jan 07, 2026", datetime(2025, 12, 25), datetime(2026, 1, 7)),
    ("Jan 08, 2026 - Jan 21, 2026", datetime(2026, 1, 8), datetime(2026, 1, 21)),
    ("Jan 22, 2026 - Feb 04, 2026", datetime(2026, 1, 22), datetime(2026, 2, 4)),
    ("Feb 05, 2026 - Feb 18, 2026", datetime(2026, 2, 5), datetime(2026, 2, 18)),
    ("Feb 19, 2026 - Mar 04, 2026", datetime(2026, 2, 19), datetime(2026, 3, 4)),
    ("Mar 05, 2026 - Mar 18, 2026", datetime(2026, 3, 5), datetime(2026, 3, 18)),
    ("Mar 19, 2026 - Apr 01, 2026", datetime(2026, 3, 19), datetime(2026, 4, 1)),
    ("Apr 02, 2026 - Apr 15, 2026", datetime(2026, 4, 2), datetime(2026, 4, 15)),
    ("Apr 16, 2026 - Apr 29, 2026", datetime(2026, 4, 16), datetime(2026, 4, 29)),
    ("Apr 30, 2026 - May 13, 2026", datetime(2026, 4, 30), datetime(2026, 5, 13)),
    ("May 14, 2026 - May 27, 2026", datetime(2026, 5, 14), datetime(2026, 5, 27)),
    ("May 28, 2026 - Jun 10, 2026", datetime(2026, 5, 28), datetime(2026, 6, 10)),
    ("Jun 11, 2026 - Jun 24, 2026", datetime(2026, 6, 11), datetime(2026, 6, 24)),
    ("Jun 25, 2026 - Jul 08, 2026", datetime(2026, 6, 25), datetime(2026, 7, 8)),
    ("Jul 09, 2026 - Jul 22, 2026", datetime(2026, 7, 9), datetime(2026, 7, 22)),
    ("Jul 23, 2026 - Aug 05, 2026", datetime(2026, 7, 23), datetime(2026, 8, 5)),
    ("Aug 06, 2026 - Aug 19, 2026", datetime(2026, 8, 6), datetime(2026, 8, 19)),
    ("Aug 20, 2026 - Sep 02, 2026", datetime(2026, 8, 20), datetime(2026, 9, 2)),
    ("Sep 03, 2026 - Sep 16, 2026", datetime(2026, 9, 3), datetime(2026, 9, 16)),
    ("Sep 17, 2026 - Sep 30, 2026", datetime(2026, 9, 17), datetime(2026, 9, 30)),
    ("Oct 01, 2026 - Oct 14, 2026", datetime(2026, 10, 1), datetime(2026, 10, 14)),
    ("Oct 15, 2026 - Oct 28, 2026", datetime(2026, 10, 15), datetime(2026, 10, 28)),
    ("Oct 29, 2026 - Nov 11, 2026", datetime(2026, 10, 29), datetime(2026, 11, 11)),
    ("Nov 12, 2026 - Nov 25, 2026", datetime(2026, 11, 12), datetime(2026, 11, 25)),
    ("Nov 26, 2026 - Dec 09, 2026", datetime(2026, 11, 26), datetime(2026, 12, 9)),
    ("Dec 10, 2026 - Dec 23, 2026", datetime(2026, 12, 10), datetime(2026, 12, 23)),
    ("Dec 24, 2026 - Jan 06, 2027", datetime(2026, 12, 24), datetime(2027, 1, 6)),
    ("Jan 07, 2027 - Jan 20, 2027", datetime(2027, 1, 7), datetime(2027, 1, 20)),
]


def filter_leads_by_period(leads, pay_period=None, date_filter=None, date_field="visit_date"):
    if pay_period and pay_period != "all":
        period = next((p for p in PAY_PERIODS if p[0] == pay_period), None)
        if period:
            start, end = period[1], period[2]
            filtered = []
            for l in leads:
                vd = l.get(date_field, "")
                if vd:
                    try:
                        d = datetime.strptime(str(vd)[:10], "%Y-%m-%d")
                        if start <= d <= end:
                            filtered.append(l)
                    except (ValueError, TypeError):
                        pass
            return filtered
    if date_filter and date_filter != "all":
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if date_filter == "current_year":
            start_dt = datetime(now.year, 1, 1)
            end_dt = datetime(now.year, 12, 31)
        elif date_filter == "last_year":
            start_dt = datetime(now.year - 1, 1, 1)
            end_dt = datetime(now.year - 1, 12, 31)
        else:
            days_map = {"week": 7, "2weeks": 14}
            days = days_map.get(date_filter, 365)
            start_dt = now - timedelta(days=days)
            end_dt = None
        filtered = []
        for l in leads:
            vd = l.get(date_field, "")
            if vd:
                try:
                    d = datetime.strptime(str(vd)[:10], "%Y-%m-%d")
                    if end_dt:
                        if start_dt <= d <= end_dt:
                            filtered.append(l)
                    elif d >= start_dt:
                        filtered.append(l)
                except (ValueError, TypeError):
                    pass
        return filtered
    return leads


@router.get("/salespeople")
async def get_salespeople(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"users": users}


@router.get("/comparison")
async def get_salesperson_comparison(pay_period: Optional[str] = None, date_filter: Optional[str] = None, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    salespeople = await db.users.find({"role": "salesperson"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    comparison = []
    for sp in salespeople:
        all_sp_leads = await db.leads.find({"salesperson_id": sp["user_id"]}, {"_id": 0}).to_list(10000)
        # All statuses count in leads/visits
        leads = filter_leads_by_period(all_sp_leads, pay_period, date_filter)
        total_leads = len(leads)
        # Sales/revenue filtered by close_date (consistent with KPIs dashboard)
        sales_leads = filter_leads_by_period(all_sp_leads, pay_period, date_filter, date_field="close_date")
        sales = [l for l in sales_leads if l.get("status") == "SALE"]
        credit_rejects = [l for l in sales_leads if l.get("status") == "CREDIT_REJECT"]
        lost = [l for l in leads if l.get("status") == "LOST"]
        closed_deals = len(sales)
        gross_closed = closed_deals + len(credit_rejects)
        total_revenue = sum(l.get("ticket_value", 0) or 0 for l in sales)
        total_commission = sum(l.get("commission_value", 0) or 0 for l in sales)
        closing_rate = (closed_deals / total_leads * 100) if total_leads > 0 else 0
        avg_ticket = (total_revenue / closed_deals) if closed_deals > 0 else 0
        pm_jobs = len([l for l in sales if (l.get("commission_percent", 0) or 0) <= 5])
        pm_pct = (pm_jobs / closed_deals * 100) if closed_deals > 0 else 0
        avg_gp = (sum((l.get("commission_percent", 0) or 0) for l in sales) / closed_deals) if closed_deals > 0 else 0
        comparison.append({
            "user_id": sp["user_id"], "name": sp["name"], "email": sp["email"],
            "total_leads": total_leads, "closed_deals": closed_deals, "gross_closed": gross_closed, "lost_deals": len(lost),
            "total_revenue": round(total_revenue, 2), "total_commission": round(total_commission, 2),
            "closing_rate": round(closing_rate, 1), "avg_ticket": round(avg_ticket, 2),
            "pm_jobs": pm_jobs, "pm_pct": round(pm_pct, 1), "gp_pct": round(avg_gp, 1),
        })

    rank_fields = [
        ("closing_rate", True), ("closed_deals", True), ("avg_ticket", True),
        ("total_revenue", True), ("total_leads", True), ("gp_pct", True), ("pm_pct", False),
    ]
    for field, higher_better in rank_fields:
        sorted_sp = sorted(comparison, key=lambda x: x[field], reverse=higher_better)
        for i, sp in enumerate(sorted_sp):
            sp[f"{field}_rank"] = i + 1
    for sp in comparison:
        ranks = [sp.get(f"{f}_rank", 99) for f, _ in rank_fields]
        sp["overall_rank"] = round(sum(ranks) / len(ranks), 1)
    comparison.sort(key=lambda x: x["overall_rank"])
    for i, sp in enumerate(comparison):
        sp["overall_position"] = i + 1

    # Global totals (use close_date for sales metrics, visit_date for lead counts)
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    all_leads_filtered = filter_leads_by_period(all_leads, pay_period, date_filter)
    all_sales_filtered = filter_leads_by_period(all_leads, pay_period, date_filter, date_field="close_date")
    all_sales = [l for l in all_sales_filtered if l.get("status") == "SALE"]
    all_lost = [l for l in all_leads_filtered if l.get("status") == "LOST"]
    all_credit_rejects = [l for l in all_sales_filtered if l.get("status") == "CREDIT_REJECT"]
    all_pm = [l for l in all_sales if (l.get("commission_percent", 0) or 0) <= 5]
    total_rev = sum((l.get("ticket_value", 0) or 0) for l in all_sales)
    total_comm = sum((l.get("commission_value", 0) or 0) for l in all_sales)
    totals = {
        "total_leads": len(all_leads_filtered), "closed_deals": len(all_sales), "gross_closed": len(all_sales) + len(all_credit_rejects), "lost_deals": len(all_lost),
        "total_revenue": round(total_rev, 2), "total_commission": round(total_comm, 2),
        "closing_rate": round((len(all_sales) / len(all_leads_filtered) * 100) if all_leads_filtered else 0, 1),
        "avg_ticket": round((total_rev / len(all_sales)) if all_sales else 0, 2),
        "pm_jobs": len(all_pm), "pm_pct": round((len(all_pm) / len(all_sales) * 100) if all_sales else 0, 1),
        "gp_pct": round((sum(l.get("commission_percent", 0) for l in all_sales) / len(all_sales)) if all_sales else 0, 1),
    }

    equipment_types = {}
    for l in all_sales:
        ut = l.get("unit_type", "") or "Other"
        if ut not in equipment_types:
            equipment_types[ut] = {"count": 0, "revenue": 0}
        equipment_types[ut]["count"] += 1
        equipment_types[ut]["revenue"] += l.get("ticket_value", 0)
    for v in equipment_types.values():
        v["revenue"] = round(v["revenue"], 2)
    totals["equipment_types"] = equipment_types

    spiff_fields = ["apco_x", "samsung", "mitsubishi", "surge_protector", "duct_cleaning", "self_gen_mits"]
    accessories = {}
    for field in spiff_fields:
        count = sum(1 for l in all_sales if (l.get(field, 0) or 0) > 0)
        total_val = sum(l.get(field, 0) or 0 for l in all_sales)
        accessories[field] = {"count": count, "value": round(total_val, 2)}
    totals["accessories"] = accessories

    return {"comparison": comparison, "totals": totals}

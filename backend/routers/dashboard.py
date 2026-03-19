"""Dashboard KPI endpoint."""
from fastapi import APIRouter, Depends
from typing import Optional
import pandas as pd

from database import db
from auth import get_optional_user
from services.kpi_service import process_sales_data

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/kpis")
async def get_dashboard_kpis(date_filter: str = "all", pay_period: Optional[str] = None, salesperson_id: Optional[str] = None, category: Optional[str] = None, user=Depends(get_optional_user)):
    lead_filter = {}
    if user and user["role"] == "salesperson":
        lead_filter["salesperson_id"] = user["user_id"]
    elif user and user["role"] == "admin" and salesperson_id:
        lead_filter["salesperson_id"] = salesperson_id
    # Category filter: hvac excludes pure generators, generator includes pure + dual
    if category == "hvac":
        lead_filter["unit_type"] = {"$ne": "Generator"}
    elif category == "generator":
        lead_filter["$or"] = [{"unit_type": "Generator"}, {"also_generator": True}]
    leads = await db.leads.find(lead_filter, {"_id": 0}).to_list(10000)
    if not leads:
        return {"total_revenue": 0, "total_commission": 0, "closed_deals": 0, "closing_rate": 0, "total_visits": 0, "average_ticket": 0,
                "commission_payment_count": 0, "commission_payment_revenue": 0, "commission_payment_amount": 0, "commission_payment_spiff": 0,
                "price_margin_total": 0, "price_margin_sales_count": 0, "price_margin_commission": 0, "spiff_total": 0, "spiff_breakdown": {},
                "spiff_records": {}, "follow_ups": [], "avg_commission_percent": 0, "unit_type_count": {}, "unit_type_revenue": {}, "monthly_data": [],
                "status_distribution": {}, "records": [], "pay_periods": [], "selected_pay_period": pay_period,
                "cancel_count": 0, "rescheduled_count": 0, "credit_reject_count": 0, "gross_closed": 0}
    df = pd.DataFrame(leads)
    return process_sales_data(df, date_filter=date_filter, pay_period=pay_period, from_db=True)


@router.get("/dashboard/company-averages")
async def get_company_averages(date_filter: str = "all", pay_period: Optional[str] = None, category: Optional[str] = None, user=Depends(get_optional_user)):
    """Get average KPIs across all salespeople."""
    salespeople = await db.users.find({"role": "salesperson"}, {"_id": 0}).to_list(100)
    if not salespeople:
        return {"averages": {}, "salesperson_count": 0}

    totals = {"closing_rate": [], "gross_closing_rate": [], "average_ticket": [], "dpa": [], "total_revenue": [],
              "closed_deals": [], "total_visits": [], "credit_reject_count": [],
              "price_margin_sales_count": [], "avg_commission_percent": []}

    for sp in salespeople:
        lead_filter = {"salesperson_id": sp["user_id"]}
        if category == "hvac":
            lead_filter["unit_type"] = {"$ne": "Generator"}
        elif category == "generator":
            lead_filter["$or"] = [{"unit_type": "Generator"}, {"also_generator": True}]
            lead_filter["salesperson_id"] = sp["user_id"]
        leads = await db.leads.find(lead_filter, {"_id": 0}).to_list(10000)
        if not leads:
            # Include salesperson with 0s in averages
            for key in totals:
                totals[key].append(0)
            continue
        df = pd.DataFrame(leads)
        kpi = process_sales_data(df, date_filter=date_filter, pay_period=pay_period, from_db=True)
        totals["closing_rate"].append(kpi["closing_rate"])
        gross_rate = ((kpi["gross_closed"] or kpi["closed_deals"]) / kpi["total_visits"] * 100) if kpi["total_visits"] > 0 else 0
        totals["gross_closing_rate"].append(round(gross_rate, 1))
        totals["average_ticket"].append(kpi["average_ticket"])
        totals["dpa"].append(kpi["total_revenue"] / kpi["total_visits"] if kpi["total_visits"] > 0 else 0)
        totals["total_revenue"].append(kpi["total_revenue"])
        totals["closed_deals"].append(kpi["closed_deals"])
        totals["total_visits"].append(kpi["total_visits"])
        totals["credit_reject_count"].append(kpi["credit_reject_count"])
        totals["price_margin_sales_count"].append(kpi["price_margin_sales_count"])
        totals["avg_commission_percent"].append(kpi["avg_commission_percent"])

    n = len(totals["closing_rate"])
    if n == 0:
        return {"averages": {}, "salesperson_count": 0}

    avg = lambda lst: round(sum(lst) / len(lst), 1) if lst else 0
    return {
        "salesperson_count": n,
        "averages": {
            "closing_rate": avg(totals["closing_rate"]),
            "gross_closing_rate": avg(totals["gross_closing_rate"]),
            "average_ticket": round(avg(totals["average_ticket"]), 0),
            "dpa": round(avg(totals["dpa"]), 0),
            "total_revenue": round(avg(totals["total_revenue"]), 0),
            "closed_deals": round(avg(totals["closed_deals"]), 1),
            "total_visits": round(avg(totals["total_visits"]), 1),
            "credit_reject_count": round(avg(totals["credit_reject_count"]), 1),
            "price_margin_sales_count": round(avg(totals["price_margin_sales_count"]), 1),
        },
    }

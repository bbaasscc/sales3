"""Dashboard KPI endpoint."""
from fastapi import APIRouter, Depends
from typing import Optional
import pandas as pd

from database import db
from auth import get_optional_user
from services.kpi_service import process_sales_data

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/kpis")
async def get_dashboard_kpis(date_filter: str = "all", pay_period: Optional[str] = None, salesperson_id: Optional[str] = None, user=Depends(get_optional_user)):
    lead_filter = {}
    if user and user["role"] == "salesperson":
        lead_filter["salesperson_id"] = user["user_id"]
    elif user and user["role"] == "admin" and salesperson_id:
        lead_filter["salesperson_id"] = salesperson_id
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

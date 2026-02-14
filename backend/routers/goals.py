from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import db
from models import GoalCreate
from typing import Optional
from datetime import datetime, timezone
from routers.admin import PAY_PERIODS, filter_leads_by_period

router = APIRouter(prefix="/api/goals", tags=["goals"])


def _get_period_index(name):
    for i, (n, _, _) in enumerate(PAY_PERIODS):
        if n == name:
            return i
    return -1


def _compute_period_kpis(leads):
    sales = [l for l in leads if l.get("status") == "SALE"]
    total = len(leads)
    closed = len(sales)
    revenue = sum(l.get("ticket_value", 0) for l in sales)
    commission = sum(l.get("commission_value", 0) for l in sales)
    rate = round((closed / total * 100) if total > 0 else 0, 1)
    avg_ticket = round((revenue / closed) if closed > 0 else 0, 2)
    return {
        "total_leads": total, "closed_deals": closed,
        "total_revenue": round(revenue, 2), "total_commission": round(commission, 2),
        "closing_rate": rate, "avg_ticket": avg_ticket,
    }


@router.post("")
async def save_goal(data: GoalCreate, user=Depends(get_current_user)):
    await db.goals.update_one(
        {"user_id": user["user_id"], "pay_period": data.pay_period},
        {"$set": {
            "user_id": user["user_id"],
            "pay_period": data.pay_period,
            "revenue_goal": data.revenue_goal,
            "deals_goal": data.deals_goal,
            "commission_goal": data.commission_goal,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"message": "Goal saved"}


@router.get("")
async def get_goal(pay_period: str, user=Depends(get_current_user)):
    goal = await db.goals.find_one(
        {"user_id": user["user_id"], "pay_period": pay_period}, {"_id": 0}
    )
    return goal or {"pay_period": pay_period, "revenue_goal": 0, "deals_goal": 0, "commission_goal": 0}


@router.get("/comparison")
async def get_period_comparison(pay_period: str, user=Depends(get_current_user)):
    """Compare current period vs previous period KPIs for the logged-in salesperson."""
    idx = _get_period_index(pay_period)
    if idx < 0:
        raise HTTPException(status_code=400, detail="Invalid pay period")

    sp_id = user["user_id"]
    all_leads = await db.leads.find({"salesperson_id": sp_id}, {"_id": 0}).to_list(10000)

    current_leads = filter_leads_by_period(all_leads, pay_period=pay_period)
    current_kpis = _compute_period_kpis(current_leads)

    prev_kpis = None
    if idx > 0:
        prev_name = PAY_PERIODS[idx - 1][0]
        prev_leads = filter_leads_by_period(all_leads, pay_period=prev_name)
        prev_kpis = _compute_period_kpis(prev_leads)
        prev_kpis["period_name"] = prev_name

    # Get goal for current period
    goal = await db.goals.find_one({"user_id": sp_id, "pay_period": pay_period}, {"_id": 0})

    current_kpis["period_name"] = pay_period
    return {
        "current": current_kpis,
        "previous": prev_kpis,
        "goal": goal or {"revenue_goal": 0, "deals_goal": 0, "commission_goal": 0},
    }

"""Notifications system - generates alerts for salespeople."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from database import db
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(user=Depends(get_current_user)):
    """Get all active notifications for the current salesperson."""
    sp_id = user["user_id"]
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    # Load all dismissed notification IDs for this user
    dismissed_docs = await db.dismissed_notifications.find(
        {"user_id": sp_id}, {"_id": 0, "notification_id": 1}
    ).to_list(1000)
    dismissed_ids = set(d["notification_id"] for d in dismissed_docs)

    notifications = []

    # 1. Pending installations > 3 days old
    pending_tasks = await db.pending_tasks.find(
        {"salesperson_id": sp_id, "status": "pending"}, {"_id": 0}
    ).to_list(100)
    for task in pending_tasks:
        nid = f"install_{task['task_id']}"
        if nid in dismissed_ids:
            continue
        created = task.get("created_at", "")
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                days_old = (now - created_dt).days
                if days_old >= 3:
                    notifications.append({
                        "id": nid, "type": "pending_install", "priority": "high",
                        "title": f"Installation pending {days_old} days",
                        "message": f"{task['lead_name']} needs installer booked",
                        "lead_id": task.get("lead_id", ""), "lead_name": task.get("lead_name", ""),
                        "days_old": days_old, "created_at": created,
                    })
            except (ValueError, TypeError):
                pass

    # 2. Overdue follow-ups
    overdue_leads = await db.leads.find(
        {"salesperson_id": sp_id, "status": "PENDING", "follow_up_date": {"$ne": "", "$lt": today}},
        {"_id": 0, "lead_id": 1, "name": 1, "follow_up_date": 1, "city": 1, "phone": 1},
    ).to_list(200)
    for lead in overdue_leads:
        nid = f"followup_{lead['lead_id']}"
        if nid in dismissed_ids:
            continue
        fu_date = lead.get("follow_up_date", "")
        try:
            fu_dt = datetime.strptime(fu_date, "%Y-%m-%d")
            days_overdue = (datetime.strptime(today, "%Y-%m-%d") - fu_dt).days
            notifications.append({
                "id": nid, "type": "overdue_followup",
                "priority": "high" if days_overdue > 5 else "medium",
                "title": f"Follow-up overdue {days_overdue}d",
                "message": f"{lead['name']} — follow-up was {fu_date}",
                "lead_id": lead["lead_id"], "lead_name": lead["name"],
                "days_overdue": days_overdue, "created_at": fu_date,
            })
        except (ValueError, TypeError):
            pass

    # 3. New leads from email ingest (last 24h)
    yesterday = (now - timedelta(hours=24)).isoformat()
    new_leads = await db.leads.find(
        {"salesperson_id": sp_id, "source": "email_auto", "created_at": {"$gte": yesterday}},
        {"_id": 0, "lead_id": 1, "name": 1, "city": 1, "created_at": 1},
    ).to_list(50)
    for lead in new_leads:
        nid = f"newlead_{lead['lead_id']}"
        if nid in dismissed_ids:
            continue
        notifications.append({
            "id": nid, "type": "new_lead", "priority": "low",
            "title": "New lead assigned",
            "message": f"{lead['name']} ({lead.get('city', '')}) via email",
            "lead_id": lead["lead_id"], "lead_name": lead["name"],
            "created_at": lead.get("created_at", ""),
        })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    notifications.sort(key=lambda n: priority_order.get(n.get("priority", "low"), 3))
    return {"notifications": notifications, "count": len(notifications)}


@router.post("/dismiss/{notification_id}")
async def dismiss_notification(notification_id: str, user=Depends(get_current_user)):
    await db.dismissed_notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"dismissed_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Notification dismissed"}


@router.post("/clear-all")
async def clear_all_notifications(body: dict = {}, user=Depends(get_current_user)):
    """Dismiss all current notifications for this user."""
    notification_ids = body.get("ids", [])
    if notification_ids:
        ops = [{"notification_id": nid, "user_id": user["user_id"]} for nid in notification_ids]
        for op in ops:
            await db.dismissed_notifications.update_one(
                op, {"$set": {"dismissed_at": datetime.now(timezone.utc).isoformat()}}, upsert=True
            )
    return {"message": f"Cleared {len(notification_ids)} notifications"}

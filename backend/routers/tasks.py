"""Pending installation tasks/reminders endpoints."""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
async def get_tasks(status: Optional[str] = None, user=Depends(get_current_user)):
    query = {}
    if user["role"] == "salesperson":
        query["salesperson_id"] = user["user_id"]
    if status:
        query["status"] = status
    tasks = await db.pending_tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"tasks": tasks}


@router.put("/{task_id}/complete")
async def complete_task(task_id: str, user=Depends(get_current_user)):
    result = await db.pending_tasks.update_one(
        {"task_id": task_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        return {"message": "Task not found or already completed"}
    return {"message": "Task completed"}


@router.put("/{task_id}/dismiss")
async def dismiss_task(task_id: str, user=Depends(get_current_user)):
    result = await db.pending_tasks.update_one(
        {"task_id": task_id},
        {"$set": {"status": "dismissed", "dismissed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        return {"message": "Task not found"}
    return {"message": "Task dismissed"}


async def create_pending_install_task(lead: dict):
    """Create a pending installation task for a lead with install_date='PENDING'."""
    existing = await db.pending_tasks.find_one({
        "lead_id": lead["lead_id"],
        "task_type": "pending_install",
        "status": "pending"
    })
    if existing:
        return
    task = {
        "task_id": str(uuid.uuid4()),
        "lead_id": lead["lead_id"],
        "lead_name": lead.get("name", ""),
        "lead_city": lead.get("city", ""),
        "lead_phone": lead.get("phone", ""),
        "lead_unit_type": lead.get("unit_type", ""),
        "lead_ticket_value": lead.get("ticket_value", 0),
        "salesperson_id": lead.get("salesperson_id", ""),
        "task_type": "pending_install",
        "description": f"Book installer for {lead.get('name', 'Unknown')}",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pending_tasks.insert_one(task)
    task.pop("_id", None)
    return task


async def complete_pending_install_task(lead_id: str, install_date: str):
    """Complete any pending install tasks for a lead when a firm date is set."""
    await db.pending_tasks.update_many(
        {"lead_id": lead_id, "task_type": "pending_install", "status": "pending"},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "install_date_set": install_date,
        }}
    )

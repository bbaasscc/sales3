from fastapi import APIRouter, Depends
from auth import get_current_user
from database import db
from models import FollowUpActionCreate, ClientNoteCreate, PipelineScheduleUpdate
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api", tags=["pipeline"])

PIPELINE_STEP_DAYS = [
    {"id": "d0_email", "day": 0}, {"id": "d0_sms", "day": 0},
    {"id": "d2_email", "day": 2},
    {"id": "d4_sms", "day": 4}, {"id": "d4_email", "day": 4},
    {"id": "d6_sms", "day": 6},
    {"id": "d8_email", "day": 8},
]


def generate_pipeline_schedule(visit_date_str: str) -> list:
    try:
        vd = datetime.strptime(visit_date_str, '%Y-%m-%d')
    except (ValueError, TypeError):
        vd = datetime.now()
    return [{"id": s["id"], "scheduled_date": (vd + timedelta(days=s["day"])).strftime('%Y-%m-%d'), "comment": ""} for s in PIPELINE_STEP_DAYS]


@router.post("/followup/action")
async def record_followup_action(action: FollowUpActionCreate):
    doc = {"client_name": action.client_name, "step_id": action.step_id, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.followup_actions.insert_one(doc)
    doc.pop('_id', None)
    return {"message": "Action recorded", "action": doc}


@router.get("/followup/actions")
async def get_followup_actions():
    actions = await db.followup_actions.find({}, {"_id": 0}).to_list(1000)
    return {"actions": actions}


@router.delete("/followup/action")
async def delete_followup_action(client_name: str, step_id: str):
    result = await db.followup_actions.delete_one({"client_name": client_name, "step_id": step_id})
    return {"deleted": result.deleted_count}


@router.get("/client/notes")
async def get_client_notes(client_name: str):
    note = await db.client_notes.find_one({"client_name": client_name}, {"_id": 0})
    return note or {"client_name": client_name, "next_follow_up": "", "comment": "", "priority": "high"}


@router.post("/client/notes")
async def save_client_notes(data: ClientNoteCreate):
    await db.client_notes.update_one(
        {"client_name": data.client_name},
        {"$set": {"next_follow_up": data.next_follow_up, "comment": data.comment, "priority": data.priority, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Notes saved"}


@router.get("/client/all-notes")
async def get_all_client_notes():
    notes = await db.client_notes.find({}, {"_id": 0}).to_list(1000)
    return {"notes": notes}


@router.get("/pipeline/schedule")
async def get_pipeline_schedule(client_name: str):
    schedule = await db.pipeline_schedules.find_one({"client_name": client_name}, {"_id": 0})
    return schedule or {"client_name": client_name, "steps": [], "is_custom": False}


@router.post("/pipeline/schedule")
async def save_pipeline_schedule(data: PipelineScheduleUpdate):
    await db.pipeline_schedules.update_one(
        {"client_name": data.client_name},
        {"$set": {"steps": data.steps, "is_custom": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Schedule saved"}

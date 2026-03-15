"""Lead CRUD, import, and configuration endpoints."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
from datetime import datetime, timezone, timedelta
from io import BytesIO
import uuid
import pandas as pd
import requests

from database import db
from auth import get_current_user, get_optional_user
from models import LeadCreate, LeadUpdate, ExcelConfigCreate
from utils import normalize_status, safe_float, safe_date, parse_lead_email
from services.sync_service import sync_lead_to_sp_collection, get_sp_collection_name
from routers.pipeline import generate_pipeline_schedule
from routers.admin import PAY_PERIODS
from routers.tasks import create_pending_install_task, complete_pending_install_task

router = APIRouter(prefix="/api", tags=["leads"])


@router.get("/")
async def root():
    return {"message": "Sales Dashboard API"}


@router.post("/leads/parse-email")
async def parse_email_to_lead(body: dict):
    return parse_lead_email(body.get("text", ""))


@router.post("/leads")
async def create_lead(lead: LeadCreate, user=Depends(get_current_user)):
    doc = lead.model_dump()
    for field in ['name', 'address', 'city', 'email']:
        if doc.get(field):
            doc[field] = doc[field].upper()
    if doc.get('status'):
        doc['status'] = normalize_status(doc['status'])
    doc['lead_id'] = str(uuid.uuid4())
    doc['created_at'] = datetime.now(timezone.utc).isoformat()
    if user["role"] == "salesperson":
        doc['salesperson_id'] = user["user_id"]
    elif not doc.get('salesperson_id'):
        doc['salesperson_id'] = user["user_id"]
    if doc['visit_date'] and not doc['follow_up_date']:
        try:
            vd = datetime.strptime(doc['visit_date'], '%Y-%m-%d')
            doc['follow_up_date'] = (vd + timedelta(days=2)).strftime('%Y-%m-%d')
        except ValueError:
            pass
    await db.leads.insert_one(doc)
    doc.pop('_id', None)
    await sync_lead_to_sp_collection(doc)
    if doc.get('visit_date'):
        schedule = generate_pipeline_schedule(doc['visit_date'])
        await db.pipeline_schedules.update_one({"client_name": doc['name']}, {"$set": {"client_name": doc['name'], "steps": schedule, "is_custom": False}}, upsert=True)
    if doc.get('install_date') == 'PENDING':
        await create_pending_install_task(doc)
    return {"message": "Lead created", "lead": doc}


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, updates: LeadUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if 'status' in update_data:
        update_data['status'] = normalize_status(update_data['status'])
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()

    # If status changes away from PENDING, auto-remove from pipeline
    new_status = update_data.get('status')
    if new_status and new_status != 'PENDING':
        old_lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
        if old_lead and old_lead.get('status') == 'PENDING':
            update_data['follow_up_date'] = ''
            lead_name = old_lead.get('name', '')
            if lead_name:
                await db.followup_actions.delete_many({"client_name": lead_name})
                await db.pipeline_schedules.delete_one({"client_name": lead_name})

    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    updated_lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if updated_lead:
        await sync_lead_to_sp_collection(updated_lead)
        # Auto-create/complete pending install tasks
        install_date = updated_lead.get("install_date", "")
        if install_date == "PENDING":
            await create_pending_install_task(updated_lead)
        elif install_date and install_date != "PENDING":
            await complete_pending_install_task(lead_id, install_date)
    return {"message": "Lead updated"}


@router.post("/leads/{lead_id}/activity")
async def log_lead_activity(lead_id: str, body: dict, user=Depends(get_current_user)):
    """Log an interaction activity (call, sms, email) on a lead."""
    activity = {
        "lead_id": lead_id,
        "activity_type": body.get("type", ""),  # call, sms, email
        "user_id": user["user_id"],
        "user_name": user.get("name", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.lead_activities.insert_one(activity)
    activity.pop("_id", None)
    return {"message": "Activity logged"}


@router.get("/leads/{lead_id}/activities")
async def get_lead_activities(lead_id: str, user=Depends(get_current_user)):
    activities = await db.lead_activities.find(
        {"lead_id": lead_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return {"activities": activities}


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user=Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    result = await db.leads.delete_one({"lead_id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead and lead.get("salesperson_id"):
        sp_col = await get_sp_collection_name(lead["salesperson_id"])
        if sp_col:
            await db[sp_col].delete_one({"lead_id": lead_id})
    return {"message": "Lead deleted"}


@router.get("/leads")
async def get_leads(salesperson_id: Optional[str] = None, category: Optional[str] = None, user=Depends(get_optional_user)):
    lead_filter = {}
    if user and user["role"] == "salesperson":
        lead_filter["salesperson_id"] = user["user_id"]
    elif user and user["role"] == "admin" and salesperson_id:
        lead_filter["salesperson_id"] = salesperson_id
    if category == "hvac":
        lead_filter["unit_type"] = {"$ne": "Generator"}
    elif category == "generator":
        lead_filter["$or"] = [{"unit_type": "Generator"}, {"also_generator": True}]
    leads = await db.leads.find(lead_filter, {"_id": 0}).to_list(10000)
    if user and user["role"] == "admin" and leads:
        sp_map = {}
        users_list = await db.users.find({"role": "salesperson"}, {"_id": 0, "user_id": 1, "name": 1}).to_list(100)
        for u in users_list:
            sp_map[u["user_id"]] = u["name"]
        for l in leads:
            l["salesperson_name"] = sp_map.get(l.get("salesperson_id", ""), "")
    return {"leads": leads}


@router.post("/leads/import-xls")
async def import_xls_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    contents = await file.read()
    try:
        df = pd.read_excel(BytesIO(contents), engine='openpyxl')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    column_mapping = {}
    for col in df.columns:
        cl = str(col).lower().strip()
        if cl in ['#', 'number', 'salesman #', 'salesman']: column_mapping[col] = 'customer_number'
        elif 'customer name' in cl or cl == 'name': column_mapping[col] = 'name'
        elif 'address' in cl: column_mapping[col] = 'address'
        elif cl == 'city': column_mapping[col] = 'city'
        elif cl in ['unit', 'unit type']: column_mapping[col] = 'unit_type'
        elif 'ticket' in cl and 'value' in cl: column_mapping[col] = 'ticket_value'
        elif cl == 'commission %' or cl == 'comm %': column_mapping[col] = 'commission_percent'
        elif 'commission' in cl and 'value' in cl: column_mapping[col] = 'commission_value'
        elif cl in ['spif', 'spiff']: column_mapping[col] = 'spif_total'
        elif cl == 'status': column_mapping[col] = 'status'
        elif 'visit' in cl and 'date' in cl: column_mapping[col] = 'visit_date'
        elif 'close' in cl and 'date' in cl: column_mapping[col] = 'close_date'
        elif 'install' in cl and 'date' in cl: column_mapping[col] = 'install_date'
        elif 'follow' in cl or 'folow' in cl: column_mapping[col] = 'follow_up_date'
        elif cl == 'email': column_mapping[col] = 'email'
        elif 'phone' in cl: column_mapping[col] = 'phone'
        elif 'loss' in cl: column_mapping[col] = 'loss_reason'
        elif cl == 'comments': column_mapping[col] = 'comments'
        elif 'feeling' in cl: column_mapping[col] = 'feeling'
        elif 'objection' in cl: column_mapping[col] = 'objections'
        elif 'apco' in cl: column_mapping[col] = 'apco_x'
        elif 'samsung' in cl: column_mapping[col] = 'samsung'
        elif 'mitsubishi' in cl or cl == 'mits': column_mapping[col] = 'mitsubishi'
        elif 'surge' in cl: column_mapping[col] = 'surge_protector'
        elif 'duct' in cl: column_mapping[col] = 'duct_cleaning'
        elif 'self gen' in cl: column_mapping[col] = 'self_gen_mits'
    df = df.rename(columns=column_mapping)
    df = df.loc[:, ~df.columns.duplicated()]
    float_cols = ['ticket_value', 'commission_value', 'spif_total', 'commission_percent', 'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']
    date_cols = ['visit_date', 'close_date', 'install_date', 'follow_up_date']
    count = 0
    for _, row in df.iterrows():
        name = str(row.get('name', '')).strip() if pd.notna(row.get('name')) else ''
        if not name:
            continue
        lead = {'lead_id': str(uuid.uuid4()), 'customer_number': str(row.get('customer_number', '')) if pd.notna(row.get('customer_number')) else '',
                'name': name.upper(), 'address': (str(row.get('address', '')) if pd.notna(row.get('address')) else '').upper(),
                'city': (str(row.get('city', '')) if pd.notna(row.get('city')) else '').upper(), 'email': (str(row.get('email', '')) if pd.notna(row.get('email')) else '').upper(),
                'phone': str(row.get('phone', '')) if pd.notna(row.get('phone')) else '',
                'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
                'status': normalize_status(row.get('status', 'PENDING')),
                'loss_reason': str(row.get('loss_reason', '')) if pd.notna(row.get('loss_reason')) else '',
                'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
                'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
                'objections': str(row.get('objections', '')) if pd.notna(row.get('objections')) else '',
                'salesperson_id': user["user_id"], 'created_at': datetime.now(timezone.utc).isoformat()}
        for fc in float_cols:
            lead[fc] = safe_float(row.get(fc, 0))
        cp = lead['commission_percent']
        lead['commission_percent'] = round(cp * 100, 2) if 0 < cp < 1 else round(cp, 2)
        for dc in date_cols:
            d = safe_date(row.get(dc))
            lead[dc] = d.strftime('%Y-%m-%d') if d else ''
        if not lead.get('follow_up_date') and lead.get('visit_date'):
            try:
                vd = datetime.strptime(lead['visit_date'], '%Y-%m-%d')
                lead['follow_up_date'] = (vd + timedelta(days=2)).strftime('%Y-%m-%d')
            except:
                pass
        await db.leads.insert_one(lead)
        lead.pop('_id', None)
        if lead.get('visit_date'):
            schedule = generate_pipeline_schedule(lead['visit_date'])
            await db.pipeline_schedules.update_one({"client_name": lead['name']}, {"$set": {"client_name": lead['name'], "steps": schedule, "is_custom": False}}, upsert=True)
        count += 1
    return {"message": f"Imported {count} leads", "count": count}


@router.post("/dashboard/refresh")
async def refresh_dashboard(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    raise HTTPException(status_code=400, detail="Use XLS import instead")


@router.get("/pay-periods")
async def get_pay_periods():
    periods = [{"name": n, "start": s.isoformat(), "end": e.isoformat()} for n, s, e in PAY_PERIODS]
    return {"pay_periods": periods}


@router.post("/config/excel")
async def set_excel_config(config: ExcelConfigCreate):
    await db.excel_config.update_one({}, {"$set": {"excel_url": config.excel_url, "last_updated": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"message": "Config saved"}


@router.get("/config/excel")
async def get_excel_config():
    config = await db.excel_config.find_one({}, {"_id": 0})
    return config or {"excel_url": ""}

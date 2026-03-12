"""Sync and seed services for data persistence."""
import json
import re
import asyncio
import logging
from pathlib import Path
from database import db
from routers.email_ingest import check_email_inbox as run_email_check

logger = logging.getLogger(__name__)
ROOT_DIR = Path(__file__).parent.parent


def slugify(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


async def get_sp_collection_name(salesperson_id: str):
    user = await db.users.find_one({"user_id": salesperson_id}, {"_id": 0, "name": 1})
    if not user:
        return None
    return f"leads_{slugify(user['name'])}"


async def sync_lead_to_sp_collection(lead: dict):
    sp_id = lead.get("salesperson_id")
    if not sp_id:
        return
    col_name = await get_sp_collection_name(sp_id)
    if not col_name:
        return
    clean = {k: v for k, v in lead.items() if k != "_id"}
    await db[col_name].update_one({"lead_id": clean["lead_id"]}, {"$set": clean}, upsert=True)


async def sync_all_sp_collections():
    """Full sync: rebuild per-salesperson collections from leads."""
    salespeople = await db.users.find({"role": "salesperson"}, {"_id": 0}).to_list(100)
    for sp in salespeople:
        col_name = f"leads_{slugify(sp['name'])}"
        sp_leads = await db.leads.find({"salesperson_id": sp["user_id"]}, {"_id": 0}).to_list(10000)
        await db[col_name].delete_many({})
        if sp_leads:
            await db[col_name].insert_many(sp_leads)
            for l in sp_leads:
                l.pop("_id", None)
        logger.info(f"Synced collection '{col_name}': {len(sp_leads)} leads")


async def seed_database():
    """Seed database with initial data if empty, and clean orphan leads."""
    orphan_filter = {"$or": [
        {"salesperson_id": {"$exists": False}},
        {"salesperson_id": None},
        {"salesperson_id": ""},
        {"salesperson_id": "NONE"},
    ]}
    orphan_count = await db.leads.count_documents(orphan_filter)
    if orphan_count > 0:
        await db.leads.delete_many(orphan_filter)
        logger.info(f"Cleaned {orphan_count} orphan leads.")

    seed_file = ROOT_DIR / "seed_data.json"
    if not seed_file.exists():
        logger.info("No seed_data.json found, skipping seed.")
        return
    with open(seed_file) as f:
        data = json.load(f)

    if data.get("users"):
        existing_emails = {u["email"] async for u in db.users.find({}, {"email": 1, "_id": 0})}
        new_users = [u for u in data["users"] if u["email"] not in existing_emails]
        if new_users:
            await db.users.insert_many(new_users)
            logger.info(f"Seeded {len(new_users)} new users.")
        else:
            logger.info(f"All {len(data['users'])} users already exist.")

    if data.get("leads"):
        existing_ids = {l["lead_id"] async for l in db.leads.find({}, {"lead_id": 1, "_id": 0})}
        new_leads = [l for l in data["leads"] if l["lead_id"] not in existing_ids]
        if new_leads:
            await db.leads.insert_many(new_leads)
            logger.info(f"Seeded {len(new_leads)} new leads.")
        else:
            logger.info(f"All {len(data['leads'])} leads already exist.")

    if data.get("excel_config"):
        for cfg in data["excel_config"]:
            await db.excel_config.update_one({}, {"$set": cfg}, upsert=True)
    if data.get("pipeline_schedules"):
        for ps in data["pipeline_schedules"]:
            await db.pipeline_schedules.update_one({"client_name": ps.get("client_name")}, {"$set": ps}, upsert=True)
    if data.get("followup_actions"):
        if await db.followup_actions.count_documents({}) == 0:
            await db.followup_actions.insert_many(data["followup_actions"])
            logger.info(f"Seeded {len(data['followup_actions'])} followup actions.")
    if data.get("client_notes"):
        if await db.client_notes.count_documents({}) == 0:
            await db.client_notes.insert_many(data["client_notes"])
            logger.info(f"Seeded {len(data['client_notes'])} client notes.")
    if data.get("email_ingest_config"):
        if await db.email_ingest_config.count_documents({}) == 0:
            await db.email_ingest_config.insert_many(data["email_ingest_config"])
            logger.info("Seeded email ingest config.")

    logger.info("Seed check complete.")
    await sync_all_sp_collections()
    asyncio.create_task(auto_save_seed())
    asyncio.create_task(auto_email_ingest())


async def auto_save_seed():
    """Periodically save all data to seed_data.json every 5 minutes."""
    while True:
        await asyncio.sleep(300)
        try:
            users = await db.users.find({}, {"_id": 0}).to_list(100)
            leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
            configs = await db.excel_config.find({}, {"_id": 0}).to_list(10)
            pipelines = await db.pipeline_schedules.find({}, {"_id": 0}).to_list(10000)
            followup_actions = await db.followup_actions.find({}, {"_id": 0}).to_list(10000)
            client_notes = await db.client_notes.find({}, {"_id": 0}).to_list(10000)
            email_ingest_config = await db.email_ingest_config.find({}, {"_id": 0}).to_list(10)
            seed_file = ROOT_DIR / "seed_data.json"
            with open(seed_file, "w") as f:
                json.dump({"users": users, "leads": leads, "excel_config": configs,
                           "pipeline_schedules": pipelines, "followup_actions": followup_actions,
                           "client_notes": client_notes, "email_ingest_config": email_ingest_config}, f, default=str)
            await sync_all_sp_collections()
            logger.info(f"Auto-save: {len(leads)} leads saved to seed.")
        except Exception as e:
            logger.error(f"Auto-save failed: {e}")


async def auto_email_ingest():
    """Periodically check Gmail inbox for new lead emails."""
    await asyncio.sleep(30)
    while True:
        try:
            config = await db.email_ingest_config.find_one({}, {"_id": 0})
            if config and config.get("enabled"):
                interval = config.get("check_interval_minutes", 5)
                result = await run_email_check()
                if result.get("created", 0) > 0:
                    logger.info(f"Email ingest: created {result['created']} leads")
                await asyncio.sleep(interval * 60)
            else:
                await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"Email ingest task error: {e}")
            await asyncio.sleep(120)

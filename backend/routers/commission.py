"""Commission rules configuration - Admin only."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from database import db
from auth import get_current_user

router = APIRouter(prefix="/api/commission", tags=["commission"])

# Default commission rules
DEFAULT_RULES = {
    "tiers": [
        {"id": "under_book", "label": "Under Book", "condition": "Below book price", "percent": 5},
        {"id": "at_book", "label": "At Book", "condition": "At book price", "percent": 7},
        {"id": "over_200", "label": "$200 Over", "condition": "$200 over book", "percent": 8},
        {"id": "over_500", "label": "$500 Over", "condition": "$500 over book", "percent": 9},
        {"id": "over_1000", "label": "$1,000+ Over", "condition": "$1,000+ over book", "percent": 10},
    ],
    "spiffs": [
        {"id": "apco_x", "label": "APCO X UV Light", "type": "fixed", "options": [
            {"label": "Sold", "value": 250},
        ]},
        {"id": "surge_furnace", "label": "Surge Protector (Furnace)", "type": "price_based", "options": [
            {"price": 295, "label": "Sold at $295", "value": 75},
            {"price": 195, "label": "Sold at $195", "value": 25},
        ]},
        {"id": "surge_ac", "label": "Surge Protector (AC)", "type": "price_based", "options": [
            {"price": 295, "label": "Sold at $295", "value": 75},
            {"price": 195, "label": "Sold at $195", "value": 25},
        ]},
        {"id": "duct_cleaning", "label": "Duct Cleaning", "type": "price_based_plus_pct", "options": [
            {"price": 699, "label": "Sold at $699", "value": 100, "pct_of_total": 1},
            {"price": 599, "label": "Sold at $599", "value": 75, "pct_of_total": 1},
            {"price": 499, "label": "Sold at $499", "value": 25, "pct_of_total": 0},
        ]},
        {"id": "self_gen_mits", "label": "Self Gen Mitsubishi", "type": "pct_of_product", "percent": 4,
         "description": "4% of Mitsubishi product value only"},
        {"id": "self_gen", "label": "Self Gen (Auto-generated lead)", "type": "pct_of_total", "percent": 3,
         "description": "3% of total sale for self-generated leads"},
        {"id": "samsung", "label": "Samsung", "type": "fixed", "options": [
            {"label": "Sold", "value": 400},
        ]},
    ],
}


@router.get("/rules")
async def get_commission_rules(user=Depends(get_current_user)):
    """Get commission rules (admin-configured or defaults)."""
    doc = await db.commission_rules.find_one({}, {"_id": 0})
    if doc:
        return {"rules": doc.get("rules", DEFAULT_RULES)}
    return {"rules": DEFAULT_RULES}


@router.put("/rules")
async def save_commission_rules(body: dict, user=Depends(get_current_user)):
    """Save commission rules (admin only)."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rules = body.get("rules", {})
    await db.commission_rules.update_one(
        {},
        {"$set": {"rules": rules, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["user_id"]}},
        upsert=True,
    )
    return {"message": "Commission rules saved"}

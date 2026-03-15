"""Shared utility functions for the sales dashboard backend."""
import re
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

# Status constants
VALID_STATUSES = ["PENDING", "SALE", "LOST", "CANCEL_APPOINTMENT", "RESCHEDULED", "CREDIT_REJECT"]
METRIC_STATUSES = {"SALE", "LOST", "PENDING", "CREDIT_REJECT"}
CLOSED_STATUSES = {"SALE"}
GROSS_CLOSED_STATUSES = {"SALE", "CREDIT_REJECT"}
EXCLUDED_STATUSES = {"CANCEL_APPOINTMENT", "RESCHEDULED"}


def slugify(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


# Standard unit type mapping - comprehensive
UNIT_TYPE_MAP = {}
# Build case-insensitive map
_raw_map = {
    # Furnace only
    'Furnace': ['FURNACE', 'Furnace', 'FUrnace', 'furnace'],
    # Furnace + AC
    'Furnace + AC': ['FURNACE + AC', 'Furnace + AC', 'FUrnace + AC', 'FURNACE + AC + HWT', 'COMBO', 'Combo'],
    # Furnace + Heat Pump
    'Furnace + Heat Pump': [
        'Furnace + HP', 'FURNACE + HP', 'Furnace + Heat Pump', 'HEAT PUMP + Furnace', 'HEAT PUMP + FURNACE',
        'Mitsubishi intelli-HEAT + 90 Furnace', 'Mitsubishi intelli-HEAT + 80 Furnace',
        'Mitsu Intelli heat 80 combo', 'Samsung Hylex + 80 Furnace', 'Samsung Hylex + 80 FURNACE',
        'Samsung Hylex + Furnace + DC', 'Samsung Hylex + Furnace',
    ],
    # AC Only
    'AC Only': ['A/C', 'AC', 'AC ONLY', 'Ac Only', 'ac'],
    # Heat Pump Only
    'Heat Pump Only': ['HEAT PUMP', 'HP', 'DUCTLESS', 'Ductless', 'Mitsubishi Lead', 'Heat Pump', 'HEAT PUMP ONLY'],
    # Air Handler
    'Air Handler + AC': ['Air Handler + AC', 'AIR HANDLER + AC'],
    'Air Handler + Heat Pump': ['Air Handler + HP', 'AIR HANDLER + HP', 'Samsung Hylex + Air Handler', 'Air Handler + Heat Pump'],
    'Air Handler Only': ['Air Handler', 'AIR HANDLER', 'Air Handler Only'],
    # Generator
    'Generator': ['GENERATOR', 'Generator', 'generator', 'GENERAC', 'Generac', 'KOHLER', 'Kohler'],
    # Boiler
    'Boiler': ['BOILER', 'Boiler', 'boiler'],
    # Other
    'Other': ['Magic-Pak', 'MAGIC-PAK', 'Other', 'OTHER'],
}
for standard, variants in _raw_map.items():
    for v in variants:
        UNIT_TYPE_MAP[v] = standard
        UNIT_TYPE_MAP[v.upper()] = standard
        UNIT_TYPE_MAP[v.lower()] = standard

def standardize_unit_type(val: str) -> str:
    """Map raw unit type to standard options."""
    if not val:
        return val
    v = val.strip()
    # Direct match
    result = UNIT_TYPE_MAP.get(v)
    if result:
        return result
    # Case-insensitive match
    result = UNIT_TYPE_MAP.get(v.upper())
    if result:
        return result
    # Fuzzy: check if key words match
    vu = v.upper()
    if 'FURNACE' in vu and ('HP' in vu or 'HEAT PUMP' in vu or 'HYLEX' in vu or 'INTELLI' in vu):
        return 'Furnace + Heat Pump'
    if 'FURNACE' in vu and 'AC' in vu:
        return 'Furnace + AC'
    if 'FURNACE' in vu:
        return 'Furnace'
    if 'AIR HANDLER' in vu and ('HP' in vu or 'HEAT PUMP' in vu or 'HYLEX' in vu):
        return 'Air Handler + Heat Pump'
    if 'AIR HANDLER' in vu and 'AC' in vu:
        return 'Air Handler + AC'
    if 'AIR HANDLER' in vu:
        return 'Air Handler Only'
    if 'HEAT PUMP' in vu or 'HP' in vu or 'DUCTLESS' in vu or 'MINI SPLIT' in vu:
        return 'Heat Pump Only'
    if vu in ('AC', 'A/C'):
        return 'AC Only'
    if 'BOILER' in vu:
        return 'Boiler'
    if 'GENERATOR' in vu or 'GENERAC' in vu or 'KOHLER' in vu:
        return 'Generator'
    if 'COMBO' in vu:
        return 'Furnace + AC'
    return v  # Return as-is if no match


def normalize_status(status: str) -> str:
    if pd.isna(status):
        return "UNKNOWN"
    status = str(status).strip().upper()
    if status in ["SALE", "SALES", "SOLD"]:
        return "SALE"
    if status in ["LOST", "LOSS"]:
        return "LOST"
    if status in ["PENDING"]:
        return "PENDING"
    if status in ["CANCEL", "CANCEL APPOINTMENT", "CANCEL_APPOINTMENT", "CANCELLED"]:
        return "CANCEL_APPOINTMENT"
    if status in ["RESCHEDULE", "RESCHEDULED", "RESCHEDULED APPOINTMENT", "RESCHEDULED_APPOINTMENT"]:
        return "RESCHEDULED"
    if status in ["CREDIT REJECT", "CREDIT_REJECT", "CREDIT REJECT SALE"]:
        return "CREDIT_REJECT"
    return status


def safe_float(value, default=0.0) -> float:
    if isinstance(value, pd.Series):
        value = value.iloc[0] if len(value) > 0 else default
    if pd.isna(value):
        return default
    try:
        val = float(value)
        if 40000 <= val <= 50000:
            return default
        return val
    except (ValueError, TypeError):
        return default


def safe_date(value) -> Optional[datetime]:
    if pd.isna(value):
        return None
    try:
        if isinstance(value, datetime):
            return value
        if isinstance(value, (int, float)):
            if 40000 <= value <= 50000:
                return datetime(1899, 12, 30) + timedelta(days=int(value))
        if isinstance(value, str):
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%b %d, %Y']:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
        return pd.to_datetime(value)
    except Exception:
        return None


def parse_lead_email(text: str) -> dict:
    data = {}
    for line in text.strip().split('\n'):
        line = line.strip()
        if ' - ' in line:
            key, val = line.split(' - ', 1)
            key = key.strip().lower()
            val = val.strip()
            if 'customer name' in key: data['name'] = val.upper()
            elif 'customer #' in key or 'customer number' in key: data['customer_number'] = val
            elif key == 'address 1': data['address'] = val.upper()
            elif key == 'city': data['city'] = val.upper()
            elif 'email' in key: data['email'] = val
            elif ('customer phone' in key or 'caller phone' in key) and not data.get('phone') and val:
                data['phone'] = val
    return data

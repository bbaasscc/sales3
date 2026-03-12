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


# Standard unit type mapping
UNIT_TYPE_MAP = {
    'FURNACE': 'Furnace', 'COMBO': 'Furnace + AC', 'A/C': 'AC Only', 'AC': 'AC Only',
    'HEAT PUMP': 'Heat Pump Only', 'HP': 'Heat Pump Only', 'DUCTLESS': 'Heat Pump Only',
    'BOILER': 'Boiler', 'GENERATOR': 'Generator',
}

def standardize_unit_type(val: str) -> str:
    """Map raw unit type to standard options."""
    if not val:
        return val
    v = val.strip()
    return UNIT_TYPE_MAP.get(v.upper(), UNIT_TYPE_MAP.get(v, v))


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

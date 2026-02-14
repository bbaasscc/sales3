from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import Optional
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import requests
from io import BytesIO

# Local imports
from database import db, client
from auth import get_current_user, get_optional_user
from models import LeadCreate, LeadUpdate, ExcelConfigCreate
from routers.auth_routes import router as auth_router
from routers.admin import router as admin_router, PAY_PERIODS, filter_leads_by_period
from routers.pipeline import router as pipeline_router, generate_pipeline_schedule

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ═══════════════════════════════════════════════
# HEALTH CHECK (required by Kubernetes)
# ═══════════════════════════════════════════════

@app.get("/health")
async def health_check():
    return {"status": "ok"}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════

def normalize_status(status: str) -> str:
    if pd.isna(status):
        return "UNKNOWN"
    status = str(status).strip().upper()
    if status in ["SALE", "SALES"]:
        return "SALE"
    if status in ["LOST", "LOSS"]:
        return "LOST"
    if status in ["PENDING"]:
        return "PENDING"
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

def parse_excel_data(excel_url: str) -> pd.DataFrame:
    try:
        if 'docs.google.com/spreadsheets' in excel_url:
            if '/d/' in excel_url:
                sheet_id = excel_url.split('/d/')[1].split('/')[0].split('?')[0]
                excel_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
        elif 'sharepoint.com' in excel_url:
            if '?' in excel_url:
                excel_url = f"{excel_url.split('?')[0]}?download=1"
            else:
                excel_url = f"{excel_url}?download=1"
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0'})
        response = session.get(excel_url, timeout=60, allow_redirects=True)
        response.raise_for_status()
        return pd.read_excel(BytesIO(response.content), engine='openpyxl')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing Excel: {str(e)}")

def parse_lead_email(text: str) -> dict:
    data = {}
    for line in text.strip().split('\n'):
        line = line.strip()
        if ' - ' in line:
            key, val = line.split(' - ', 1)
            key = key.strip().lower()
            val = val.strip()
            if 'customer name' in key: data['name'] = val
            elif 'customer #' in key or 'customer number' in key: data['customer_number'] = val
            elif key == 'address 1': data['address'] = val
            elif key == 'city': data['city'] = val
            elif 'email' in key: data['email'] = val
            elif ('customer phone' in key or 'caller phone' in key) and not data.get('phone') and val:
                data['phone'] = val
    return data


def process_sales_data(df: pd.DataFrame, date_filter: str = "all", pay_period: str = None, from_db: bool = False) -> dict:
    """Process sales data and calculate KPIs - returns dict"""
    if not from_db:
        column_mapping = {}
        for col in df.columns:
            col_lower = str(col).lower().strip()
            if col_lower == '#' or col_lower == 'number': column_mapping[col] = 'customer_number'
            elif col_lower == 'name': column_mapping[col] = 'name'
            elif col_lower == 'address': column_mapping[col] = 'address'
            elif col_lower == 'city': column_mapping[col] = 'city'
            elif col_lower in ['unit', 'unit type']: column_mapping[col] = 'unit_type'
            elif col_lower == 'ticket value': column_mapping[col] = 'ticket_value'
            elif col_lower == 'commission %': column_mapping[col] = 'commission_percent'
            elif col_lower == 'commission value': column_mapping[col] = 'commission_value'
            elif col_lower == 'spif': column_mapping[col] = 'spif_total'
            elif col_lower == 'status': column_mapping[col] = 'status'
            elif col_lower == 'visit date': column_mapping[col] = 'visit_date'
            elif col_lower == 'close date': column_mapping[col] = 'close_date'
            elif col_lower == 'install date': column_mapping[col] = 'install_date'
            elif col_lower in ['folow up on self gen', 'follow up on', 'folow up on', 'follow up']: column_mapping[col] = 'follow_up_date'
            elif 'self gen' in col_lower and 'mits' in col_lower: column_mapping[col] = 'self_gen_mits'
            elif 'apco' in col_lower: column_mapping[col] = 'apco_x'
            elif 'samsung' in col_lower: column_mapping[col] = 'samsung'
            elif 'mitsubishi' in col_lower or 'mits' in col_lower: column_mapping[col] = 'mitsubishi'
            elif 'surge' in col_lower: column_mapping[col] = 'surge_protector'
            elif 'duct' in col_lower or 'dusct' in col_lower: column_mapping[col] = 'duct_cleaning'
        df = df.rename(columns=column_mapping)
        df = df.loc[:, ~df.columns.duplicated()]

    for col in ['customer_number', 'name', 'status', 'unit_type', 'ticket_value', 'commission_value', 'commission_percent',
                'visit_date', 'close_date', 'install_date', 'follow_up_date', 'spif_total',
                'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']:
        if col not in df.columns:
            df[col] = None

    df['status'] = df['status'].apply(normalize_status)
    for fc in ['ticket_value', 'commission_value', 'spif_total', 'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']:
        df[fc] = df[fc].apply(safe_float)

    def clean_cp(x):
        val = safe_float(x)
        return round(val * 100, 2) if 0 < val < 1 else round(val, 2)
    df['commission_percent'] = df['commission_percent'].apply(clean_cp)

    for dc in ['visit_date', 'close_date', 'install_date', 'follow_up_date']:
        df[dc] = df[dc].apply(safe_date)

    now = datetime.now(timezone.utc)
    start_date, end_date = None, None
    if pay_period and pay_period != "all":
        for pn, ps, pe in PAY_PERIODS:
            if pn == pay_period:
                start_date, end_date = ps, pe
                break
    elif date_filter == "week": start_date = now - timedelta(days=7)
    elif date_filter == "2weeks": start_date = now - timedelta(days=14)
    elif date_filter == "month": start_date = now - timedelta(days=30)
    elif date_filter == "year": start_date = now - timedelta(days=365)

    if start_date:
        sn = start_date.replace(tzinfo=None) if hasattr(start_date, 'tzinfo') and start_date.tzinfo else start_date
        en = end_date if end_date else None
        if en:
            df_close = df[df['close_date'].notna() & (df['close_date'] >= sn) & (df['close_date'] <= en)]
            df_install = df[df['install_date'].notna() & (df['install_date'] >= sn) & (df['install_date'] <= en)]
        else:
            df_close = df[df['close_date'].notna() & (df['close_date'] >= sn)]
            df_install = df[df['install_date'].notna() & (df['install_date'] >= sn)]
    else:
        df_close, df_install = df, df
        sn, en = None, None

    closed_df = df_close[df_close['status'] == 'SALE']
    lost_df = df_close[df_close['status'] == 'LOST']
    pending_df = df_close[df_close['status'] == 'PENDING']
    installed_df = df_install[df_install['status'] == 'SALE']

    if start_date and en:
        leads_df = df[df['visit_date'].notna() & (df['visit_date'] >= sn) & (df['visit_date'] <= en)]
        total_visits = len(leads_df)
        leads_converted = len(leads_df[leads_df['status'] == 'SALE'])
    else:
        leads_df = df[df['visit_date'].notna()]
        total_visits = len(leads_df)
        leads_converted = len(leads_df[leads_df['status'] == 'SALE'])

    if total_visits == 0:
        total_visits = len(df_close)
        leads_converted = len(closed_df)

    closed_deals = leads_converted
    closing_rate = (closed_deals / total_visits * 100) if total_visits > 0 else 0
    total_revenue = closed_df['ticket_value'].sum()
    total_commission = closed_df['commission_value'].sum()
    average_ticket = total_revenue / closed_deals if closed_deals > 0 else 0
    valid_cp = closed_df[closed_df['commission_percent'] > 0]['commission_percent']
    avg_cp = valid_cp.mean() if len(valid_cp) > 0 else 5.0

    cp_count = len(installed_df)
    cp_rev = installed_df['ticket_value'].sum()
    cp_amount = installed_df['commission_value'].sum()
    cp_spiff = installed_df['spif_total'].sum()

    pm_df = closed_df[(closed_df['commission_percent'] >= 4.5) & (closed_df['commission_percent'] <= 5.5)]

    spiff_breakdown = {}
    spiff_total = 0.0
    for label, col in [('APCO X','apco_x'),('Samsung','samsung'),('Mitsubishi','mitsubishi'),('Surge Protector','surge_protector'),('Duct Cleaning','duct_cleaning')]:
        t = closed_df[col].sum()
        c = len(closed_df[closed_df[col] > 0])
        if t > 0 or c > 0:
            spiff_breakdown[label] = {'count': c, 'commission': round(t, 2), 'percent_of_sales': round((c / closed_deals * 100), 1) if closed_deals > 0 else 0}
            spiff_total += t

    follow_ups = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    if start_date and en:
        fu_df = df[df['follow_up_date'].notna() & (df['status'] != 'SALE') & df['visit_date'].notna() & (df['visit_date'] >= sn) & (df['visit_date'] <= en)].copy()
    else:
        fu_df = df[df['follow_up_date'].notna() & (df['status'] != 'SALE')].copy()
    for _, row in fu_df.iterrows():
        fd = row.get('follow_up_date')
        if pd.notna(fd):
            vd = row.get('visit_date')
            follow_ups.append({
                'lead_id': str(row.get('lead_id', '')) if pd.notna(row.get('lead_id', None)) else '',
                'customer_number': str(row.get('customer_number', '')) if pd.notna(row.get('customer_number', None)) else '',
                'name': str(row.get('name', '')), 'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
                'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
                'status': str(row.get('status', '')),
                'follow_up_date': fd.strftime('%Y-%m-%d'), 'days_until': (fd - today).days,
                'is_urgent': (fd - today).days <= 7,
                'visit_date': vd.strftime('%Y-%m-%d') if pd.notna(vd) else '',
                'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
                'ticket_value': safe_float(row.get('ticket_value', 0)),
                'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
                'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
                'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
                'objections': str(row.get('objections', '')) if pd.notna(row.get('objections')) else '',
            })
    follow_ups.sort(key=lambda x: x.get('follow_up_date', '9999'))

    ut_count, ut_rev = {}, {}
    for _, r in closed_df.iterrows():
        u = str(r.get('unit_type', 'Unknown')).strip() or 'Unknown'
        ut_count[u] = ut_count.get(u, 0) + 1
        ut_rev[u] = ut_rev.get(u, 0) + safe_float(r.get('ticket_value', 0))

    status_dist = {'SALE': len(closed_df), 'LOST': len(lost_df), 'PENDING': len(pending_df)}

    monthly = {}
    for _, r in closed_df.iterrows():
        d = r.get('install_date') or r.get('close_date')
        if d and pd.notna(d):
            try:
                k = (int(d.year), int(d.month))
                if k not in monthly: monthly[k] = {'revenue': 0, 'deals': 0, 'commission': 0}
                monthly[k]['revenue'] += safe_float(r.get('ticket_value', 0))
                monthly[k]['deals'] += 1
                monthly[k]['commission'] += safe_float(r.get('commission_value', 0))
            except: pass
    mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    monthly_data = [{'month': f"{mn[m-1]} {y}", 'month_short': mn[m-1], 'year': y, 'revenue': round(v['revenue'],2), 'deals': v['deals'], 'commission': round(v['commission'],2)} for (y,m), v in sorted(monthly.items())]

    records = []
    for _, r in installed_df.head(50).iterrows():
        records.append({
            'lead_id': str(r.get('lead_id', '')) if pd.notna(r.get('lead_id', None)) else '',
            'customer_number': str(r.get('customer_number', '')) if pd.notna(r.get('customer_number', None)) else '',
            'name': str(r.get('name', '')), 'city': str(r.get('city', '')) if pd.notna(r.get('city')) else '',
            'address': str(r.get('address', '')) if pd.notna(r.get('address')) else '',
            'unit_type': str(r.get('unit_type', '')) if pd.notna(r.get('unit_type')) else '',
            'ticket_value': safe_float(r.get('ticket_value', 0)), 'commission_percent': safe_float(r.get('commission_percent', 0)),
            'commission_value': safe_float(r.get('commission_value', 0)), 'spif_total': safe_float(r.get('spif_total', 0)),
            'status': str(r.get('status', '')),
            'visit_date': r.get('visit_date').strftime('%Y-%m-%d') if pd.notna(r.get('visit_date')) else '',
            'close_date': r.get('close_date').strftime('%Y-%m-%d') if pd.notna(r.get('close_date')) else '',
            'install_date': r.get('install_date').strftime('%Y-%m-%d') if pd.notna(r.get('install_date')) else '',
            'email': str(r.get('email', '')) if pd.notna(r.get('email')) else '',
        })

    pp_data = []
    for pn, ps, pe in PAY_PERIODS:
        pdf = df[df['install_date'].notna() & (df['install_date'] >= ps) & (df['install_date'] <= pe) & (df['status'] == 'SALE')]
        pp_data.append({'name': pn, 'deals': len(pdf), 'revenue': pdf['ticket_value'].sum()})

    return {
        "total_revenue": round(total_revenue, 2), "total_commission": round(total_commission, 2),
        "closed_deals": closed_deals, "closing_rate": round(closing_rate, 1),
        "total_visits": total_visits, "average_ticket": round(average_ticket, 2),
        "commission_payment_count": cp_count, "commission_payment_revenue": round(cp_rev, 2),
        "commission_payment_amount": round(cp_amount, 2), "commission_payment_spiff": round(cp_spiff, 2),
        "price_margin_total": round(pm_df['ticket_value'].sum(), 2),
        "price_margin_sales_count": len(pm_df),
        "price_margin_commission": round(pm_df['commission_value'].sum(), 2),
        "spiff_total": round(spiff_total, 2), "spiff_breakdown": spiff_breakdown,
        "follow_ups": follow_ups, "avg_commission_percent": round(avg_cp, 2),
        "unit_type_count": ut_count, "unit_type_revenue": ut_rev,
        "monthly_data": monthly_data, "status_distribution": status_dist,
        "records": records, "pay_periods": pp_data, "selected_pay_period": pay_period,
    }


# ═══════════════════════════════════════════════
# ROUTES (dashboard, leads, import)
# ═══════════════════════════════════════════════

@api_router.get("/")
async def root():
    return {"message": "Sales Dashboard API"}


@api_router.get("/dashboard/kpis")
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
                "follow_ups": [], "avg_commission_percent": 0, "unit_type_count": {}, "unit_type_revenue": {}, "monthly_data": [],
                "status_distribution": {}, "records": [], "pay_periods": [], "selected_pay_period": pay_period}
    df = pd.DataFrame(leads)
    return process_sales_data(df, date_filter=date_filter, pay_period=pay_period, from_db=True)


@api_router.post("/leads/import")
async def import_leads_from_sheet():
    config = await db.excel_config.find_one({}, {"_id": 0})
    if not config or not config.get('excel_url'):
        raise HTTPException(status_code=400, detail="No Excel URL configured")
    count = await import_sheet_to_db(config['excel_url'])
    return {"message": f"Imported {count} leads", "count": count}


async def import_sheet_to_db(excel_url: str) -> int:
    df = parse_excel_data(excel_url)
    column_mapping = {}
    for col in df.columns:
        cl = str(col).lower().strip()
        if cl in ['#', 'number']: column_mapping[col] = 'customer_number'
        elif cl == 'name': column_mapping[col] = 'name'
        elif cl == 'address': column_mapping[col] = 'address'
        elif cl == 'city': column_mapping[col] = 'city'
        elif cl in ['unit', 'unit type']: column_mapping[col] = 'unit_type'
        elif cl == 'ticket value': column_mapping[col] = 'ticket_value'
        elif cl == 'commission %': column_mapping[col] = 'commission_percent'
        elif cl == 'commission value': column_mapping[col] = 'commission_value'
        elif cl == 'spif': column_mapping[col] = 'spif_total'
        elif cl == 'status': column_mapping[col] = 'status'
        elif cl == 'visit date': column_mapping[col] = 'visit_date'
        elif cl == 'close date': column_mapping[col] = 'close_date'
        elif cl == 'install date': column_mapping[col] = 'install_date'
        elif cl in ['folow up on self gen', 'follow up on', 'folow up on', 'follow up']: column_mapping[col] = 'follow_up_date'
        elif cl == 'email': column_mapping[col] = 'email'
        elif cl == 'loss reason': column_mapping[col] = 'loss_reason'
        elif cl == 'comments': column_mapping[col] = 'comments'
        elif 'self gen' in cl and 'mits' in cl: column_mapping[col] = 'self_gen_mits'
        elif 'apco' in cl: column_mapping[col] = 'apco_x'
        elif 'samsung' in cl: column_mapping[col] = 'samsung'
        elif 'mitsubishi' in cl or cl == 'mits': column_mapping[col] = 'mitsubishi'
        elif 'surge' in cl: column_mapping[col] = 'surge_protector'
        elif 'duct' in cl or 'dusct' in cl: column_mapping[col] = 'duct_cleaning'
    df = df.rename(columns=column_mapping)
    df = df.loc[:, ~df.columns.duplicated()]
    float_cols = ['ticket_value', 'commission_value', 'spif_total', 'commission_percent', 'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']
    date_cols = ['visit_date', 'close_date', 'install_date', 'follow_up_date']
    leads = []
    for _, row in df.iterrows():
        name = str(row.get('name', '')).strip() if pd.notna(row.get('name')) else ''
        if not name: continue
        lead = {'lead_id': str(uuid.uuid4()), 'customer_number': str(int(row.get('customer_number', 0))) if pd.notna(row.get('customer_number')) and row.get('customer_number') else '',
                'name': name, 'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
                'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '', 'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
                'phone': '', 'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
                'status': normalize_status(row.get('status', 'PENDING')), 'loss_reason': str(row.get('loss_reason', '')) if pd.notna(row.get('loss_reason')) else '',
                'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
                'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
                'objections': str(row.get('objections', '')) if pd.notna(row.get('objections')) else '',
                'created_at': datetime.now(timezone.utc).isoformat()}
        for fc in float_cols:
            lead[fc] = safe_float(row.get(fc, 0))
        cp = lead['commission_percent']
        lead['commission_percent'] = round(cp * 100, 2) if 0 < cp < 1 else round(cp, 2)
        for dc in date_cols:
            d = safe_date(row.get(dc))
            lead[dc] = d.strftime('%Y-%m-%d') if d else ''
        leads.append(lead)
    await db.leads.delete_many({"$or": [{"salesperson_id": ""}, {"salesperson_id": None}, {"salesperson_id": {"$exists": False}}]})
    if leads:
        await db.leads.insert_many(leads)
    return len(leads)


@api_router.post("/leads/import-xls")
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
        if not name: continue
        lead = {'lead_id': str(uuid.uuid4()), 'customer_number': str(row.get('customer_number', '')) if pd.notna(row.get('customer_number')) else '',
                'name': name, 'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
                'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '', 'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
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
            except: pass
        await db.leads.insert_one(lead)
        lead.pop('_id', None)
        if lead.get('visit_date'):
            schedule = generate_pipeline_schedule(lead['visit_date'])
            await db.pipeline_schedules.update_one({"client_name": lead['name']}, {"$set": {"client_name": lead['name'], "steps": schedule, "is_custom": False}}, upsert=True)
        count += 1
    return {"message": f"Imported {count} leads", "count": count}


@api_router.post("/leads/parse-email")
async def parse_email_to_lead(body: dict):
    text = body.get("text", "")
    return parse_lead_email(text)


@api_router.post("/leads")
async def create_lead(lead: LeadCreate, user=Depends(get_optional_user)):
    doc = lead.model_dump()
    if doc.get('status'):
        doc['status'] = normalize_status(doc['status'])
    doc['lead_id'] = str(uuid.uuid4())
    doc['created_at'] = datetime.now(timezone.utc).isoformat()
    if user and not doc.get('salesperson_id'):
        doc['salesperson_id'] = user["user_id"]
    if doc['visit_date'] and not doc['follow_up_date']:
        try:
            vd = datetime.strptime(doc['visit_date'], '%Y-%m-%d')
            doc['follow_up_date'] = (vd + timedelta(days=2)).strftime('%Y-%m-%d')
        except ValueError: pass
    await db.leads.insert_one(doc)
    doc.pop('_id', None)
    if doc.get('visit_date'):
        schedule = generate_pipeline_schedule(doc['visit_date'])
        await db.pipeline_schedules.update_one({"client_name": doc['name']}, {"$set": {"client_name": doc['name'], "steps": schedule, "is_custom": False}}, upsert=True)
    return {"message": "Lead created", "lead": doc}


@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, updates: LeadUpdate, user=Depends(get_optional_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if 'status' in update_data:
        update_data['status'] = normalize_status(update_data['status'])
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead updated"}


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user=Depends(get_current_user)):
    result = await db.leads.delete_one({"lead_id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}


@api_router.get("/leads")
async def get_leads(salesperson_id: Optional[str] = None, user=Depends(get_optional_user)):
    lead_filter = {}
    if user and user["role"] == "salesperson":
        lead_filter["salesperson_id"] = user["user_id"]
    elif user and user["role"] == "admin" and salesperson_id:
        lead_filter["salesperson_id"] = salesperson_id
    leads = await db.leads.find(lead_filter, {"_id": 0}).to_list(10000)
    if user and user["role"] == "admin" and leads:
        sp_map = {}
        users_list = await db.users.find({"role": "salesperson"}, {"_id": 0, "user_id": 1, "name": 1}).to_list(100)
        for u in users_list:
            sp_map[u["user_id"]] = u["name"]
        for l in leads:
            l["salesperson_name"] = sp_map.get(l.get("salesperson_id", ""), "")
    return {"leads": leads}


@api_router.post("/dashboard/refresh")
async def refresh_dashboard(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    config = await db.excel_config.find_one({}, {"_id": 0})
    excel_url = config.get('excel_url') if config else None
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Excel URL configured.")
    count = await import_sheet_to_db(excel_url)
    return {"message": f"Data refreshed - {count} leads imported", "count": count}


@api_router.get("/pay-periods")
async def get_pay_periods():
    periods = [{"name": n, "start": s.isoformat(), "end": e.isoformat()} for n, s, e in PAY_PERIODS]
    return {"pay_periods": periods}


@api_router.post("/config/excel")
async def set_excel_config(config: ExcelConfigCreate):
    await db.excel_config.update_one({}, {"$set": {"excel_url": config.excel_url, "last_updated": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"message": "Config saved"}


@api_router.get("/config/excel")
async def get_excel_config():
    config = await db.excel_config.find_one({}, {"_id": 0})
    return config or {"excel_url": ""}


# ═══════════════════════════════════════════════
# APP SETUP
# ═══════════════════════════════════════════════

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(pipeline_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import requests
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pay periods (bi-weekly) based on install date
PAY_PERIODS = [
    ("Dec 25, 2025 - Jan 07, 2026", datetime(2025, 12, 25), datetime(2026, 1, 7)),
    ("Jan 08, 2026 - Jan 21, 2026", datetime(2026, 1, 8), datetime(2026, 1, 21)),
    ("Jan 22, 2026 - Feb 04, 2026", datetime(2026, 1, 22), datetime(2026, 2, 4)),
    ("Feb 05, 2026 - Feb 18, 2026", datetime(2026, 2, 5), datetime(2026, 2, 18)),
    ("Feb 19, 2026 - Mar 04, 2026", datetime(2026, 2, 19), datetime(2026, 3, 4)),
    ("Mar 05, 2026 - Mar 18, 2026", datetime(2026, 3, 5), datetime(2026, 3, 18)),
    ("Mar 19, 2026 - Apr 01, 2026", datetime(2026, 3, 19), datetime(2026, 4, 1)),
    ("Apr 02, 2026 - Apr 15, 2026", datetime(2026, 4, 2), datetime(2026, 4, 15)),
    ("Apr 16, 2026 - Apr 29, 2026", datetime(2026, 4, 16), datetime(2026, 4, 29)),
    ("Apr 30, 2026 - May 13, 2026", datetime(2026, 4, 30), datetime(2026, 5, 13)),
    ("May 14, 2026 - May 27, 2026", datetime(2026, 5, 14), datetime(2026, 5, 27)),
    ("May 28, 2026 - Jun 10, 2026", datetime(2026, 5, 28), datetime(2026, 6, 10)),
    ("Jun 11, 2026 - Jun 24, 2026", datetime(2026, 6, 11), datetime(2026, 6, 24)),
    ("Jun 25, 2026 - Jul 08, 2026", datetime(2026, 6, 25), datetime(2026, 7, 8)),
    ("Jul 09, 2026 - Jul 22, 2026", datetime(2026, 7, 9), datetime(2026, 7, 22)),
    ("Jul 23, 2026 - Aug 05, 2026", datetime(2026, 7, 23), datetime(2026, 8, 5)),
    ("Aug 06, 2026 - Aug 19, 2026", datetime(2026, 8, 6), datetime(2026, 8, 19)),
    ("Aug 20, 2026 - Sep 02, 2026", datetime(2026, 8, 20), datetime(2026, 9, 2)),
    ("Sep 03, 2026 - Sep 16, 2026", datetime(2026, 9, 3), datetime(2026, 9, 16)),
    ("Sep 17, 2026 - Sep 30, 2026", datetime(2026, 9, 17), datetime(2026, 9, 30)),
    ("Oct 01, 2026 - Oct 14, 2026", datetime(2026, 10, 1), datetime(2026, 10, 14)),
    ("Oct 15, 2026 - Oct 28, 2026", datetime(2026, 10, 15), datetime(2026, 10, 28)),
    ("Oct 29, 2026 - Nov 11, 2026", datetime(2026, 10, 29), datetime(2026, 11, 11)),
    ("Nov 12, 2026 - Nov 25, 2026", datetime(2026, 11, 12), datetime(2026, 11, 25)),
    ("Nov 26, 2026 - Dec 09, 2026", datetime(2026, 11, 26), datetime(2026, 12, 9)),
    ("Dec 10, 2026 - Dec 23, 2026", datetime(2026, 12, 10), datetime(2026, 12, 23)),
    ("Dec 24, 2026 - Jan 06, 2027", datetime(2026, 12, 24), datetime(2027, 1, 6)),
    ("Jan 07, 2027 - Jan 20, 2027", datetime(2027, 1, 7), datetime(2027, 1, 20)),
]

# Models
class ExcelConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    excel_url: str
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExcelConfigCreate(BaseModel):
    excel_url: str

class KPIResponse(BaseModel):
    # Main Summary KPIs
    total_revenue: float
    total_commission: float  # Sum of Commission Value column for SALE rows
    closed_deals: int
    closing_rate: float
    total_visits: int
    average_ticket: float
    
    # Price Margin (5% commission sales)
    price_margin_total: float
    price_margin_sales_count: int
    price_margin_commission: float
    
    # SPIFF Section - from dedicated columns
    spiff_total: float
    spiff_breakdown: Dict[str, Any]  # {APCO X, Samsung, Mitsubishi, Other}
    
    # Follow-ups
    follow_ups: List[Dict[str, Any]]  # List of pending follow-ups with dates
    
    # Other metrics
    avg_commission_percent: float
    unit_type_count: Dict[str, int]
    unit_type_revenue: Dict[str, float]
    monthly_data: List[Dict[str, Any]]
    status_distribution: Dict[str, int]
    records: List[Dict[str, Any]]
    pay_periods: List[Dict[str, Any]]
    selected_pay_period: Optional[str] = None

def parse_excel_data(excel_url: str) -> pd.DataFrame:
    """Download and parse Excel file from URL"""
    try:
        logger.info(f"Downloading Excel from: {excel_url}")
        
        # Handle SharePoint URLs - convert to download format
        if 'sharepoint.com' in excel_url:
            if '?' in excel_url:
                base_url = excel_url.split('?')[0]
                excel_url = f"{base_url}?download=1"
            else:
                excel_url = f"{excel_url}?download=1"
        
        # Use session to handle redirects properly
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        response = session.get(excel_url, timeout=60, allow_redirects=True)
        response.raise_for_status()
        
        excel_data = BytesIO(response.content)
        df = pd.read_excel(excel_data, engine='openpyxl')
        
        logger.info(f"Excel columns: {df.columns.tolist()}")
        logger.info(f"Excel shape: {df.shape}")
        
        return df
    except Exception as e:
        logger.error(f"Error parsing Excel: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing Excel file: {str(e)}")

def normalize_status(status: str) -> str:
    """Normalize status values"""
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
    """Safely convert value to float"""
    if pd.isna(value):
        return default
    try:
        val = float(value)
        # Filter out Excel date serials (40000-50000 range)
        if 40000 <= val <= 50000:
            return default
        return val
    except (ValueError, TypeError):
        return default

def safe_date(value) -> Optional[datetime]:
    """Safely convert value to datetime"""
    if pd.isna(value):
        return None
    try:
        if isinstance(value, datetime):
            return value
        if isinstance(value, (int, float)):
            # Excel serial date conversion
            if 40000 <= value <= 50000:
                # Excel date serial: days since Dec 30, 1899
                return datetime(1899, 12, 30) + timedelta(days=int(value))
        if isinstance(value, str):
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%b %d, %Y']:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
        return pd.to_datetime(value)
    except:
        return None

def process_sales_data(df: pd.DataFrame, date_filter: str = "all", pay_period: str = None) -> KPIResponse:
    """Process sales data and calculate KPIs"""
    
    # Standardize column names - map to internal names
    column_mapping = {}
    original_columns = df.columns.tolist()
    
    for col in df.columns:
        col_lower = str(col).lower().strip()
        if col_lower == 'name':
            column_mapping[col] = 'name'
        elif col_lower == 'address':
            column_mapping[col] = 'address'
        elif col_lower == 'city':
            column_mapping[col] = 'city'
        elif col_lower in ['unit', 'unit type']:
            column_mapping[col] = 'unit_type'
        elif col_lower == 'ticket value' or (col_lower == 'ticket' and 'value' in str(df.columns).lower()):
            column_mapping[col] = 'ticket_value'
        elif col_lower == 'commission %':
            column_mapping[col] = 'commission_percent'
        elif col_lower == 'commission value':
            column_mapping[col] = 'commission_value'  # Actual commission paid
        elif col_lower == 'spif':
            column_mapping[col] = 'spif_total'
        elif col_lower == 'status':
            column_mapping[col] = 'status'
        elif col_lower == 'visit date':
            column_mapping[col] = 'visit_date'
        elif col_lower == 'close date':
            column_mapping[col] = 'close_date'
        elif col_lower == 'install date':
            column_mapping[col] = 'install_date'
        elif col_lower in ['folow up on self gen', 'follow up on', 'folow up on', 'follow up']:
            column_mapping[col] = 'follow_up_date'
        elif 'apco' in col_lower or 'apx' in col_lower:
            column_mapping[col] = 'apco_x'
        elif 'samsung' in col_lower:
            column_mapping[col] = 'samsung'
        elif 'mitsubishi' in col_lower or 'mits' in col_lower:
            column_mapping[col] = 'mitsubishi'
        elif 'surge' in col_lower and 'protector' in col_lower:
            column_mapping[col] = 'surge_protector'
        elif 'surge' in col_lower:
            column_mapping[col] = 'surge_protector'
        elif 'duct' in col_lower or 'dusct' in col_lower or 'celaning' in col_lower:
            column_mapping[col] = 'duct_cleaning'
    
    df = df.rename(columns=column_mapping)
    logger.info(f"Mapped columns: {list(df.columns)}")
    
    # Ensure required columns exist
    for col in ['name', 'status', 'unit_type', 'ticket_value', 'commission_value', 'commission_percent', 
                'visit_date', 'close_date', 'install_date', 'follow_up_date', 'spif_total',
                'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning']:
        if col not in df.columns:
            df[col] = None
    
    # Clean data
    df['status'] = df['status'].apply(normalize_status)
    df['ticket_value'] = df['ticket_value'].apply(lambda x: safe_float(x))
    df['commission_value'] = df['commission_value'].apply(lambda x: safe_float(x))
    df['spif_total'] = df['spif_total'].apply(lambda x: safe_float(x))
    df['apco_x'] = df['apco_x'].apply(lambda x: safe_float(x))
    df['samsung'] = df['samsung'].apply(lambda x: safe_float(x))
    df['mitsubishi'] = df['mitsubishi'].apply(lambda x: safe_float(x))
    df['surge_protector'] = df['surge_protector'].apply(lambda x: safe_float(x))
    df['duct_cleaning'] = df['duct_cleaning'].apply(lambda x: safe_float(x))
    
    # Commission percent handling
    def clean_commission_percent(x):
        val = safe_float(x)
        if val > 0 and val < 1:  # Already decimal like 0.05
            return val * 100
        return val
    df['commission_percent'] = df['commission_percent'].apply(clean_commission_percent)
    
    # Date handling
    df['visit_date'] = df['visit_date'].apply(safe_date)
    df['close_date'] = df['close_date'].apply(safe_date)
    df['install_date'] = df['install_date'].apply(safe_date)
    df['follow_up_date'] = df['follow_up_date'].apply(safe_date)
    
    # Apply date filter
    now = datetime.now(timezone.utc)
    start_date = None
    end_date = None
    
    if pay_period and pay_period != "all":
        for period_name, period_start, period_end in PAY_PERIODS:
            if period_name == pay_period:
                start_date = period_start
                end_date = period_end
                break
    elif date_filter == "week":
        start_date = now - timedelta(days=7)
    elif date_filter == "2weeks":
        start_date = now - timedelta(days=14)
    elif date_filter == "month":
        start_date = now - timedelta(days=30)
    elif date_filter == "year":
        start_date = now - timedelta(days=365)
    
    if start_date:
        start_naive = start_date.replace(tzinfo=None) if hasattr(start_date, 'tzinfo') and start_date.tzinfo else start_date
        end_naive = end_date.replace(tzinfo=None) if end_date and hasattr(end_date, 'tzinfo') and end_date.tzinfo else None
        
        if end_naive:
            df_filtered = df[
                df['install_date'].notna() & 
                (df['install_date'] >= start_naive) & 
                (df['install_date'] <= end_naive)
            ]
        else:
            df_filtered = df[
                (df['visit_date'].notna() & (df['visit_date'] >= start_naive)) |
                (df['close_date'].notna() & (df['close_date'] >= start_naive)) |
                (df['install_date'].notna() & (df['install_date'] >= start_naive))
            ]
        
        if len(df_filtered) == 0:
            df_filtered = df
    else:
        df_filtered = df
    
    # === CALCULATE KPIs ===
    closed_deals_df = df_filtered[df_filtered['status'] == 'SALE']
    lost_deals_df = df_filtered[df_filtered['status'] == 'LOST']
    pending_deals_df = df_filtered[df_filtered['status'] == 'PENDING']
    
    # === MAIN METRICS ===
    # Total Revenue = Sum of Ticket Value for SALE rows
    total_revenue = closed_deals_df['ticket_value'].sum()
    
    # Total Commission = Sum of Commission Value column for SALE rows (actual commissions paid)
    total_commission = closed_deals_df['commission_value'].sum()
    
    # Closed Deals count
    closed_deals = len(closed_deals_df)
    
    # Total deals for closing rate
    total_deals = len(df_filtered[df_filtered['status'].isin(['SALE', 'LOST', 'PENDING'])])
    closing_rate = (closed_deals / total_deals * 100) if total_deals > 0 else 0
    
    # Average Ticket
    average_ticket = total_revenue / closed_deals if closed_deals > 0 else 0
    
    # Total Visits
    total_visits = len(df_filtered[df_filtered['visit_date'].notna()])
    if total_visits == 0:
        total_visits = len(df_filtered)
    
    # Average Commission Percent
    valid_commission_pcts = closed_deals_df[closed_deals_df['commission_percent'] > 0]['commission_percent']
    avg_commission_percent = valid_commission_pcts.mean() if len(valid_commission_pcts) > 0 else 5.0
    
    # === PRICE MARGIN (5% commission only) ===
    price_margin_df = closed_deals_df[
        (closed_deals_df['commission_percent'] >= 4.5) & 
        (closed_deals_df['commission_percent'] <= 5.5)
    ]
    price_margin_total = price_margin_df['ticket_value'].sum()
    price_margin_sales_count = len(price_margin_df)
    price_margin_commission = price_margin_df['commission_value'].sum()
    
    # === SPIFF BREAKDOWN from dedicated columns ===
    spiff_breakdown = {}
    
    # APCO X
    apco_total = closed_deals_df['apco_x'].sum()
    apco_count = len(closed_deals_df[closed_deals_df['apco_x'] > 0])
    if apco_total > 0 or apco_count > 0:
        spiff_breakdown['APCO X'] = {
            'count': apco_count,
            'commission': round(apco_total, 2),
            'percent_of_sales': round((apco_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
    
    # Samsung
    samsung_total = closed_deals_df['samsung'].sum()
    samsung_count = len(closed_deals_df[closed_deals_df['samsung'] > 0])
    if samsung_total > 0 or samsung_count > 0:
        spiff_breakdown['Samsung'] = {
            'count': samsung_count,
            'commission': round(samsung_total, 2),
            'percent_of_sales': round((samsung_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
    
    # Mitsubishi
    mitsubishi_total = closed_deals_df['mitsubishi'].sum()
    mitsubishi_count = len(closed_deals_df[closed_deals_df['mitsubishi'] > 0])
    if mitsubishi_total > 0 or mitsubishi_count > 0:
        spiff_breakdown['Mitsubishi'] = {
            'count': mitsubishi_count,
            'commission': round(mitsubishi_total, 2),
            'percent_of_sales': round((mitsubishi_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
    
    # Surge Protector
    surge_total = closed_deals_df['surge_protector'].sum()
    surge_count = len(closed_deals_df[closed_deals_df['surge_protector'] > 0])
    if surge_total > 0 or surge_count > 0:
        spiff_breakdown['Surge Protector'] = {
            'count': surge_count,
            'commission': round(surge_total, 2),
            'percent_of_sales': round((surge_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
    
    # Duct Cleaning
    duct_total = closed_deals_df['duct_cleaning'].sum()
    duct_count = len(closed_deals_df[closed_deals_df['duct_cleaning'] > 0])
    if duct_total > 0 or duct_count > 0:
        spiff_breakdown['Duct Cleaning'] = {
            'count': duct_count,
            'commission': round(duct_total, 2),
            'percent_of_sales': round((duct_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
    
    # Other SPIFF from SPIF column (not in named columns)
    named_spiff_total = apco_total + samsung_total + mitsubishi_total + surge_total + duct_total
    other_spiff = closed_deals_df['spif_total'].sum() - named_spiff_total
    if other_spiff < 0:
        other_spiff = closed_deals_df['spif_total'].sum()  # If columns don't exist, use total
    other_count = len(closed_deals_df[closed_deals_df['spif_total'] > 0]) - apco_count - samsung_count - mitsubishi_count
    if other_count < 0:
        other_count = len(closed_deals_df[closed_deals_df['spif_total'] > 0])
    
    if other_spiff > 0 or other_count > 0:
        spiff_breakdown['Other'] = {
            'count': max(0, other_count),
            'commission': round(max(0, other_spiff), 2),
            'percent_of_sales': round((max(0, other_count) / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
    
    spiff_total = apco_total + samsung_total + mitsubishi_total + max(0, other_spiff)
    
    # === FOLLOW-UPS (pending follow-ups with dates) ===
    follow_ups = []
    today = datetime.now().replace(tzinfo=None)
    
    # Get records with follow-up dates that are not SALE or have pending status
    follow_up_df = df_filtered[
        df_filtered['follow_up_date'].notna() & 
        (df_filtered['status'] != 'SALE')
    ].copy()
    
    for _, row in follow_up_df.iterrows():
        follow_date = row.get('follow_up_date')
        if follow_date:
            days_until = (follow_date - today).days if follow_date else None
            follow_ups.append({
                'name': str(row.get('name', '')),
                'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
                'status': str(row.get('status', '')),
                'follow_up_date': follow_date.strftime('%Y-%m-%d') if follow_date else '',
                'days_until': days_until,
                'is_urgent': days_until is not None and days_until <= 7  # Urgent if within 7 days
            })
    
    # Sort by date (closest first)
    follow_ups.sort(key=lambda x: x.get('follow_up_date', '9999-99-99'))
    
    # === UNIT TYPE BREAKDOWN ===
    unit_type_count = {}
    unit_type_revenue = {}
    
    for _, row in closed_deals_df.iterrows():
        unit = row.get('unit_type', 'Unknown')
        if pd.isna(unit) or not unit:
            unit = 'Unknown'
        unit = str(unit).strip()
        
        unit_type_count[unit] = unit_type_count.get(unit, 0) + 1
        unit_type_revenue[unit] = unit_type_revenue.get(unit, 0) + safe_float(row.get('ticket_value', 0))
    
    # === STATUS DISTRIBUTION ===
    status_distribution = {
        'SALE': len(closed_deals_df),
        'LOST': len(lost_deals_df),
        'PENDING': len(pending_deals_df)
    }
    
    # === MONTHLY DATA (chronological) ===
    monthly_data = []
    month_year_data = {}
    
    for _, row in closed_deals_df.iterrows():
        date_field = row.get('install_date') or row.get('close_date')
        if date_field and pd.notna(date_field):
            try:
                month_key = (int(date_field.year), int(date_field.month))
                if month_key not in month_year_data:
                    month_year_data[month_key] = {'revenue': 0, 'deals': 0, 'commission': 0}
                month_year_data[month_key]['revenue'] += safe_float(row.get('ticket_value', 0))
                month_year_data[month_key]['deals'] += 1
                month_year_data[month_key]['commission'] += safe_float(row.get('commission_value', 0))
            except (ValueError, AttributeError):
                continue
    
    sorted_months = sorted(month_year_data.keys())
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    for year, month in sorted_months:
        data = month_year_data[(year, month)]
        month_idx = month - 1
        monthly_data.append({
            'month': f"{month_names[month_idx]} {year}",
            'month_short': month_names[month_idx],
            'year': year,
            'revenue': round(data['revenue'], 2),
            'deals': data['deals'],
            'commission': round(data['commission'], 2)
        })
    
    # === PAY PERIODS DATA ===
    pay_periods_data = []
    for period_name, period_start, period_end in PAY_PERIODS:
        period_df = df[
            df['install_date'].notna() & 
            (df['install_date'] >= period_start) & 
            (df['install_date'] <= period_end) &
            (df['status'] == 'SALE')
        ]
        pay_periods_data.append({
            'name': period_name,
            'deals': len(period_df),
            'revenue': period_df['ticket_value'].sum()
        })
    
    # === RECORDS for table ===
    records = []
    for _, row in df_filtered.head(50).iterrows():
        records.append({
            'name': str(row.get('name', '')),
            'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
            'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
            'ticket_value': safe_float(row.get('ticket_value', 0)),
            'commission_percent': safe_float(row.get('commission_percent', 0)),
            'commission_value': safe_float(row.get('commission_value', 0)),
            'spif_total': safe_float(row.get('spif_total', 0)),
            'status': str(row.get('status', '')),
            'visit_date': row.get('visit_date').strftime('%Y-%m-%d') if pd.notna(row.get('visit_date')) else '',
            'close_date': row.get('close_date').strftime('%Y-%m-%d') if pd.notna(row.get('close_date')) else '',
            'install_date': row.get('install_date').strftime('%Y-%m-%d') if pd.notna(row.get('install_date')) else ''
        })
    
    return KPIResponse(
        # Main Summary KPIs
        total_revenue=round(total_revenue, 2),
        total_commission=round(total_commission, 2),
        closed_deals=closed_deals,
        closing_rate=round(closing_rate, 1),
        total_visits=total_visits,
        average_ticket=round(average_ticket, 2),
        
        # Price Margin (5%)
        price_margin_total=round(price_margin_total, 2),
        price_margin_sales_count=price_margin_sales_count,
        price_margin_commission=round(price_margin_commission, 2),
        
        # SPIFF
        spiff_total=round(spiff_total, 2),
        spiff_breakdown=spiff_breakdown,
        
        # Follow-ups
        follow_ups=follow_ups,
        
        # Other
        avg_commission_percent=round(avg_commission_percent, 2),
        unit_type_count=unit_type_count,
        unit_type_revenue=unit_type_revenue,
        monthly_data=monthly_data,
        status_distribution=status_distribution,
        records=records,
        pay_periods=pay_periods_data,
        selected_pay_period=pay_period
    )

# Routes
@api_router.get("/")
async def root():
    return {"message": "Sales Dashboard API"}

@api_router.post("/config/excel")
async def set_excel_config(config: ExcelConfigCreate):
    """Set the Excel file URL configuration"""
    config_obj = ExcelConfig(excel_url=config.excel_url)
    doc = config_obj.model_dump()
    doc['last_updated'] = doc['last_updated'].isoformat()
    
    await db.excel_config.delete_many({})
    await db.excel_config.insert_one(doc)
    
    return {"message": "Excel configuration saved", "id": config_obj.id}

@api_router.get("/config/excel")
async def get_excel_config():
    """Get the current Excel file URL configuration"""
    config = await db.excel_config.find_one({}, {"_id": 0})
    if not config:
        return {"excel_url": None}
    return config

@api_router.get("/dashboard/kpis")
async def get_dashboard_kpis(excel_url: Optional[str] = None, date_filter: str = "all", pay_period: Optional[str] = None):
    """Get KPIs from Excel data"""
    if not excel_url:
        config = await db.excel_config.find_one({}, {"_id": 0})
        if config:
            excel_url = config.get('excel_url')
    
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Excel URL configured.")
    
    df = parse_excel_data(excel_url)
    kpis = process_sales_data(df, date_filter, pay_period)
    
    return kpis

@api_router.post("/dashboard/refresh")
async def refresh_dashboard(excel_url: Optional[str] = None, date_filter: str = "all", pay_period: Optional[str] = None):
    """Refresh dashboard data from Excel"""
    if not excel_url:
        config = await db.excel_config.find_one({}, {"_id": 0})
        if config:
            excel_url = config.get('excel_url')
    
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Excel URL configured.")
    
    df = parse_excel_data(excel_url)
    kpis = process_sales_data(df, date_filter, pay_period)
    
    await db.refresh_history.insert_one({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "records_count": len(kpis.records)
    })
    
    return {"message": "Data refreshed successfully", "kpis": kpis}

@api_router.get("/pay-periods")
async def get_pay_periods():
    """Get list of all pay periods"""
    periods = [{"name": name, "start": start.isoformat(), "end": end.isoformat()} 
               for name, start, end in PAY_PERIODS]
    return {"pay_periods": periods}

# Include the router
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

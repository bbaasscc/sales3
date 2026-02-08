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

class SalesRecord(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    unit_type: Optional[str] = None
    ticket_value: Optional[float] = None
    commission: Optional[float] = None
    commission_percent: Optional[float] = None
    status: Optional[str] = None
    visit_date: Optional[str] = None
    close_date: Optional[str] = None
    loss_reason: Optional[str] = None
    comments: Optional[str] = None
    closed_on_first_visit: Optional[str] = None
    feeling: Optional[str] = None
    sales_cycle_days: Optional[int] = None

class KPIResponse(BaseModel):
    total_revenue: float
    total_commission: float
    spiff_commission: float
    total_commission_with_spiff: float
    avg_commission_percent: float
    closed_deals: int
    closing_rate: float
    average_ticket: float
    total_visits: int
    avg_sales_cycle_days: float
    price_margin: float
    unit_type_count: Dict[str, int]
    unit_type_revenue: Dict[str, float]
    monthly_data: List[Dict[str, Any]]
    weekly_data: List[Dict[str, Any]]
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
            # Remove any query parameters and add download=1
            if '?' in excel_url:
                base_url = excel_url.split('?')[0]
                excel_url = f"{base_url}?download=1"
            else:
                excel_url = f"{excel_url}?download=1"
        
        # Use session to handle redirects properly
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
        return float(value)
    except (ValueError, TypeError):
        return default

def safe_date(value) -> Optional[datetime]:
    """Safely convert value to datetime"""
    if pd.isna(value):
        return None
    try:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            # Try multiple date formats
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
    
    # Standardize column names
    column_mapping = {}
    for col in df.columns:
        col_lower = str(col).lower().strip()
        if 'name' in col_lower and col_lower == 'name':
            column_mapping[col] = 'name'
        elif 'address' in col_lower:
            column_mapping[col] = 'address'
        elif 'city' in col_lower:
            column_mapping[col] = 'city'
        elif 'unit' in col_lower and 'type' in col_lower:
            column_mapping[col] = 'unit_type'
        elif 'ticket' in col_lower and 'value' in col_lower:
            column_mapping[col] = 'ticket_value'
        elif 'commission' in col_lower and '%' in col_lower:
            column_mapping[col] = 'commission_percent'
        elif col_lower == 'spif':
            column_mapping[col] = 'spif_commission'
        elif col_lower == 'commission value':
            column_mapping[col] = 'calc_commission'
        elif 'spif' in col_lower and 'description' in col_lower:
            column_mapping[col] = 'spif_description'
        elif col_lower == 'status':
            column_mapping[col] = 'status'
        elif 'visit' in col_lower and 'date' in col_lower:
            column_mapping[col] = 'visit_date'
        elif 'close' in col_lower and 'date' in col_lower:
            column_mapping[col] = 'close_date'
        elif 'install' in col_lower and 'date' in col_lower:
            column_mapping[col] = 'install_date'
        elif 'loss' in col_lower and 'reason' in col_lower:
            column_mapping[col] = 'loss_reason'
        elif 'comment' in col_lower:
            column_mapping[col] = 'comments'
        elif 'first' in col_lower and 'visit' in col_lower:
            column_mapping[col] = 'closed_on_first_visit'
        elif 'feeling' in col_lower:
            column_mapping[col] = 'feeling'
    
    df = df.rename(columns=column_mapping)
    
    # Ensure required columns exist
    required_cols = ['name', 'status', 'unit_type', 'ticket_value', 'visit_date', 'close_date', 'install_date', 'commission_percent', 'spif_commission']
    for col in required_cols:
        if col not in df.columns:
            df[col] = None
    
    # Clean and normalize data
    df['status'] = df['status'].apply(normalize_status)
    
    # Process ticket_value - filter out values that look like Excel date serials (40000-50000 range)
    def clean_ticket_value(x):
        val = safe_float(x)
        # Excel date serials for 2020-2030 are roughly 43000-47000
        # Filter out these invalid values but keep real ticket values
        if 40000 <= val <= 50000:
            return 0.0  # Likely an Excel date serial, not a real value
        return val
    
    df['ticket_value'] = df['ticket_value'].apply(clean_ticket_value)
    
    # Commission percent - stored as decimal (0.08 = 8%)
    df['commission_percent'] = df['commission_percent'].apply(lambda x: safe_float(x) * 100 if safe_float(x) < 1 else safe_float(x))
    df['spif_commission'] = df['spif_commission'].apply(lambda x: safe_float(x))
    df['visit_date'] = df['visit_date'].apply(safe_date)
    df['close_date'] = df['close_date'].apply(safe_date)
    df['install_date'] = df['install_date'].apply(safe_date)
    
    # Apply date filter
    now = datetime.now(timezone.utc)
    start_date = None
    end_date = None
    
    # Check if filtering by pay period (based on install_date)
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
            # Filter by pay period using install_date
            df_filtered = df[
                df['install_date'].notna() & 
                (df['install_date'] >= start_naive) & 
                (df['install_date'] <= end_naive)
            ]
        else:
            # Filter by general date range
            df_filtered = df[
                (df['visit_date'].notna() & (df['visit_date'] >= start_naive)) |
                (df['close_date'].notna() & (df['close_date'] >= start_naive)) |
                (df['install_date'].notna() & (df['install_date'] >= start_naive))
            ]
        
        if len(df_filtered) == 0:
            df_filtered = df  # Fallback to all data if no matches
    else:
        df_filtered = df
    
    # Calculate KPIs
    closed_deals_df = df_filtered[df_filtered['status'] == 'SALE']
    lost_deals_df = df_filtered[df_filtered['status'] == 'LOST']
    pending_deals_df = df_filtered[df_filtered['status'] == 'PENDING']
    
    # Total Revenue (sum of ticket values for closed deals)
    total_revenue = closed_deals_df['ticket_value'].sum()
    
    # Commission calculations
    commission_rate = 5.0  # Default 5%
    
    # Calculate commission based on ticket value
    # If commission_percent is filled, use it; otherwise use default 5%
    commission_values = []
    commission_percents_used = []
    
    for _, row in closed_deals_df.iterrows():
        ticket = safe_float(row.get('ticket_value', 0))
        comm_pct = safe_float(row.get('commission_percent', 0))  # Already converted to percentage
        
        if ticket > 0:
            if comm_pct > 0:
                commission_values.append(ticket * (comm_pct / 100))
                commission_percents_used.append(comm_pct)
            else:
                commission_values.append(ticket * (commission_rate / 100))
                commission_percents_used.append(commission_rate)
    
    total_commission = sum(commission_values)
    
    # SPIFF Commission (separate)
    spiff_commission = closed_deals_df['spif_commission'].sum()
    
    # Total Commission with SPIFF
    total_commission_with_spiff = total_commission + spiff_commission
    
    # Average Commission Percentage (from actually used percentages)
    avg_commission_percent = sum(commission_percents_used) / len(commission_percents_used) if commission_percents_used else commission_rate
    
    # Closed Deals count
    closed_deals = len(closed_deals_df)
    
    # Total deals (excluding unknown status)
    total_deals = len(df_filtered[df_filtered['status'].isin(['SALE', 'LOST', 'PENDING'])])
    
    # Closing Rate
    closing_rate = (closed_deals / total_deals * 100) if total_deals > 0 else 0
    
    # Average Ticket
    average_ticket = total_revenue / closed_deals if closed_deals > 0 else 0
    
    # Total Visits (count of records with visit_date or all records)
    total_visits = len(df_filtered[df_filtered['visit_date'].notna()])
    if total_visits == 0:
        total_visits = len(df_filtered)
    
    # Average Sales Cycle Days
    sales_cycles = []
    for _, row in closed_deals_df.iterrows():
        if row['visit_date'] and row['close_date']:
            cycle = (row['close_date'] - row['visit_date']).days
            if cycle >= 0:
                sales_cycles.append(cycle)
    avg_sales_cycle = sum(sales_cycles) / len(sales_cycles) if sales_cycles else 0
    
    # Price Margin (commission with 5%)
    price_margin = total_commission
    
    # Unit Type breakdown
    unit_type_count = {}
    unit_type_revenue = {}
    
    for _, row in closed_deals_df.iterrows():
        unit = row.get('unit_type', 'Unknown')
        if pd.isna(unit) or not unit:
            unit = 'Unknown'
        unit = str(unit).strip()
        
        unit_type_count[unit] = unit_type_count.get(unit, 0) + 1
        unit_type_revenue[unit] = unit_type_revenue.get(unit, 0) + safe_float(row.get('ticket_value', 0))
    
    # Status distribution
    status_distribution = {
        'SALE': len(closed_deals_df),
        'LOST': len(lost_deals_df),
        'PENDING': len(pending_deals_df)
    }
    
    # Monthly aggregation - sorted chronologically
    monthly_data = []
    
    # Get all months with data, sorted
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
                # Calculate commission for this row
                ticket = safe_float(row.get('ticket_value', 0))
                comm_pct = safe_float(row.get('commission_percent', 0))  # Already in percentage
                if comm_pct > 0:
                    month_year_data[month_key]['commission'] += ticket * (comm_pct / 100)
                else:
                    month_year_data[month_key]['commission'] += ticket * (commission_rate / 100)
            except (ValueError, AttributeError):
                continue
    
    # Sort by year and month
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
    
    # Weekly aggregation (last 8 weeks)
    weekly_data = []
    for week in range(7, -1, -1):
        week_start = now - timedelta(days=7 * (week + 1))
        week_end = now - timedelta(days=7 * week)
        week_df = closed_deals_df[
            closed_deals_df['close_date'].notna() &
            (closed_deals_df['close_date'] >= week_start.replace(tzinfo=None)) &
            (closed_deals_df['close_date'] < week_end.replace(tzinfo=None))
        ]
        weekly_data.append({
            'week': f"W{8-week}",
            'revenue': week_df['ticket_value'].sum(),
            'deals': len(week_df)
        })
    
    # Get available pay periods with data
    pay_periods_data = []
    for period_name, period_start, period_end in PAY_PERIODS:
        period_df = df[
            df['install_date'].notna() & 
            (df['install_date'] >= period_start) & 
            (df['install_date'] <= period_end) &
            (df['status'] == 'SALE')
        ]
        if len(period_df) > 0 or True:  # Include all periods
            pay_periods_data.append({
                'name': period_name,
                'deals': len(period_df),
                'revenue': period_df['ticket_value'].sum()
            })
    
    # Convert records to list of dicts for response
    records = []
    for _, row in df_filtered.head(50).iterrows():
        records.append({
            'name': str(row.get('name', '')),
            'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
            'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
            'ticket_value': safe_float(row.get('ticket_value', 0)),
            'commission_percent': safe_float(row.get('commission_percent', 0)),
            'spif_commission': safe_float(row.get('spif_commission', 0)),
            'status': str(row.get('status', '')),
            'visit_date': row.get('visit_date').strftime('%Y-%m-%d') if pd.notna(row.get('visit_date')) else '',
            'close_date': row.get('close_date').strftime('%Y-%m-%d') if pd.notna(row.get('close_date')) else '',
            'install_date': row.get('install_date').strftime('%Y-%m-%d') if pd.notna(row.get('install_date')) else ''
        })
    
    return KPIResponse(
        total_revenue=round(total_revenue, 2),
        total_commission=round(total_commission, 2),
        spiff_commission=round(spiff_commission, 2),
        total_commission_with_spiff=round(total_commission_with_spiff, 2),
        avg_commission_percent=round(avg_commission_percent, 2),
        closed_deals=closed_deals,
        closing_rate=round(closing_rate, 1),
        average_ticket=round(average_ticket, 2),
        total_visits=total_visits,
        avg_sales_cycle_days=round(avg_sales_cycle, 1),
        price_margin=round(price_margin, 2),
        unit_type_count=unit_type_count,
        unit_type_revenue=unit_type_revenue,
        monthly_data=monthly_data,
        weekly_data=weekly_data,
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
    
    # Upsert - only keep one config
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
    # Get URL from parameter or database
    if not excel_url:
        config = await db.excel_config.find_one({}, {"_id": 0})
        if config:
            excel_url = config.get('excel_url')
    
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Excel URL configured. Please set an Excel URL first.")
    
    # Parse Excel and calculate KPIs
    df = parse_excel_data(excel_url)
    kpis = process_sales_data(df, date_filter, pay_period)
    
    return kpis

@api_router.post("/dashboard/refresh")
async def refresh_dashboard(excel_url: Optional[str] = None, date_filter: str = "all", pay_period: Optional[str] = None):
    """Refresh dashboard data from Excel"""
    # Get URL from parameter or database
    if not excel_url:
        config = await db.excel_config.find_one({}, {"_id": 0})
        if config:
            excel_url = config.get('excel_url')
    
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Excel URL configured.")
    
    # Parse Excel and calculate KPIs
    df = parse_excel_data(excel_url)
    kpis = process_sales_data(df, date_filter, pay_period)
    
    # Store refresh timestamp
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

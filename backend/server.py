from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from passlib.context import CryptContext
import jwt

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

# === AUTH UTILITIES ===
JWT_SECRET = os.environ.get('JWT_SECRET', str(uuid.uuid4()))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        return user
    except Exception:
        return None

# === USER MODELS ===
class UserRegister(BaseModel):
    email: str
    name: str
    customer_number: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

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

class FollowUpActionCreate(BaseModel):
    client_name: str
    step_id: str  # "d0_email", "d0_sms", "d2_email", etc.

class ClientNoteCreate(BaseModel):
    client_name: str
    next_follow_up: str = ""
    comment: str = ""
    priority: str = "high"  # high, medium, low

class LeadCreate(BaseModel):
    customer_number: str = ""
    name: str = ""
    address: str = ""
    city: str = ""
    email: str = ""
    phone: str = ""
    unit_type: str = ""
    ticket_value: float = 0
    commission_percent: float = 0
    commission_value: float = 0
    spif_total: float = 0
    status: str = "PENDING"
    visit_date: str = ""
    close_date: str = ""
    install_date: str = ""
    follow_up_date: str = ""
    loss_reason: str = ""
    comments: str = ""
    feeling: str = ""
    objections: str = ""
    duct_cleaning: float = 0
    apco_x: float = 0
    samsung: float = 0
    mitsubishi: float = 0
    surge_protector: float = 0
    self_gen_mits: float = 0

class LeadUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_number: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    unit_type: Optional[str] = None
    ticket_value: Optional[float] = None
    commission_percent: Optional[float] = None
    commission_value: Optional[float] = None
    spif_total: Optional[float] = None
    status: Optional[str] = None
    visit_date: Optional[str] = None
    close_date: Optional[str] = None
    install_date: Optional[str] = None
    follow_up_date: Optional[str] = None
    loss_reason: Optional[str] = None
    comments: Optional[str] = None
    feeling: Optional[str] = None
    objections: Optional[str] = None
    duct_cleaning: Optional[float] = None
    apco_x: Optional[float] = None
    samsung: Optional[float] = None
    mitsubishi: Optional[float] = None
    surge_protector: Optional[float] = None
    self_gen_mits: Optional[float] = None

class PipelineScheduleUpdate(BaseModel):
    client_name: str
    steps: List[Dict[str, Any]]  # [{id, scheduled_date, comment}]

class KPIResponse(BaseModel):
    # Main Summary KPIs (based on close_date - when sales are closed)
    total_revenue: float
    total_commission: float  # Sum of Commission Value column for SALE rows
    closed_deals: int
    closing_rate: float
    total_visits: int
    average_ticket: float
    
    # Commission Payment (based on install_date - when commission is actually paid)
    commission_payment_count: int
    commission_payment_revenue: float
    commission_payment_amount: float
    commission_payment_spiff: float
    
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
    """Download and parse Excel file from URL (supports Google Sheets, SharePoint, direct URLs)"""
    try:
        logger.info(f"Downloading Excel from: {excel_url}")
        
        # Handle Google Sheets URLs - convert to export format
        if 'docs.google.com/spreadsheets' in excel_url:
            # Extract sheet ID from various Google Sheets URL formats
            if '/d/' in excel_url:
                sheet_id = excel_url.split('/d/')[1].split('/')[0].split('?')[0]
                excel_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
                logger.info(f"Converted to Google Sheets export URL: {excel_url}")
        
        # Handle SharePoint URLs - convert to download format
        elif 'sharepoint.com' in excel_url:
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
    # Handle Series (duplicate columns) - take first value
    if isinstance(value, pd.Series):
        value = value.iloc[0] if len(value) > 0 else default
    
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
    except Exception:
        return None

def process_sales_data(df: pd.DataFrame, date_filter: str = "all", pay_period: str = None, from_db: bool = False) -> KPIResponse:
    """Process sales data and calculate KPIs"""
    
    if not from_db:
        # Standardize column names - map to internal names (only for Sheet data)
        column_mapping = {}
    
        for col in df.columns:
            col_lower = str(col).lower().strip()
            if col_lower == '#' or col_lower == 'number':
                column_mapping[col] = 'customer_number'
            elif col_lower == 'name':
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
            elif 'self gen' in col_lower and 'mits' in col_lower:
                column_mapping[col] = 'self_gen_mits'
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
            df = df.loc[:, ~df.columns.duplicated()]
            logger.info(f"Mapped columns: {list(df.columns)}")
    
    # Ensure required columns exist
    for col in ['customer_number', 'name', 'status', 'unit_type', 'ticket_value', 'commission_value', 'commission_percent', 
                'visit_date', 'close_date', 'install_date', 'follow_up_date', 'spif_total',
                'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']:
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
    df['self_gen_mits'] = df['self_gen_mits'].apply(lambda x: safe_float(x))
    
    # Commission percent handling
    def clean_commission_percent(x):
        val = safe_float(x)
        if val > 0 and val < 1:  # Already decimal like 0.05
            return round(val * 100, 2)
        return round(val, 2)
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
    
    logger.info(f"Filtering with pay_period='{pay_period}', date_filter='{date_filter}'")
    
    if pay_period and pay_period != "all":
        for period_name, period_start, period_end in PAY_PERIODS:
            if period_name == pay_period:
                start_date = period_start
                end_date = period_end
                logger.info(f"Found matching period: {period_name}, start={period_start}, end={period_end}")
                break
        if not start_date:
            logger.warning(f"Pay period '{pay_period}' not found in PAY_PERIODS list")
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
        # Fix: end_date is a naive datetime, don't check tzinfo
        end_naive = end_date if end_date else None
        
        logger.info(f"Date range: {start_naive} to {end_naive}")
        
        if end_naive:
            # Pay period filter - TWO separate filters:
            # 1. df_filtered_close: Sales closed in the period (for main metrics)
            df_filtered_close = df[
                df['close_date'].notna() & 
                (df['close_date'] >= start_naive) & 
                (df['close_date'] <= end_naive)
            ]
            
            # 2. df_filtered_install: Installations in the period (for commission payment)
            df_filtered_install = df[
                df['install_date'].notna() & 
                (df['install_date'] >= start_naive) & 
                (df['install_date'] <= end_naive)
            ]
            
            logger.info(f"Close date filter: {len(df_filtered_close)} records")
            logger.info(f"Install date filter: {len(df_filtered_install)} records")
        else:
            # Quick filter (week, month, etc.) - use close_date
            df_filtered_close = df[
                df['close_date'].notna() & (df['close_date'] >= start_naive)
            ]
            df_filtered_install = df[
                df['install_date'].notna() & (df['install_date'] >= start_naive)
            ]
    else:
        df_filtered_close = df
        df_filtered_install = df
    
    # For backward compatibility
    df_filtered = df_filtered_close
    
    # === MAIN METRICS (based on close_date) ===
    closed_deals_df = df_filtered_close[df_filtered_close['status'] == 'SALE']
    lost_deals_df = df_filtered_close[df_filtered_close['status'] == 'LOST']
    pending_deals_df = df_filtered_close[df_filtered_close['status'] == 'PENDING']
    
    # === COMMISSION PAYMENT METRICS (based on install_date) ===
    installed_deals_df = df_filtered_install[df_filtered_install['status'] == 'SALE']
    
    # === LEADS & CLOSING RATE (based on visit_date) ===
    # Leads = visits within the period
    # Closed Deals = from those leads, how many became SALE
    if start_date and end_naive:
        # Get leads (visits) within the pay period date range
        leads_df = df[
            df['visit_date'].notna() & 
            (df['visit_date'] >= start_naive) & 
            (df['visit_date'] <= end_naive)
        ]
        total_visits = len(leads_df)
        # From those leads, count how many converted to SALE
        leads_converted = len(leads_df[leads_df['status'] == 'SALE'])
    else:
        # No period filter - count all visits
        leads_df = df[df['visit_date'].notna()]
        total_visits = len(leads_df)
        leads_converted = len(leads_df[leads_df['status'] == 'SALE'])
    
    if total_visits == 0:
        total_visits = len(df_filtered)
        leads_converted = len(closed_deals_df)
    
    # Closed Deals = leads converted to SALE (consistent with Leads and Closing Rate)
    closed_deals = leads_converted
    
    # Closing Rate = Closed Deals / Total Leads
    closing_rate = (closed_deals / total_visits * 100) if total_visits > 0 else 0
    
    # === MAIN METRICS (based on close_date - sales closed in period) ===
    # Total Revenue = Sum of Ticket Value for sales closed in period
    total_revenue = closed_deals_df['ticket_value'].sum()
    
    # Total Commission = Sum of Commission Value for sales closed in period
    total_commission = closed_deals_df['commission_value'].sum()
    
    # Average Ticket = Revenue / Closed Deals
    average_ticket = total_revenue / closed_deals if closed_deals > 0 else 0
    
    # Average Commission Percent
    valid_commission_pcts = closed_deals_df[closed_deals_df['commission_percent'] > 0]['commission_percent']
    avg_commission_percent = valid_commission_pcts.mean() if len(valid_commission_pcts) > 0 else 5.0
    
    # === COMMISSION PAYMENT (based on install_date - when commission is actually paid) ===
    commission_payment_count = len(installed_deals_df)
    commission_payment_revenue = installed_deals_df['ticket_value'].sum()
    commission_payment_amount = installed_deals_df['commission_value'].sum()
    commission_payment_spiff = installed_deals_df['spif_total'].sum() if 'spif_total' in installed_deals_df.columns else 0
    
    # === PRICE MARGIN (5% commission only) - based on close_date ===
    price_margin_df = closed_deals_df[
        (closed_deals_df['commission_percent'] >= 4.5) & 
        (closed_deals_df['commission_percent'] <= 5.5)
    ]
    price_margin_total = price_margin_df['ticket_value'].sum()
    price_margin_sales_count = len(price_margin_df)
    price_margin_commission = price_margin_df['commission_value'].sum()
    
    # === SPIFF BREAKDOWN from dedicated columns ONLY (no Other) ===
    spiff_breakdown = {}
    spiff_total = 0.0
    
    # APCO X
    apco_total = closed_deals_df['apco_x'].sum()
    apco_count = len(closed_deals_df[closed_deals_df['apco_x'] > 0])
    if apco_total > 0 or apco_count > 0:
        spiff_breakdown['APCO X'] = {
            'count': apco_count,
            'commission': round(apco_total, 2),
            'percent_of_sales': round((apco_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
        spiff_total += apco_total
    
    # Samsung
    samsung_total = closed_deals_df['samsung'].sum()
    samsung_count = len(closed_deals_df[closed_deals_df['samsung'] > 0])
    if samsung_total > 0 or samsung_count > 0:
        spiff_breakdown['Samsung'] = {
            'count': samsung_count,
            'commission': round(samsung_total, 2),
            'percent_of_sales': round((samsung_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
        spiff_total += samsung_total
    
    # Mitsubishi
    mitsubishi_total = closed_deals_df['mitsubishi'].sum()
    mitsubishi_count = len(closed_deals_df[closed_deals_df['mitsubishi'] > 0])
    if mitsubishi_total > 0 or mitsubishi_count > 0:
        spiff_breakdown['Mitsubishi'] = {
            'count': mitsubishi_count,
            'commission': round(mitsubishi_total, 2),
            'percent_of_sales': round((mitsubishi_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
        spiff_total += mitsubishi_total
    
    # Surge Protector
    surge_total = closed_deals_df['surge_protector'].sum()
    surge_count = len(closed_deals_df[closed_deals_df['surge_protector'] > 0])
    if surge_total > 0 or surge_count > 0:
        spiff_breakdown['Surge Protector'] = {
            'count': surge_count,
            'commission': round(surge_total, 2),
            'percent_of_sales': round((surge_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
        spiff_total += surge_total
    
    # Duct Cleaning
    duct_total = closed_deals_df['duct_cleaning'].sum()
    duct_count = len(closed_deals_df[closed_deals_df['duct_cleaning'] > 0])
    if duct_total > 0 or duct_count > 0:
        spiff_breakdown['Duct Cleaning'] = {
            'count': duct_count,
            'commission': round(duct_total, 2),
            'percent_of_sales': round((duct_count / closed_deals * 100), 1) if closed_deals > 0 else 0
        }
        spiff_total += duct_total
    
    # === FOLLOW-UPS (pending follow-ups with dates) ===
    # Follow-ups are based on visit_date (not install_date) since they haven't been sold yet
    follow_ups = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    
    # Get ALL records with follow-up dates that are not SALE (pending leads)
    # Filter by visit_date if pay period is selected (has both start and end date)
    if start_date and end_naive:
        # Pay period selected - filter by visit_date within period
        follow_up_df = df[
            df['follow_up_date'].notna() & 
            (df['status'] != 'SALE') &
            df['visit_date'].notna() &
            (df['visit_date'] >= start_naive) & 
            (df['visit_date'] <= end_naive)
        ].copy()
    else:
        # No pay period or only quick filter - show all pending follow-ups
        follow_up_df = df[
            df['follow_up_date'].notna() & 
            (df['status'] != 'SALE')
        ].copy()
    
    for _, row in follow_up_df.iterrows():
        follow_date = row.get('follow_up_date')
        if pd.notna(follow_date):
            days_until = (follow_date - today).days
            visit_date = row.get('visit_date')
            follow_ups.append({
                'lead_id': str(row.get('lead_id', '')) if pd.notna(row.get('lead_id', None)) else '',
                'customer_number': str(row.get('customer_number', '')) if pd.notna(row.get('customer_number', None)) else '',
                'name': str(row.get('name', '')),
                'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
                'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
                'status': str(row.get('status', '')),
                'follow_up_date': follow_date.strftime('%Y-%m-%d') if pd.notna(follow_date) else '',
                'days_until': days_until,
                'is_urgent': days_until is not None and days_until <= 7,
                'visit_date': visit_date.strftime('%Y-%m-%d') if pd.notna(visit_date) else '',
                'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
                'ticket_value': safe_float(row.get('ticket_value', 0)),
                'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
                'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
                'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
                'objections': str(row.get('objections', '')) if pd.notna(row.get('objections')) else '',
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
    
    # === RECORDS for table (SALES installed in period - for Commission Payment section) ===
    records = []
    sales_df = installed_deals_df.head(50)  # Only SALE status with install_date in period
    for _, row in sales_df.iterrows():
        records.append({
            'lead_id': str(row.get('lead_id', '')) if pd.notna(row.get('lead_id', None)) else '',
            'customer_number': str(row.get('customer_number', '')) if pd.notna(row.get('customer_number', None)) else '',
            'name': str(row.get('name', '')),
            'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
            'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
            'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
            'ticket_value': safe_float(row.get('ticket_value', 0)),
            'commission_percent': safe_float(row.get('commission_percent', 0)),
            'commission_value': safe_float(row.get('commission_value', 0)),
            'spif_total': safe_float(row.get('spif_total', 0)),
            'status': str(row.get('status', '')),
            'visit_date': row.get('visit_date').strftime('%Y-%m-%d') if pd.notna(row.get('visit_date')) else '',
            'close_date': row.get('close_date').strftime('%Y-%m-%d') if pd.notna(row.get('close_date')) else '',
            'install_date': row.get('install_date').strftime('%Y-%m-%d') if pd.notna(row.get('install_date')) else '',
            'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
            'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
            'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
        })
    
    return KPIResponse(
        # Main Summary KPIs (based on close_date)
        total_revenue=round(total_revenue, 2),
        total_commission=round(total_commission, 2),
        closed_deals=closed_deals,
        closing_rate=round(closing_rate, 1),
        total_visits=total_visits,
        average_ticket=round(average_ticket, 2),
        
        # Commission Payment (based on install_date)
        commission_payment_count=commission_payment_count,
        commission_payment_revenue=round(commission_payment_revenue, 2),
        commission_payment_amount=round(commission_payment_amount, 2),
        commission_payment_spiff=round(commission_payment_spiff, 2),
        
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

# === Import & Lead Management Functions ===

def parse_lead_email(text: str) -> dict:
    """Parse lead info from the dispatch email format"""
    data = {}
    for line in text.strip().split('\n'):
        line = line.strip()
        if ' - ' in line:
            key, val = line.split(' - ', 1)
            key = key.strip().lower()
            val = val.strip()
            if 'customer name' in key:
                data['name'] = val.strip()
            elif 'customer #' in key or 'customer number' in key:
                data['customer_number'] = val.strip()
            elif key == 'address 1':
                data['address'] = val.strip()
            elif key == 'city':
                data['city'] = val.strip()
            elif 'email' in key:
                data['email'] = val.strip()
            elif 'customer phone' in key or 'caller phone' in key:
                if not data.get('phone') and val.strip():
                    data['phone'] = val.strip()
    return data

async def import_sheet_to_db(excel_url: str) -> int:
    """Import Google Sheet data to MongoDB leads collection"""
    df = parse_excel_data(excel_url)
    
    # Map columns for MongoDB storage
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
        elif col_lower == 'email': column_mapping[col] = 'email'
        elif col_lower == 'loss reason': column_mapping[col] = 'loss_reason'
        elif col_lower == 'comments': column_mapping[col] = 'comments'
        elif col_lower == 'feeling': column_mapping[col] = 'feeling'
        elif col_lower == 'objections': column_mapping[col] = 'objections'
        elif 'self gen' in col_lower and 'mits' in col_lower: column_mapping[col] = 'self_gen_mits'
        elif 'apco' in col_lower: column_mapping[col] = 'apco_x'
        elif 'samsung' in col_lower: column_mapping[col] = 'samsung'
        elif 'mitsubishi' in col_lower or col_lower == 'mits': column_mapping[col] = 'mitsubishi'
        elif 'surge' in col_lower: column_mapping[col] = 'surge_protector'
        elif 'duct' in col_lower or 'dusct' in col_lower or 'celaning' in col_lower: column_mapping[col] = 'duct_cleaning'
    
    df = df.rename(columns=column_mapping)
    df = df.loc[:, ~df.columns.duplicated()]
    
    float_cols = ['ticket_value', 'commission_value', 'spif_total', 'commission_percent',
                  'apco_x', 'samsung', 'mitsubishi', 'surge_protector', 'duct_cleaning', 'self_gen_mits']
    date_cols = ['visit_date', 'close_date', 'install_date', 'follow_up_date']
    
    leads = []
    for _, row in df.iterrows():
        name = str(row.get('name', '')).strip() if pd.notna(row.get('name')) else ''
        if not name:
            continue
        lead = {
            'lead_id': str(uuid.uuid4()),
            'customer_number': str(int(row.get('customer_number', 0))) if pd.notna(row.get('customer_number')) and row.get('customer_number') else '',
            'name': name,
            'address': str(row.get('address', '')) if pd.notna(row.get('address')) else '',
            'city': str(row.get('city', '')) if pd.notna(row.get('city')) else '',
            'email': str(row.get('email', '')) if pd.notna(row.get('email')) else '',
            'phone': '',
            'unit_type': str(row.get('unit_type', '')) if pd.notna(row.get('unit_type')) else '',
            'status': normalize_status(row.get('status', 'PENDING')),
            'loss_reason': str(row.get('loss_reason', '')) if pd.notna(row.get('loss_reason')) else '',
            'comments': str(row.get('comments', '')) if pd.notna(row.get('comments')) else '',
            'feeling': str(row.get('feeling', '')) if pd.notna(row.get('feeling')) else '',
            'objections': str(row.get('objections', '')) if pd.notna(row.get('objections')) else '',
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        for fc in float_cols:
            lead[fc] = safe_float(row.get(fc, 0))
        # Clean commission percent
        cp = lead['commission_percent']
        if 0 < cp < 1:
            lead['commission_percent'] = round(cp * 100, 2)
        else:
            lead['commission_percent'] = round(cp, 2)
        for dc in date_cols:
            d = safe_date(row.get(dc))
            lead[dc] = d.strftime('%Y-%m-%d') if d else ''
        leads.append(lead)
    
    await db.leads.delete_many({})
    if leads:
        await db.leads.insert_many(leads)
    logger.info(f"Imported {len(leads)} leads to MongoDB")
    return len(leads)

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
async def get_dashboard_kpis(date_filter: str = "all", pay_period: Optional[str] = None):
    """Get KPIs - reads from MongoDB if data exists, otherwise auto-imports from Sheet"""
    leads = await db.leads.find({}, {"_id": 0, "lead_id": 0, "created_at": 0, "phone": 0}).to_list(10000)
    
    if leads:
        df = pd.DataFrame(leads)
        kpis = process_sales_data(df, date_filter, pay_period, from_db=True)
    else:
        # No leads in MongoDB - try to auto-import from Sheet
        config = await db.excel_config.find_one({}, {"_id": 0})
        excel_url = config.get('excel_url') if config else None
        if excel_url:
            try:
                count = await import_sheet_to_db(excel_url)
                logger.info(f"Auto-imported {count} leads on first load")
                leads = await db.leads.find({}, {"_id": 0, "lead_id": 0, "created_at": 0, "phone": 0}).to_list(10000)
                if leads:
                    df = pd.DataFrame(leads)
                    kpis = process_sales_data(df, date_filter, pay_period, from_db=True)
                    return kpis
            except Exception as e:
                logger.error(f"Auto-import failed: {e}")
        # Fallback: read directly from Sheet without MongoDB
        if excel_url:
            df = parse_excel_data(excel_url)
            kpis = process_sales_data(df, date_filter, pay_period, from_db=False)
        else:
            raise HTTPException(status_code=400, detail="No data. Click Update to import from Google Sheet.")
    
    return kpis

@api_router.post("/leads/import")
async def import_leads_from_sheet():
    """Import all leads from Google Sheet to MongoDB"""
    config = await db.excel_config.find_one({}, {"_id": 0})
    excel_url = config.get('excel_url') if config else None
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Sheet URL configured.")
    count = await import_sheet_to_db(excel_url)
    return {"message": f"Imported {count} leads", "count": count}

@api_router.post("/leads/parse-email")
async def parse_email_to_lead(body: dict):
    """Parse a dispatch email text into lead fields"""
    text = body.get("text", "")
    parsed = parse_lead_email(text)
    return parsed

@api_router.post("/leads")
async def create_lead(lead: LeadCreate):
    """Create a new lead"""
    doc = lead.model_dump()
    doc['lead_id'] = str(uuid.uuid4())
    doc['created_at'] = datetime.now(timezone.utc).isoformat()
    if doc['status']:
        doc['status'] = normalize_status(doc['status'])
    # Auto-calculate follow-up date from visit_date if not set
    if doc['visit_date'] and not doc['follow_up_date']:
        try:
            vd = datetime.strptime(doc['visit_date'], '%Y-%m-%d')
            doc['follow_up_date'] = (vd + timedelta(days=2)).strftime('%Y-%m-%d')
        except ValueError:
            pass
    await db.leads.insert_one(doc)
    doc.pop('_id', None)
    # Auto-generate pipeline schedule from visit_date
    if doc.get('visit_date'):
        schedule = generate_pipeline_schedule(doc['visit_date'])
        await db.pipeline_schedules.update_one(
            {"client_name": doc['name']},
            {"$set": {"client_name": doc['name'], "steps": schedule, "is_custom": False}},
            upsert=True
        )
    return {"message": "Lead created", "lead": doc}

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, updates: LeadUpdate):
    """Update a lead"""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if 'status' in update_data:
        update_data['status'] = normalize_status(update_data['status'])
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead updated"}

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Delete a lead"""
    result = await db.leads.delete_one({"lead_id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

@api_router.get("/leads")
async def get_leads():
    """Get all leads"""
    leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    return {"leads": leads}

@api_router.post("/dashboard/refresh")
async def refresh_dashboard():
    """Re-import data from Google Sheet to MongoDB"""
    config = await db.excel_config.find_one({}, {"_id": 0})
    excel_url = config.get('excel_url') if config else None
    if not excel_url:
        raise HTTPException(status_code=400, detail="No Excel URL configured.")
    count = await import_sheet_to_db(excel_url)
    return {"message": f"Data refreshed - {count} leads imported", "count": count}

@api_router.get("/pay-periods")
async def get_pay_periods():
    """Get list of all pay periods"""
    periods = [{"name": name, "start": start.isoformat(), "end": end.isoformat()} 
               for name, start, end in PAY_PERIODS]
    return {"pay_periods": periods}

@api_router.post("/followup/action")
async def record_followup_action(action: FollowUpActionCreate):
    doc = {
        "client_name": action.client_name,
        "step_id": action.step_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.followup_actions.insert_one(doc)
    doc.pop('_id', None)
    return {"message": "Action recorded", "action": doc}

@api_router.get("/followup/actions")
async def get_followup_actions():
    actions = await db.followup_actions.find({}, {"_id": 0}).to_list(1000)
    return {"actions": actions}

@api_router.delete("/followup/action")
async def delete_followup_action(client_name: str, step_id: str):
    result = await db.followup_actions.delete_one({
        "client_name": client_name,
        "step_id": step_id
    })
    return {"deleted": result.deleted_count}

@api_router.get("/client/notes")
async def get_client_notes(client_name: str):
    note = await db.client_notes.find_one({"client_name": client_name}, {"_id": 0})
    return note or {"client_name": client_name, "next_follow_up": "", "comment": "", "priority": "high"}

@api_router.post("/client/notes")
async def save_client_notes(data: ClientNoteCreate):
    await db.client_notes.update_one(
        {"client_name": data.client_name},
        {"$set": {
            "next_follow_up": data.next_follow_up,
            "comment": data.comment,
            "priority": data.priority,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Notes saved"}

@api_router.get("/client/all-notes")
async def get_all_client_notes():
    notes = await db.client_notes.find({}, {"_id": 0}).to_list(1000)
    return {"notes": notes}

PIPELINE_STEP_DAYS = [
    {"id": "d0_email", "day": 0}, {"id": "d0_sms", "day": 0},
    {"id": "d2_email", "day": 2},
    {"id": "d4_sms", "day": 4}, {"id": "d4_email", "day": 4},
    {"id": "d6_sms", "day": 6},
    {"id": "d8_email", "day": 8},
]

def generate_pipeline_schedule(visit_date_str: str) -> list:
    """Generate standard pipeline schedule from visit date"""
    try:
        vd = datetime.strptime(visit_date_str, '%Y-%m-%d')
    except (ValueError, TypeError):
        vd = datetime.now()
    return [{"id": s["id"], "scheduled_date": (vd + timedelta(days=s["day"])).strftime('%Y-%m-%d'), "comment": ""} for s in PIPELINE_STEP_DAYS]

@api_router.get("/pipeline/schedule")
async def get_pipeline_schedule(client_name: str):
    schedule = await db.pipeline_schedules.find_one({"client_name": client_name}, {"_id": 0})
    return schedule or {"client_name": client_name, "steps": [], "is_custom": False}

@api_router.post("/pipeline/schedule")
async def save_pipeline_schedule(data: PipelineScheduleUpdate):
    await db.pipeline_schedules.update_one(
        {"client_name": data.client_name},
        {"$set": {"steps": data.steps, "is_custom": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Schedule saved"}

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

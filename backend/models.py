from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class UserRegister(BaseModel):
    email: str
    name: str
    sales_number: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ExcelConfigCreate(BaseModel):
    excel_url: str

class FollowUpActionCreate(BaseModel):
    client_name: str
    step_id: str

class ClientNoteCreate(BaseModel):
    client_name: str
    next_follow_up: str = ""
    comment: str = ""
    priority: str = "high"

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
    salesperson_id: str = ""

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
    additional_phones: Optional[List[Dict[str, str]]] = None
    products: Optional[List[Dict[str, str]]] = None
    sale_accessories: Optional[List[Dict[str, str]]] = None
    is_self_gen: Optional[bool] = None
    promo_code: Optional[str] = None
    also_generator: Optional[bool] = None
    custom_spiffs: Optional[List[Dict[str, Any]]] = None
    price_tier: Optional[str] = None

class PipelineScheduleUpdate(BaseModel):
    client_name: str
    steps: List[Dict[str, Any]]

class GoalCreate(BaseModel):
    pay_period: str
    revenue_goal: float = 0
    deals_goal: int = 0
    commission_goal: float = 0

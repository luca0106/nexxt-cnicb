from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

# Client schemas
class ClientBase(BaseModel):
    full_name: str
    cnp: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    employer: Optional[str] = None
    monthly_income: Optional[float] = 0.0

class ClientCreate(ClientBase):
    pass

class ClientOut(ClientBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Document schemas
class DocumentBase(BaseModel):
    file_name: str
    document_type: str
    file_size_kb: Optional[int] = 120
    mime_type: Optional[str] = "application/pdf"
    content_text: Optional[str] = None
    status: Optional[str] = "uploaded"

class DocumentCreate(DocumentBase):
    case_id: int

class DocumentOut(DocumentBase):
    id: int
    case_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Task schemas
class TaskBase(BaseModel):
    title: str
    status: Optional[str] = "in_lucru"
    priority: Optional[str] = "normal"
    assigned_to: Optional[str] = "Consultant 024"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    case_id: Optional[int] = None

class TaskOut(TaskBase):
    id: int
    case_id: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# AuditLog schemas
class AuditLogBase(BaseModel):
    action: str
    performed_by: Optional[str] = "Consultant 024"
    details: Optional[str] = None

class AuditLogOut(AuditLogBase):
    id: int
    case_id: Optional[int] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# Case schemas
class CaseBase(BaseModel):
    title: str
    case_type: Optional[str] = "Cerere de credit"
    status: Optional[str] = "in_lucru"
    department: Optional[str] = "Credite Retail"
    priority: Optional[str] = "normal"
    assigned_to: Optional[str] = "Consultant 024"
    requested_amount: Optional[float] = None
    currency: Optional[str] = "RON"
    notes: Optional[str] = None

class CaseCreate(CaseBase):
    case_number: Optional[str] = None
    client_id: int

class CaseStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class CaseListOut(BaseModel):
    id: int
    case_number: str
    title: str
    case_type: str
    status: str
    department: str
    priority: str
    assigned_to: str
    requested_amount: Optional[float] = None
    currency: str
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None
    documents_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class CaseDetailOut(BaseModel):
    id: int
    case_number: str
    title: str
    case_type: str
    status: str
    department: str
    priority: str
    assigned_to: str
    requested_amount: Optional[float] = None
    currency: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client: ClientOut
    documents: List[DocumentOut] = []
    tasks: List[TaskOut] = []
    history_entries: List[AuditLogOut] = []
    model_config = ConfigDict(from_attributes=True)

# Dashboard statistics
class DashboardStats(BaseModel):
    in_lucru: int
    de_verificat: int
    complet: int
    in_asteptare: int
    total_dosare: int
    recent_cases: List[CaseListOut]


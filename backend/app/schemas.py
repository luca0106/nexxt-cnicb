from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


# Client schemas
class ClientBase(BaseModel):
    full_name: str
    national_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    employer: Optional[str] = None
    monthly_income: Optional[float] = 0.0
    existing_monthly_debts: Optional[float] = 0.0
    id_card_series: Optional[str] = None
    id_card_expiry: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientOut(ClientBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Document schemas
class DocumentBase(BaseModel):
    doc_code: Optional[str] = None
    file_name: str
    document_type: str
    file_size_kb: Optional[int] = 120
    mime_type: Optional[str] = "application/pdf"
    page_count: Optional[int] = 1
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
    status: Optional[str] = "in_progress"
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
    case_type: Optional[str] = "Personal Loan Application"
    status: Optional[str] = "in_progress"
    department: Optional[str] = "Retail Lending"
    priority: Optional[str] = "normal"
    assigned_to: Optional[str] = "Consultant 024"
    requested_amount: Optional[float] = None
    loan_term_months: Optional[int] = 60
    interest_rate_annual: Optional[float] = 8.9
    currency: Optional[str] = "EUR"
    notes: Optional[str] = None
    scenario_tag: Optional[str] = None


class CaseCreate(CaseBase):
    case_number: Optional[str] = None
    client_id: int


class CaseStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class CaseManualFormUpdate(BaseModel):
    full_name: Optional[str] = None
    national_id: Optional[str] = None
    address: Optional[str] = None
    employer: Optional[str] = None
    monthly_income: Optional[float] = None
    existing_monthly_debts: Optional[float] = None
    requested_amount: Optional[float] = None
    loan_term_months: Optional[int] = None
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
    loan_term_months: Optional[int] = 60
    interest_rate_annual: Optional[float] = 8.9
    currency: str
    scenario_tag: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None
    documents_count: int = 0
    has_ai_analysis: bool = False
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
    loan_term_months: Optional[int] = 60
    interest_rate_annual: Optional[float] = 8.9
    currency: str
    notes: Optional[str] = None
    scenario_tag: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client: ClientOut
    documents: List[DocumentOut] = []
    tasks: List[TaskOut] = []
    history_entries: List[AuditLogOut] = []
    model_config = ConfigDict(from_attributes=True)


# Dashboard statistics
class DashboardStats(BaseModel):
    in_progress: int
    to_verify: int
    completed: int
    pending: int
    total_cases: int
    recent_cases: List[CaseListOut]


# AI Copilot schemas
class RunAnalysisRequest(BaseModel):
    documentIds: Optional[List[str]] = None
    llmProvider: Optional[str] = "auto"
    apiKey: Optional[str] = None


class FindingResolutionRequest(BaseModel):
    action: str  # confirm, resolve, override_value
    resolved_value: Optional[Any] = None
    officer_note: Optional[str] = None


class RemediationTriggerRequest(BaseModel):
    channel: str = "email_and_sms"
    custom_message: Optional[str] = None


class HumanDecisionRequest(BaseModel):
    decision: str  # approve, request_clarification, reject
    officer_comments: Optional[str] = None
    apply_extracted_data: bool = True


class AIAnalysisResponse(BaseModel):
    analysisId: str
    caseId: int
    caseNumber: str
    status: str
    engineUsed: str
    summary: str
    riskScore: str
    humanDecision: str
    piiMasking: Dict[str, Any]
    extractedFields: List[Dict[str, Any]]
    policyRules: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    feasibilityMath: Dict[str, Any]
    remediation: Dict[str, Any]
    workflowChecklist: List[Dict[str, Any]]
    executionTrace: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    createdAt: datetime
    completedAt: Optional[datetime] = None

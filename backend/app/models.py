from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False, index=True)
    cnp = Column(String(13), unique=True, nullable=False, index=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(25), nullable=True)
    address = Column(String(250), nullable=True)
    employer = Column(String(150), nullable=True)
    monthly_income = Column(Float, default=0.0)
    existing_monthly_debts = Column(Float, default=0.0)
    id_card_series = Column(String(20), nullable=True)
    id_card_expiry = Column(String(30), nullable=True)
    id_card_issuer = Column(String(100), default="SPCLEP")
    birth_date = Column(String(30), nullable=True)
    marital_status = Column(String(50), default="Necăsătorit")
    dependents_count = Column(Integer, default=0)
    housing_status = Column(String(50), default="Proprietar")
    employer_cui = Column(String(50), nullable=True)
    employment_contract_type = Column(String(100), default="Perioadă nedeterminată")
    seniority_current_employer = Column(String(50), default="2 ani")
    seniority_total = Column(String(50), default="5 ani")
    fico_score = Column(Integer, default=710)
    credit_bureau_status = Column(String(100), default="Fără restanțe (Clasa A)")
    credit_bureau_active_loans = Column(Integer, default=1)
    pep_status = Column(String(50), default="Nu (Negativ)")
    aml_status = Column(String(100), default="Conform L129/2019 — Fără alerte")
    anaf_consent = Column(Boolean, default=True)
    anaf_income = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("Case", back_populates="client", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    case_type = Column(String(100), default="Credit de Nevoi Personale")
    status = Column(String(50), default="in_lucru", index=True)  # in_lucru, in_verificare, complet, in_asteptare, respins
    department = Column(String(100), default="Credite Retail")
    branch = Column(String(100), default="Agenția Unirii București")
    channel = Column(String(100), default="Online Onboarding")
    priority = Column(String(50), default="normal")  # normal, ridicat, urgent
    assigned_to = Column(String(100), default="Consultant 024")
    requested_amount = Column(Float, nullable=True)
    loan_term_months = Column(Integer, default=60)
    interest_rate_annual = Column(Float, default=8.9)
    interest_type = Column(String(50), default="Fixă")
    dae_percent = Column(Float, default=9.42)
    monthly_installment = Column(Float, default=0.0)
    dti_percent = Column(Float, default=0.0)
    currency = Column(String(10), default="RON")
    notes = Column(Text, nullable=True)
    scenario_tag = Column(String(100), nullable=True)  # discrepancy_case, expired_id_case, valid_green_case
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client = relationship("Client", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    history_entries = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    doc_code = Column(String(50), nullable=True)  # doc-1, doc-2, doc-3, doc-4
    file_name = Column(String(200), nullable=False)
    document_type = Column(String(100), nullable=False)  # Formular cerere, Adeverință venit, Extras financiar, Copie CI, Factură utilități
    file_size_kb = Column(Integer, default=120)
    mime_type = Column(String(50), default="application/pdf")
    page_count = Column(Integer, default=1)
    content_text = Column(Text, nullable=True)
    status = Column(String(50), default="uploaded")  # uploaded, verified, flagged, expired
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="documents")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    title = Column(String(200), nullable=False)
    status = Column(String(50), default="in_lucru")  # in_lucru, finalizat, in_asteptare
    priority = Column(String(50), default="normal")
    assigned_to = Column(String(100), default="Consultant 024")
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="tasks")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    action = Column(String(150), nullable=False)
    performed_by = Column(String(100), default="Consultant 024")
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="history_entries")


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    analysis_uid = Column(String(100), unique=True, index=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False, index=True)
    status = Column(String(50), default="completed")  # queued, running, completed, failed
    engine_used = Column(String(100), default="Raiffeisen Hybrid Multi-Agent Engine v2.4")
    summary = Column(Text, nullable=True)
    risk_score = Column(String(50), default="mediu")  # scazut, mediu, ridicat, critic
    human_decision = Column(String(50), default="pending")  # pending, approved, clarification_sent, rejected

    # JSON serialized payloads from agents
    pii_masking_json = Column(Text, nullable=True)
    extracted_fields_json = Column(Text, nullable=True)
    policy_rules_json = Column(Text, nullable=True)
    findings_json = Column(Text, nullable=True)
    feasibility_math_json = Column(Text, nullable=True)
    remediation_json = Column(Text, nullable=True)
    workflow_checklist_json = Column(Text, nullable=True)
    execution_trace_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="ai_analyses")

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
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("Case", back_populates="client", cascade="all, delete-orphan")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    case_type = Column(String(100), default="Cerere de credit")
    status = Column(String(50), default="in_lucru", index=True)  # in_lucru, in_verificare, complet, in_asteptare, respins
    department = Column(String(100), default="Credite Retail")
    priority = Column(String(50), default="normal")  # normal, ridicat, urgent
    assigned_to = Column(String(100), default="Consultant 024")
    requested_amount = Column(Float, nullable=True)
    currency = Column(String(10), default="RON")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    client = relationship("Client", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    history_entries = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    file_name = Column(String(200), nullable=False)
    document_type = Column(String(100), nullable=False)  # Formular cerere, Adeverință venit, Extras de cont, Copie CI
    file_size_kb = Column(Integer, default=120)
    mime_type = Column(String(50), default="application/pdf")
    content_text = Column(Text, nullable=True)  # Realistic text payload ready for future AI verification
    status = Column(String(50), default="uploaded")  # uploaded, verified, flagged
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


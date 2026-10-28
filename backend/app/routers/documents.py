from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Document, Case, AuditLog
from ..schemas import DocumentOut, DocumentCreate

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=List[DocumentOut])
def get_documents(
    case_id: Optional[int] = Query(None, description="Filter by case ID"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if case_id:
        query = query.filter(Document.case_id == case_id)
    return query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.post("", response_model=DocumentOut)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Associated case not found.")

    doc = Document(
        case_id=payload.case_id,
        file_name=payload.file_name,
        document_type=payload.document_type,
        file_size_kb=payload.file_size_kb or 150,
        mime_type=payload.mime_type or "application/pdf",
        content_text=payload.content_text,
        status=payload.status or "uploaded",
        created_at=datetime.utcnow()
    )
    db.add(doc)

    log = AuditLog(
        case_id=case.id,
        action="Document Attached",
        performed_by="Consultant 024",
        details=f"Document '{doc.file_name}' ({doc.document_type}) uploaded to file."
    )
    db.add(log)
    db.commit()
    db.refresh(doc)
    return doc

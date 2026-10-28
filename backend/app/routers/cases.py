from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Case, Client, Document, Task, AuditLog
from ..schemas import CaseListOut, CaseDetailOut, CaseCreate, CaseStatusUpdate

router = APIRouter(prefix="/cases", tags=["Dosare"])

@router.get("", response_model=List[CaseListOut])
def get_cases(
    status: Optional[str] = Query(None, description="Filtru după status: in_lucru, in_verificare, complet, in_asteptare, respins"),
    search: Optional[str] = Query(None, description="Căutare după număr dosar sau titlu"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Case)

    if status and status != "toate":
        query = query.filter(Case.status == status)

    if search:
        search_filter = f"%{search}%"
        query = query.join(Client).filter(
            or_(
                Case.case_number.ilike(search_filter),
                Case.title.ilike(search_filter),
                Client.full_name.ilike(search_filter),
                Client.cnp.ilike(search_filter)
            )
        )

    # Order by specific priority or recent
    cases = query.order_by(Case.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for c in cases:
        result.append(
            CaseListOut(
                id=c.id,
                case_number=c.case_number,
                title=c.title,
                case_type=c.case_type,
                status=c.status,
                department=c.department,
                priority=c.priority,
                assigned_to=c.assigned_to,
                requested_amount=c.requested_amount,
                currency=c.currency,
                created_at=c.created_at,
                updated_at=c.updated_at,
                client=c.client,
                documents_count=len(c.documents)
            )
        )
    return result

@router.get("/{case_id}", response_model=CaseDetailOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        # Try search by case_number if not found by primary key
        c = db.query(Case).filter(Case.case_number == str(case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Dosarul nu a fost găsit.")
    return c

@router.post("", response_model=CaseDetailOut)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Clientul specificat nu există.")

    # Generate case number if not provided
    if not payload.case_number:
        last_case = db.query(Case).order_by(Case.id.desc()).first()
        new_num = (int(last_case.case_number) + 1) if last_case and last_case.case_number.isdigit() else 10500
        case_number = str(new_num)
    else:
        case_number = payload.case_number

    new_case = Case(
        case_number=case_number,
        title=payload.title,
        case_type=payload.case_type or "Cerere de credit",
        status=payload.status or "in_lucru",
        department=payload.department or "Credite Retail",
        priority=payload.priority or "normal",
        assigned_to=payload.assigned_to or "Consultant 024",
        requested_amount=payload.requested_amount,
        currency=payload.currency or "RON",
        notes=payload.notes,
        client_id=client.id,
        created_at=datetime.utcnow()
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # Add audit log entry
    log = AuditLog(
        case_id=new_case.id,
        action="Creare dosar",
        performed_by=payload.assigned_to or "Consultant 024",
        details=f"Dosarul #{new_case.case_number} a fost creat pentru clientul {client.full_name}."
    )
    db.add(log)
    db.commit()

    return new_case

@router.patch("/{case_id}/status", response_model=CaseDetailOut)
def update_case_status(case_id: int, payload: CaseStatusUpdate, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_number == str(case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Dosarul nu a fost găsit.")

    old_status = c.status
    c.status = payload.status
    if payload.notes:
        c.notes = f"{c.notes}\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {payload.notes}" if c.notes else payload.notes
    c.updated_at = datetime.utcnow()

    # Log action
    log = AuditLog(
        case_id=c.id,
        action="Actualizare status",
        performed_by="Consultant 024",
        details=f"Status schimbat din '{old_status}' în '{payload.status}'."
    )
    db.add(log)
    db.commit()
    db.refresh(c)
    return c


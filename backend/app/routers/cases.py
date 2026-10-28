from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Case, Client, Document, Task, AuditLog
from ..schemas import CaseListOut, CaseDetailOut, CaseCreate, CaseStatusUpdate, CaseManualFormUpdate

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=List[CaseListOut])
def get_cases(
    status: Optional[str] = Query(None, description="Status filter: in_progress, in_review, completed, pending, rejected"),
    search: Optional[str] = Query(None, description="Search by case number or title"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Case)

    if status and status != "all":
        query = query.filter(Case.status == status)

    if search:
        search_filter = f"%{search}%"
        query = query.join(Client).filter(
            or_(
                Case.case_number.ilike(search_filter),
                Case.title.ilike(search_filter),
                Client.full_name.ilike(search_filter),
                Client.national_id.ilike(search_filter)
            )
        )

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
                branch=c.branch or "Agenția Unirii București",
                channel=c.channel or "Online Onboarding",
                priority=c.priority,
                assigned_to=c.assigned_to,
                requested_amount=c.requested_amount,
                loan_term_months=c.loan_term_months,
                interest_rate_annual=c.interest_rate_annual,
                interest_type=c.interest_type or "Fixă",
                dae_percent=c.dae_percent or 9.42,
                monthly_installment=c.monthly_installment or 0.0,
                dti_percent=c.dti_percent or 0.0,
                currency=c.currency,
                scenario_tag=c.scenario_tag,
                created_at=c.created_at,
                updated_at=c.updated_at,
                client=c.client,
                documents_count=len(c.documents),
                has_ai_analysis=len(c.ai_analyses) > 0
            )
        )
    return result


@router.get("/{case_id}", response_model=CaseDetailOut)
def get_case(case_id: int, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_number == str(case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")
    return c


@router.post("", response_model=CaseDetailOut)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Specified client does not exist.")

    if not payload.case_number:
        last_case = db.query(Case).order_by(Case.id.desc()).first()
        new_num = (int(last_case.case_number) + 1) if last_case and last_case.case_number.isdigit() else 10500
        case_number = str(new_num)
    else:
        case_number = payload.case_number

    new_case = Case(
        case_number=case_number,
        title=payload.title,
        case_type=payload.case_type or "Personal Loan Application",
        status=payload.status or "in_progress",
        department=payload.department or "Retail Lending",
        priority=payload.priority or "normal",
        assigned_to=payload.assigned_to or "Consultant 024",
        requested_amount=payload.requested_amount,
        loan_term_months=payload.loan_term_months or 60,
        interest_rate_annual=payload.interest_rate_annual or 8.9,
        currency=payload.currency or "EUR",
        notes=payload.notes,
        scenario_tag=payload.scenario_tag or "standard_case",
        client_id=client.id,
        created_at=datetime.utcnow()
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    log = AuditLog(
        case_id=new_case.id,
        action="Case Created",
        performed_by=payload.assigned_to or "Consultant 024",
        details=f"Case #{new_case.case_number} initiated for client {client.full_name}."
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
        raise HTTPException(status_code=404, detail="Case not found.")

    old_status = c.status
    c.status = payload.status
    if payload.notes:
        c.notes = f"{c.notes}\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {payload.notes}" if c.notes else payload.notes
    c.updated_at = datetime.utcnow()

    log = AuditLog(
        case_id=c.id,
        action="Status Updated",
        performed_by="Consultant 024",
        details=f"Status changed from '{old_status}' to '{payload.status}'."
    )
    db.add(log)
    db.commit()
    db.refresh(c)
    return c


@router.patch("/{case_id}/manual-form", response_model=CaseDetailOut)
def update_case_manual_form(case_id: int, payload: CaseManualFormUpdate, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_number == str(case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")

    if c.client:
        if payload.full_name is not None:
            c.client.full_name = payload.full_name
        if payload.national_id is not None:
            c.client.national_id = payload.national_id
        if payload.address is not None:
            c.client.address = payload.address
        if payload.employer is not None:
            c.client.employer = payload.employer
        if payload.monthly_income is not None:
            c.client.monthly_income = payload.monthly_income
        if payload.existing_monthly_debts is not None:
            c.client.existing_monthly_debts = payload.existing_monthly_debts

    if payload.requested_amount is not None:
        c.requested_amount = payload.requested_amount
    if payload.loan_term_months is not None:
        c.loan_term_months = payload.loan_term_months
    if payload.notes is not None:
        c.notes = payload.notes

    c.updated_at = datetime.utcnow()

    log = AuditLog(
        case_id=c.id,
        action="Underwriting Sheet Updated",
        performed_by="Consultant 024",
        details=f"Case #{c.case_number} manual underwriting record updated."
    )
    db.add(log)
    db.commit()
    db.refresh(c)
    return c

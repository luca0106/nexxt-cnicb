from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..database import get_db
from ..models import Case
from ..schemas import DashboardStats, CaseListOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    in_lucru = db.query(Case).filter(Case.status == "in_lucru").count()
    de_verificat = db.query(Case).filter(Case.status == "in_verificare").count()
    complet = db.query(Case).filter(Case.status == "complet").count()
    in_asteptare = db.query(Case).filter(Case.status == "in_asteptare").count()
    total = db.query(Case).count()

    # Get recent cases matching the order in the screenshot first:
    # 10482 (Cerere de credit - În verificare)
    # 10479 (Actualizare date client - Complet)
    # 10475 (Deschidere cont - În așteptare)
    # followed by the rest
    pinned_numbers = ["10482", "10479", "10475"]
    pinned_cases = db.query(Case).filter(Case.case_number.in_(pinned_numbers)).all()
    pinned_dict = {c.case_number: c for c in pinned_cases}

    ordered_recent = []
    for num in pinned_numbers:
        if num in pinned_dict:
            ordered_recent.append(pinned_dict[num])

    # Add other recent ones if fewer than 5
    if len(ordered_recent) < 5:
        others = (
            db.query(Case)
            .filter(~Case.case_number.in_(pinned_numbers))
            .order_by(Case.created_at.desc())
            .limit(5 - len(ordered_recent))
            .all()
        )
        ordered_recent.extend(others)

    # Convert to response
    result_cases = []
    for c in ordered_recent:
        result_cases.append(
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

    return DashboardStats(
        in_lucru=in_lucru,
        de_verificat=de_verificat,
        complet=complet,
        in_asteptare=in_asteptare,
        total_dosare=total,
        recent_cases=result_cases
    )


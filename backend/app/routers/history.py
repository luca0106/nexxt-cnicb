from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import AuditLog
from ..schemas import AuditLogOut

router = APIRouter(prefix="/history", tags=["Istoric"])

@router.get("", response_model=List[AuditLogOut])
def get_history(
    case_id: Optional[int] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if case_id:
        query = query.filter(AuditLog.case_id == case_id)
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()


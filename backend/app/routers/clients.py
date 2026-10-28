from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Client
from ..schemas import ClientOut, ClientCreate

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=List[ClientOut])
def get_clients(
    search: Optional[str] = Query(None, description="Search by name, National ID or email"),
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Client.full_name.ilike(s),
                Client.national_id.ilike(s),
                Client.email.ilike(s)
            )
        )
    return query.order_by(Client.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    return client


@router.post("", response_model=ClientOut)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.national_id == payload.national_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="A client with this National ID already exists.")

    client = Client(
        full_name=payload.full_name,
        national_id=payload.national_id,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        employer=payload.employer,
        monthly_income=payload.monthly_income or 0.0,
        existing_monthly_debts=payload.existing_monthly_debts or 0.0,
        id_card_series=payload.id_card_series,
        id_card_expiry=payload.id_card_expiry,
        created_at=datetime.utcnow()
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

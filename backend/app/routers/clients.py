from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm.exc import StaleDataError
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from ..models import Client, FinancialProfile, ClientExpense, ClientCredit, FinancialProfileRevision
from ..financial_schemas import FinancialProfileInput, FinancialProfileOut
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


@router.get('/{client_id}/financial-profile', response_model=FinancialProfileOut)
def get_financial_profile(client_id: int, db: Session = Depends(get_db)):
    profile = db.get(FinancialProfile, client_id)
    if profile is None:
        raise HTTPException(status_code=404, detail='Financial profile not found.')
    return profile


@router.put('/{client_id}/financial-profile', response_model=FinancialProfileOut)
def replace_financial_profile(client_id: int, payload: FinancialProfileInput, db: Session = Depends(get_db)):
    if db.get(Client, client_id) is None:
        raise HTTPException(status_code=404, detail='Client not found.')
    profile = db.get(FinancialProfile, client_id)
    if payload.expected_version is not None and payload.expected_version != (profile.version if profile else 0):
        raise HTTPException(status_code=409, detail='This profile was changed elsewhere. Reload before saving.')
    if profile is not None and profile.currency != payload.currency:
        raise HTTPException(status_code=409, detail='Currency changes are blocked. A conversion workflow is required.')
    if profile is not None and payload.expected_version is None:
        raise HTTPException(status_code=428, detail='expected_version is required when updating an existing profile. Reload before saving.')
    if profile is None:
        profile = FinancialProfile(client_id=client_id, source_kind='user_supplied')
        db.add(profile)
    else:
        # Preserve the pre-edit snapshot, including old seeded values.
        db.add(FinancialProfileRevision(client_id=client_id, version=profile.version,
               snapshot_json=FinancialProfileOut.model_validate(profile).model_dump_json(),
               edit_kind='snapshot'))
    for key, value in payload.model_dump(exclude={'expenses', 'credits', 'expected_version'}).items():
        setattr(profile, key, value)
    profile.is_demo = False
    profile.updated_at = datetime.now(timezone.utc)
    profile.expenses = [ClientExpense(**item.model_dump()) for item in payload.expenses]
    profile.credits = [ClientCredit(**item.model_dump()) for item in payload.credits]
    try:
        db.flush()
        db.add(FinancialProfileRevision(client_id=client_id, version=profile.version,
               snapshot_json=FinancialProfileOut.model_validate(profile).model_dump_json(),
               edit_kind='user_supplied'))
        db.commit()
    except (StaleDataError, IntegrityError):
        db.rollback()
        raise HTTPException(status_code=409, detail='This profile was changed elsewhere. Reload before saving.')
    db.refresh(profile)
    return profile

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Task
from ..schemas import TaskOut, TaskCreate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskOut])
def get_tasks(
    status: Optional[str] = Query(None),
    case_id: Optional[int] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if case_id:
        query = query.filter(Task.case_id == case_id)
    return query.order_by(Task.created_at.desc()).limit(limit).all()


@router.post("", response_model=TaskOut)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        case_id=payload.case_id,
        title=payload.title,
        status=payload.status or "in_progress",
        priority=payload.priority or "normal",
        assigned_to=payload.assigned_to or "Consultant 024",
        due_date=payload.due_date,
        created_at=datetime.utcnow()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/toggle", response_model=TaskOut)
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    task.status = "completed" if task.status != "completed" else "in_progress"
    db.commit()
    db.refresh(task)
    return task

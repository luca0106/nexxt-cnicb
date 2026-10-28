from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import engine, Base, SessionLocal, initialize_database
from .seed import seed_database
from .financial_seed import seed_financial_profiles
from .routers import dashboard, cases, clients, documents, tasks, history, ai_copilot


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    db = SessionLocal()
    try:
        seed_database(db)
        seed_financial_profiles(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="BankDesk & Raiffeisen AI Copilot API",
    version="2.4.0",
    description="BankDesk (Internal Client & Case Management Platform) + Raiffeisen AI Copilot (Multi-Agent Underwriting Triage & Audit Extension)",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(cases.router, prefix=settings.API_PREFIX)
app.include_router(clients.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(tasks.router, prefix=settings.API_PREFIX)
app.include_router(history.router, prefix=settings.API_PREFIX)
app.include_router(ai_copilot.router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    return {
        "app": "BankDesk & Raiffeisen AI Copilot",
        "version": "2.4.0",
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

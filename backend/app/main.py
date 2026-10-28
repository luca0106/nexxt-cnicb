from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import engine, Base, SessionLocal
from .seed import seed_database
from .routers import dashboard, cases, clients, documents, tasks, history

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)
    # Seed initial data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="BankDesk - Sistem intern de gestionare a clienților și dosarelor bancare",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(cases.router, prefix=settings.API_PREFIX)
app.include_router(clients.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(tasks.router, prefix=settings.API_PREFIX)
app.include_router(history.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}


import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "BankDesk API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bankdesk.db")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

settings = Settings()


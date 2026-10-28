import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Load .env from backend directory or project root
backend_env = Path(__file__).resolve().parent.parent / ".env"
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if backend_env.exists():
    load_dotenv(backend_env)
elif root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "BankDesk API"
    VERSION: str = "2.4.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bankdesk.db")
    
    # AWS Bedrock / AI Gateway Configuration
    AWS_API_URL: str = os.getenv("AWS_API_URL", os.getenv("AWS_BEDROCK_API_URL", "")).strip()
    AWS_API_KEY: str = os.getenv("AWS_API_KEY", os.getenv("AWS_BEDROCK_API_KEY", "")).strip()
    AWS_MODEL_ID: str = os.getenv("AWS_MODEL_ID", "anthropic.claude-3-5-sonnet").strip()
    
    # Fallback keys if provided
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "*"
    ]

settings = Settings()

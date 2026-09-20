from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "ResolveIQ IT Service Desk"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Groq Settings
    GROQ_API_KEY: str = Field(default="")
    GROQ_MODEL: str = Field(default="openai/gpt-oss-120b")
    
    # LangSmith Observability & Tracing Settings
    LANGCHAIN_TRACING_V2: str = Field(default="true")
    LANGCHAIN_API_KEY: str = Field(default="")
    LANGCHAIN_PROJECT: str = Field(default="ResolveIQ-ITSD")
    
    # Embedding Model
    EMBEDDING_MODEL: str = Field(default="BAAI/bge-small-en-v1.5")
    
    # Weaviate Settings
    WEAVIATE_URL: str = Field(default="")
    # Jira Cloud Settings (Optional for live Jira integration)
    JIRA_BASE_URL: str = Field(default="")
    JIRA_EMAIL: str = Field(default="")
    JIRA_API_TOKEN: str = Field(default="")
    JIRA_PROJECT_KEY: str = Field(default="IT")

    # Database Settings
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./resolveiq.db")

    
    # App Settings
    PORT: int = Field(default=8000)
    HOST: str = Field(default="0.0.0.0")
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

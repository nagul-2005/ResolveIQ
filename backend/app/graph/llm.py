import os
from typing import Optional
from langchain_groq import ChatGroq
from app.config import settings

def get_groq_llm(model: Optional[str] = None, temperature: float = 0.1) -> ChatGroq:
    """Returns ChatGroq instance configured with Groq LLM model."""
    api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
    target_model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"
    return ChatGroq(
        model=target_model,
        temperature=temperature,
        groq_api_key=api_key
    )

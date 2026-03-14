"""
TrajectIQ AI Backend Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Server
    APP_NAME: str = "TrajectIQ AI Backend"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # AI Model Settings
    SPACY_MODEL: str = "en_core_web_sm"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    
    # Feature Flags
    ENABLE_DOCLING: bool = True
    ENABLE_SPACY: bool = True
    ENABLE_SKILLNER: bool = True
    ENABLE_SEMANTIC_MATCHING: bool = True
    
    # Processing
    MAX_FILE_SIZE_MB: int = 10
    MAX_BATCH_SIZE: int = 10
    PROCESSING_TIMEOUT_SECONDS: int = 30
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Export settings instance
settings = get_settings()

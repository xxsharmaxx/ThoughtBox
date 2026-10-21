"""Configuration settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with sensible defaults for local development."""

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql://thoughtbox:thoughtbox@db:5432/thoughtbox"

    # Moderator secret - MUST be set via environment variable in production
    moderator_secret: str = "change-me-in-production"

    # Rate limiting
    rate_limit_per_minute: int = 30

    # App config
    max_thought_length: int = 1000
    min_thought_length: int = 3
    cors_origins: str = "*"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

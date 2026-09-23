from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Personal Travel Planner"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: list[str] = ["http://localhost:3000"]
    database_url: str = "sqlite:///./data/travel_planner.db"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

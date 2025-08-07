from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    log_level: str = "INFO"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    cors_origins: List[str] = []

    database_url: Optional[str] = None
    redis_url: Optional[str] = None

    jwt_secret: Optional[str] = None
    secret_key: Optional[str] = None

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()



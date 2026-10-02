import os
from pathlib import Path
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=str(BASE_DIR / ".env"), env_file_encoding="utf-8", extra="ignore")

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # Google Gemma & Gemini Multimodal Vision
    GEMMA_ENDPOINT: str = "http://localhost:11434/api/generate"
    GEMMA_MODEL: str = "gemma2:9b"
    GEMINI_API_KEY: str = ""

    # Prior Labs TabPFN
    TABPFN_DEVICE: str = "cpu"
    TABPFN_TOKEN: str = ""

    # ElevenLabs
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel / Coach

    # Sentry Tracing
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0

    # Paths
    DATA_DIR: Path = BASE_DIR / "app" / "data"
    STATIC_DIR: Path = BASE_DIR / "app" / "static"


settings = Settings()

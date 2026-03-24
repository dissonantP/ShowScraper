"""Configuration management for the LLM server."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""
    
    # Verbose logging (for tests/debugging)
    VERBOSE = False
    
    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    SERPER_API_KEY = os.getenv("SERPER_API_KEY")
    AGENTOPS_API_KEY = os.getenv("AGENTOPS_API_KEY")
    SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
    SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    # Server
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # Rate Limits
    DEFAULT_RATE_LIMIT = "20/minute, 200/day"
    # Increased for development - refetch makes 3 requests (quick, artists_list, artists_fields)
    CONCERT_RESEARCH_RATE_LIMIT = os.getenv("CONCERT_RESEARCH_RATE_LIMIT", "60/minute")
    
    # CORS
    CORS_ORIGINS = ["https://bayareashows.org", "http://localhost:3000"]
    
    # LLM Settings
    QUICK_MODEL = "gpt-4o-mini"
    DETAILED_MODEL = "gpt-4o"
    QUICK_MAX_TOKENS = 512
    DETAILED_MAX_TOKENS = 4096
    TEMPERATURE = 0.3
    TEMPERATURE_STRICT = 0.2
    
    # Timeouts
    # Increased from 25 to 40 seconds to handle complex tool-calling scenarios
    # (multiple tool calls per field can take longer)
    ARTIST_DATAPOINT_TIMEOUT = int(os.getenv("ARTIST_DATAPOINT_TIMEOUT", "40"))
    
    # Paths
    BASE_DIR = Path(__file__).resolve().parent.parent
    CACHE_DIR = BASE_DIR / "tasks" / "logs" / "cache"
    LOGS_DIR = BASE_DIR / "logs"
    
    # Manual show storage
    GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "show-scraper-data")
    MANUAL_SHOWS_OBJECT = os.getenv("MANUAL_SHOWS_OBJECT", "ManuallyAdded.json")
    MANUAL_SHOWS_LOCAL_FILE = os.getenv("MANUAL_SHOWS_LOCAL_FILE", "")
    MANUAL_SHOWS_API_TOKEN = os.getenv("MANUAL_SHOWS_API_TOKEN", "")
    MANUAL_SHOWS_UI_USERNAME = os.getenv("MANUAL_SHOWS_UI_USERNAME", "")
    MANUAL_SHOWS_UI_PASSWORD = os.getenv("MANUAL_SHOWS_UI_PASSWORD", "")
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    
    @classmethod
    def ensure_dirs(cls):
        """Ensure required directories exist."""
        cls.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cls.LOGS_DIR.mkdir(parents=True, exist_ok=True)

    @classmethod
    def llm_available(cls) -> bool:
        """Whether OpenAI-backed research endpoints have enough config to run."""
        return bool(cls.OPENAI_API_KEY)

    @classmethod
    def manual_shows_storage_backend(cls) -> str:
        """Return the configured manual show storage backend."""
        if cls.MANUAL_SHOWS_LOCAL_FILE:
            return "local"
        if cls.GCS_BUCKET_NAME:
            return "gcs"
        return "none"

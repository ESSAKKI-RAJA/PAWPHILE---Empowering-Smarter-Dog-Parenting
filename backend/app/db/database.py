import logging
from urllib.parse import urlparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

def sanitize_database_url(url: str) -> str:
    """
    Cleans, validates, and standardizes the DATABASE_URL.
    Safely logs initialization parameters without exposing passwords.
    """
    if not url:
        raise ValueError("DATABASE_URL environment variable is missing or empty.")

    # 1. Strip whitespace and common accidental surrounding quotes
    url = url.strip()
    url = url.strip('"\'')

    # 2. Remove accidental prefix if a user pasted 'DATABASE_URL=...' verbatim
    if url.startswith("DATABASE_URL="):
        url = url[len("DATABASE_URL="):].strip('"\'')

    # 3. Normalize any postgres-family scheme to the one driver this
    # application ships and verifies: psycopg2 (psycopg2-binary is the
    # dependency in backend/requirements.txt; psycopg v3 is NOT installed).
    # This covers legacy postgres:// as well as provider-supplied driver
    # qualifiers (postgresql+psycopg://, any case, any +driver variant).
    # Without this, SQLAlchemy selects whatever dialect the URL names and
    # startup crashes with ModuleNotFoundError for the missing driver.
    # NOTE: this codebase is sync-only; async drivers could never work here,
    # so forcing psycopg2 for the postgres family is always correct.
    head, sep, tail = url.partition("://")
    if sep and head.split("+")[0].lower() in ("postgres", "postgresql"):
        url = "postgresql+psycopg2://" + tail

    # 4. Parse the URL safely
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme
        hostname = parsed.hostname
        port = parsed.port
        database = parsed.path
        username = parsed.username

        if not scheme:
            raise ValueError("Missing scheme")
        if scheme != "sqlite" and not hostname:
            raise ValueError("Missing hostname for non-sqlite database")

        logger.info(f"Connecting to database: scheme={scheme}, host={hostname}, port={port}, db={database}, user={username}")

    except Exception:
        raise ValueError("DATABASE_URL is severely malformed and cannot be parsed.")

    return url

# Initialize database
SQLALCHEMY_DATABASE_URL = sanitize_database_url(settings.DATABASE_URL)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

"""Shared BIN1 test fixtures — single app, single DB, single identity override.

Both test_foundation.py and test_production.py import from here so their
dependency overrides never clobber each other at collection time.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.core.config import settings
from app.db.database import Base
from app.db.session import get_db
from app.core.security import get_current_user, get_optional_user
import app.models.all_models  # noqa: F401
import app.models.paw_ai_models  # noqa: F401
import app.models.foundation_models  # noqa: F401
import app.models.collaboration_models  # noqa: F401
import app.models.ecosystem_models  # noqa: F401

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def _override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


fastapi_app.dependency_overrides[get_db] = _override_db

_current = {"sub": "user_a"}


def _as(sub: str):
    _current["sub"] = sub


fastapi_app.dependency_overrides[get_current_user] = lambda: _current["sub"]
fastapi_app.dependency_overrides[get_optional_user] = lambda: _current["sub"]

client = TestClient(fastapi_app, raise_server_exceptions=False)

# Rate limiting is covered by dedicated tests; keep suites hermetic by default.
settings.RATE_LIMIT_ENABLED = False

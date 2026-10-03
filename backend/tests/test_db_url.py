"""DB URL sanitizer tests — driver normalization.

Regression: production DATABASE_URL values carrying the `+psycopg` driver
qualifier must resolve to the installed psycopg2 driver instead of crashing
startup with ModuleNotFoundError: No module named 'psycopg'.
Pure-function tests; no database required.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app.db.database import sanitize_database_url  # noqa: E402


def test_legacy_postgres_scheme_normalized():
    out = sanitize_database_url("postgres://u:p@host:5432/db")
    assert out.startswith("postgresql+psycopg2://")
    assert "+psycopg:" not in out and out.count("+psycopg2://") == 1


def test_psycopg_driver_pinned_to_psycopg2():
    out = sanitize_database_url("postgresql+psycopg://u:p@host:5432/db?sslmode=require")
    assert out.startswith("postgresql+psycopg2://")
    assert "?sslmode=require" in out


def test_postgres_psycopg_driver_pinned_to_psycopg2():
    out = sanitize_database_url("postgres+psycopg://u:p@host/db")
    assert out.startswith("postgresql+psycopg2://")


def test_driver_qualifier_always_forced_to_psycopg2():
    """Any postgres-family qualifier (any case, any driver, incl. async-only
    drivers this sync codebase could never use) resolves to psycopg2."""
    for raw in (
        "postgresql+psycopg://u:p@host/db",
        "POSTGRESQL+PSYCOPG://u:p@host/db",
        "postgres+psycopg2://u:p@host/db",
        "postgresql+asyncpg://u:p@host/db",
        "postgresql://u:p@host/db",
        "postgres://u:p@host/db",
    ):
        out = sanitize_database_url(raw)
        assert out.startswith("postgresql+psycopg2://"), (raw, out)


def test_plain_postgresql_gets_explicit_psycopg2_driver():
    out = sanitize_database_url("postgresql://u:p@host:5432/db")
    assert out == "postgresql+psycopg2://u:p@host:5432/db"


def test_sqlite_passthrough():
    assert sanitize_database_url("sqlite:///tmp/x.db") == "sqlite:///tmp/x.db"


def test_blank_raises():
    for bad in ("", "   "):
        try:
            sanitize_database_url(bad)
        except ValueError:
            continue
        raise AssertionError(f"expected ValueError for {bad!r}")


def test_engine_selects_psycopg2_dialect():
    """End-to-end driver selection: engine construction must bind psycopg2,
    the dependency actually installed — never attempt `import psycopg`."""
    import sys as _sys
    from sqlalchemy import create_engine

    blocked = []

    class _Blocker:
        def find_module(self, name, path=None):
            if name == "psycopg" or name.startswith("psycopg."):
                blocked.append(name)
            return None

    _sys.meta_path.insert(0, _Blocker())
    try:
        url = sanitize_database_url("postgresql+psycopg://u:p@host:5432/db")
        engine = create_engine(url)
        assert engine.dialect.driver == "psycopg2", engine.dialect.driver
        assert not blocked, f"psycopg import attempted: {blocked}"
    finally:
        _sys.meta_path.pop(0)

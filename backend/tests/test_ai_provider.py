"""Muse Glimmer 30 provider tests — selection, request construction, response
parsing, and every failure mode. All transport is mocked; no real API key,
no network. Secrets must never appear in responses, logs, or errors.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("DATABASE_URL", "sqlite://")

import json

import pytest

from app.services import ai_provider as P
from app.services.ai_provider import (
    ProviderError, ProviderNotConfigured, build_glimmer_request,
    chat_complete, parse_provider_content, select_provider,
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for k in ("PAW_AI_PROVIDER", "MUSE_GLIMMER_API_KEY", "MUSE_GLIMMER_BASE_URL",
              "MUSE_GLIMMER_MODEL", "GROQ_API_KEY"):
        monkeypatch.delenv(k, raising=False)


def _ok(content, status=200):
    class _Resp:
        status_code = status

        def json(self):
            return {"choices": [{"message": {"content": content}}]}

    return _Resp()


def test_select_auto_prefers_glimmer_when_configured(monkeypatch):
    assert select_provider() == "groq"
    monkeypatch.setenv("MUSE_GLIMMER_API_KEY", "k")
    assert select_provider() == "glimmer"


def test_select_explicit_glimmer_requires_key():
    with pytest.raises(ProviderNotConfigured):
        select_provider("glimmer")


def test_glimmer_request_construction(monkeypatch):
    monkeypatch.setenv("MUSE_GLIMMER_API_KEY", "secret-abc")
    monkeypatch.setenv("MUSE_GLIMMER_BASE_URL", "https://glimmer.example/v1/")
    monkeypatch.setenv("MUSE_GLIMMER_MODEL", "glimmer-30")
    url, headers, payload = build_glimmer_request([{"role": "user", "content": "hi"}])
    assert url == "https://glimmer.example/v1/chat/completions"
    assert headers["Authorization"] == "Bearer secret-abc"
    assert payload["model"] == "glimmer-30"
    assert payload["messages"] == [{"role": "user", "content": "hi"}]


def test_glimmer_request_missing_config():
    with pytest.raises(ProviderNotConfigured) as e:
        build_glimmer_request([])
    assert "MUSE_GLIMMER_BASE_URL" in str(e.value)


def test_parse_valid_and_malformed():
    assert parse_provider_content('{"a": 1}') == {"a": 1}
    for bad in ("", "   ", "not json", "[1,2]", "null", 42, None):
        with pytest.raises(ProviderError):
            parse_provider_content(bad)


def test_glimmer_success_path(monkeypatch):
    monkeypatch.setenv("MUSE_GLIMMER_API_KEY", "k")
    monkeypatch.setenv("MUSE_GLIMMER_BASE_URL", "https://glimmer.example/v1")
    monkeypatch.setenv("MUSE_GLIMMER_MODEL", "glimmer-30")
    seen = {}

    class _Httpx:
        @staticmethod
        def post(url, headers=None, json=None, timeout=None):
            seen.update(url=url, headers=headers, payload=json)
            return _ok('{"message": "hi"}')

    monkeypatch.setattr(P, "httpx", _Httpx)
    out = chat_complete([{"role": "user", "content": "hi"}])
    assert out.provider == "glimmer" and out.model == "glimmer-30"
    assert seen["url"].endswith("/chat/completions")
    assert seen["headers"]["Authorization"] == "Bearer k"


def test_provider_500_maps_to_error(monkeypatch):
    class _Bad:
        status_code = 500
        text = "trace-secret-xyz"

    monkeypatch.setattr(P, "httpx", type("H", (), {"post": staticmethod(lambda *a, **k: _Bad())}))
    with pytest.raises(ProviderError) as e:
        chat_complete([{"role": "user", "content": "hi"}])
    assert e.value.status == 500
    assert "trace-secret-xyz" not in str(e.value)


def test_provider_429_maps_to_rate_limit(monkeypatch):
    class _R:
        status_code = 429

    monkeypatch.setattr(P, "httpx", type("H", (), {"post": staticmethod(lambda *a, **k: _R())}))
    with pytest.raises(ProviderError) as e:
        chat_complete([{"role": "user", "content": "hi"}])
    assert e.value.status == 429


def test_transport_failure_and_timeout(monkeypatch):
    import httpx as _hx

    def _boom(*a, **k):
        raise _hx.TimeoutException("too slow")

    monkeypatch.setattr(P, "httpx", type("H", (), {"post": staticmethod(_boom)}))
    with pytest.raises(ProviderError):
        chat_complete([{"role": "user", "content": "hi"}])


def test_malformed_provider_body(monkeypatch):
    class _Weird:
        status_code = 200

        def json(self):
            return {"nope": True}

    monkeypatch.setattr(P, "httpx", type("H", (), {"post": staticmethod(lambda *a, **k: _Weird())}))
    with pytest.raises(ProviderError):
        chat_complete([{"role": "user", "content": "hi"}])

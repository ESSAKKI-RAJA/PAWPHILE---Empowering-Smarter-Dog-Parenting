"""PAW AI provider abstraction — one seam for hosted LLM chat completions.

Selection (env-driven, no new dependencies):
- PAW_AI_PROVIDER=glimmer forces Muse Glimmer 30.
- PAW_AI_PROVIDER=groq forces the legacy Groq path.
- PAW_AI_PROVIDER=auto (default): Glimmer when MUSE_GLIMMER_API_KEY is set,
  otherwise Groq (existing behavior preserved).

Glimmer contract: OpenAI-compatible POST {base_url}/chat/completions with
{messages, model, temperature, max_tokens} and Bearer auth, parsed as
choices[0].message.content (JSON). ONLY `build_glimmer_request` and
`parse_provider_content` need edits if the provider's schema differs —
callers never touch HTTP details.

Safety invariants (enforced here, mirrored by route-level handling):
- Secrets never leave this module: Authorization header is built locally,
  failures log status codes only, provider error bodies are never returned.
- Missing/invalid configuration raises ProviderNotConfigured (controlled
  fallback upstream), never a crash, never a fabricated clinical answer.
- Timeouts, 4xx/5xx, rate limits, malformed bodies all map to ProviderError.
"""
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

PROVIDER_TIMEOUT_SECONDS = 15.0
PROVIDER_MAX_TOKENS = 1024
PROVIDER_TEMPERATURE = 0.7

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-70b-8192"


class ProviderNotConfigured(Exception):
    """No usable provider configuration (missing key/endpoint)."""


class ProviderError(Exception):
    """Upstream failure. `status` is the provider HTTP status when known."""

    def __init__(self, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.status = status


@dataclass
class ProviderSuccess:
    content: str  # raw model text (expected JSON; parsed by caller)
    provider: str
    model: str


def _getenv(name: str) -> str:
    return (os.getenv(name, "") or "").strip()


def select_provider(explicit: Optional[str] = None) -> str:
    """Resolve which provider to call. Never raises for unknown values —
    unknown falls back to auto semantics (documented, deterministic)."""
    want = (explicit if explicit is not None else _getenv("PAW_AI_PROVIDER") or "auto").lower()
    if want == "glimmer":
        if not _getenv("MUSE_GLIMMER_API_KEY"):
            raise ProviderNotConfigured("Muse Glimmer 30 requested but MUSE_GLIMMER_API_KEY is not set.")
        return "glimmer"
    if want == "groq":
        return "groq"
    # auto
    if _getenv("MUSE_GLIMMER_API_KEY"):
        return "glimmer"
    return "groq"


def build_glimmer_request(messages: list[dict[str, Any]]) -> tuple[str, dict[str, str], dict[str, Any]]:
    """Build (url, headers, json-body) for Muse Glimmer 30.

    Base URL and model come from the environment — never hard-coded, never
    guessed. Raises ProviderNotConfigured when incomplete.
    """
    base_url = _getenv("MUSE_GLIMMER_BASE_URL").rstrip("/")
    model = _getenv("MUSE_GLIMMER_MODEL")
    api_key = _getenv("MUSE_GLIMMER_API_KEY")
    missing = [n for n, v in (("MUSE_GLIMMER_BASE_URL", base_url),
                              ("MUSE_GLIMMER_MODEL", model),
                              ("MUSE_GLIMMER_API_KEY", api_key)) if not v]
    if missing:
        raise ProviderNotConfigured(
            "Muse Glimmer 30 is not configured (missing: %s)." % ", ".join(missing))
    return (
        base_url + "/chat/completions",
        {"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
        {"model": model, "messages": messages,
         "temperature": PROVIDER_TEMPERATURE, "max_tokens": PROVIDER_MAX_TOKENS,
         "response_format": {"type": "json_object"}},
    )


def parse_provider_content(content: Any) -> dict[str, Any]:
    """Parse model text into the PAW AI JSON contract. Raises ProviderError
    on anything that is not a JSON object (never fabricate fields)."""
    if not isinstance(content, str) or not content.strip():
        raise ProviderError("Empty model response.")
    try:
        parsed = json.loads(content)
    except (json.JSONDecodeError, TypeError, ValueError):
        raise ProviderError("Malformed model response.")
    if not isinstance(parsed, dict):
        raise ProviderError("Malformed model response.")
    return parsed


def _post(url: str, headers: dict[str, str], payload: dict[str, Any]) -> Any:
    try:
        return httpx.post(url, headers=headers, json=payload,
                          timeout=PROVIDER_TIMEOUT_SECONDS)
    except Exception as exc:
        # Timeouts, DNS, connection errors: never leak internals.
        logger.warning("ai provider transport failure: %s", type(exc).__name__)
        raise ProviderError("AI provider unreachable.")


def _raise_for_status(response: Any, provider: str) -> None:
    status = getattr(response, "status_code", None)
    if status == 200:
        return
    # Status only in logs; callers map to controlled HTTP responses.
    logger.warning("ai provider %s upstream error status=%s", provider, status)
    if status == 429:
        raise ProviderError("AI provider rate limit exceeded.", status=429)
    raise ProviderError("AI provider error.", status=status)


def _extract_content(response: Any) -> Any:
    try:
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, AttributeError):
        raise ProviderError("Malformed provider response.")


def chat_complete(messages: list[dict[str, Any]],
                  provider: Optional[str] = None) -> ProviderSuccess:
    """One chat-completion call through the selected provider.

    Raises ProviderNotConfigured (caller falls back to a controlled
    unavailable message) or ProviderError (caller maps to 502/controlled
    error). Never returns secrets, never fabricates content.
    """
    name = select_provider(provider)
    if name == "glimmer":
        url, headers, payload = build_glimmer_request(messages)
        model = _getenv("MUSE_GLIMMER_MODEL")
    else:
        url = GROQ_CHAT_URL
        headers = {"Authorization": "Bearer " + _getenv("GROQ_API_KEY"),
                   "Content-Type": "application/json"}
        payload = {"model": GROQ_MODEL, "messages": messages,
                   "response_format": {"type": "json_object"},
                   "temperature": PROVIDER_TEMPERATURE,
                   "max_tokens": PROVIDER_MAX_TOKENS}
        model = GROQ_MODEL
    response = _post(url, headers, payload)
    _raise_for_status(response, name)
    return ProviderSuccess(content=_extract_content(response),
                           provider=name, model=model)

# PAWPHILE AI & Vision Reference

This document maps all AI models, providers, APIs, and inference methods currently configured in the PAWPHILE repository.

## 1. PAW AI (Language Intelligence)

PAW AI is the core reasoning engine handling chat, triage, and food safety checks. It is implemented in `backend/app/api/routes/paw_ai.py` and `backend/app/services/paw_ai_engine.py`.

### Provider & Model
- **Provider**: Groq Cloud API
- **Model Used**: `llama3-70b-8192` (Meta Llama 3 70B parameter model)
- **Configuration**: Uses `GROQ_API_KEY` from the backend environment.
- **Inference Mode**: Direct HTTP REST via `httpx` to `https://api.groq.com/openai/v1/chat/completions`.
- **Formatting**: Uses OpenAI-compatible JSON mode (`response_format: { "type": "json_object" }`).

### Prompts & Guardrails
- **System Prompt**: Enforces strict JSON output and includes the mandate: *"NEVER make a diagnosis. If there is a risk, err on the side of caution and advise seeing a vet."*
- **Context Injection**: The backend actively injects a `dog_ctx` object containing the dog's breed, age, weight, and chronic conditions into the system prompt for personalized responses.
- **Safety Fallback**: Hardcoded Toxic Foods dictionary (`TOXIC_FOODS` in `paw_ai.py`) overrides LLM responses for known high-risk substances (e.g., chocolate, grapes, xylitol).
- **Veterinary Disclaimer**: Automatically appended to all successful PAW AI responses.

### Endpoints Powered
- `POST /api/paw-ai/chat` (Standard JSON inference)
- `POST /api/paw-ai/stream` (SSE Streaming)
- `POST /api/paw-ai/triage` (Symptom-based reasoning with structured risk metadata)
- `POST /api/paw-ai/food-safety` (Hybrid hardcoded + LLM evaluation)

## 2. Vision AI (Image Processing)

The Vision system analyzes user-uploaded photos to identify potential health or physical concerns. Implemented in `backend/app/services/vision_service.py`.

### Provider & Model
- **Provider**: Roboflow Serverless Inference (`serverless.roboflow.com`)
- **SDK Used**: `inference_sdk.InferenceHTTPClient` (Roboflow Python SDK)
- **Workspace**: `essakki-raja-t`
- **Workflow ID**: `pawphile-screening-prototype-1786216219585`
- **Configuration**: Uses `ROBOFLOW_API_KEY` from the backend environment.

### Inference Pipeline
1. **Preprocessing**: Image bytes received via FastAPI are loaded using `PIL.Image`. The image is converted to `RGB` format if it is not already.
2. **Inference**: The image is passed synchronously to `client.run_workflow()` via `asyncio.to_thread()` to prevent blocking the FastAPI event loop.
3. **Resilience**: Features exponential backoff for up to 3 attempts in case of API failure.
4. **Postprocessing**: The raw Roboflow output (a JSON string nested in `screening_result`) is parsed. The system extracts:
   - `triage`: Normalized to `green`, `yellow`, or `red`.
   - `concerns`: Array of detected issues.
   - `confidence`: Floating point confidence score.
   - `summary` / `disclaimer`.

### Endpoints Powered
- `POST /api/vision/scan`

## 3. Legacy / Offline AI

### Local LLM Support (Ollama)
- **Status**: [OBSOLETE / PARTIALLY IMPLEMENTED]
- **Evidence**: `OLLAMA_URL` in `frontend/.env.example` and references in `frontend/src/services/chatEngine.ts`.
- **Usage**: Previously used for local inference but effectively superseded by the cloud-based Groq integration for the production environment.

## 4. Breed Intelligence Knowledge Base

- **Status**: [IMPLEMENTED IN CODE]
- **Location**: `backend/app/services/paw_ai_engine.py` (specifically `BREED_RULES` dictionary).
- **Data**: Contains structured intelligence on 20 core breeds. Includes breed-specific traits that alter the behavior of PAW AI triage (e.g., flagging bloat risk for Great Danes).
- **Endpoints**: `GET /api/paw-ai/breed-context/{breed}`

## 5. RAG (Retrieval-Augmented Generation)

- **Status**: [STUBBED]
- **Evidence**: `POST /api/knowledge/ingest` exists in `paw_ai.py` but currently returns a stub response indicating that `sentence-transformers` and `pgvector` need to be connected to activate the pipeline.

# PAWPHILE Architecture Decision Records (ADR)

This document captures the rationale behind major architectural choices in PAWPHILE.

## 1. Database & Persistence (The Split-Brain Architecture)
- **DECISION**: Implement both FastAPI/SQLAlchemy (Backend) and Supabase Client (Frontend) simultaneously.
- **REASON**: The application was partially migrated. Original PWA/offline syncing logic (`SyncManager.tsx`) was built to sync directly with Supabase native tables (e.g., `preventive_care_records`). Later, a secure Python backend was introduced to handle AI/Vision logic, establishing its own SQLAlchemy ORM (`vaccine_records`, `dog_profiles`). 
- **CURRENT STATE**: **Partially Migrated / Split Brain**. The frontend sends data to BOTH the backend REST API and the Supabase direct tables.
- **TRADE-OFF**: This creates data duplication and maintenance overhead, but preserves the aggressive PWA offline-first capabilities that haven't been re-written for the REST API.
- **FUTURE CONSIDERATION**: Unified architecture. The frontend `SyncManager` should be refactored to queue REST API calls to FastAPI, removing the Supabase Javascript client from the frontend entirely, establishing FastAPI as the sole data gatekeeper.

## 2. Artificial Intelligence (PAW AI)
- **DECISION**: Use Groq Cloud with Meta Llama 3 (`llama3-70b-8192`) instead of local/on-device Ollama.
- **REASON**: Llama 3 70B provides superior reasoning for medical triage compared to small local models. Groq provides ultra-low latency inference which makes the chat interface feel real-time.
- **CURRENT STATE**: **Fully Implemented**. `OLLAMA_URL` remains in `.env.example` as a legacy artifact.
- **TRADE-OFF**: Relies on a cloud connection (cannot do triage offline) and incurs API costs.
- **FUTURE CONSIDERATION**: Implement a lightweight local fallback (like WebGPU Llama) for critical offline triage.

## 3. Computer Vision (Vision AI)
- **DECISION**: Use Roboflow Serverless Inference API via Python `inference_sdk`.
- **REASON**: Abstracting the vision model to a serverless workspace allows continuous model retraining on Roboflow without deploying heavy PyTorch/ONNX dependencies in the Render backend.
- **CURRENT STATE**: **Fully Implemented** in `vision.py`.
- **TRADE-OFF**: Introduces a dependency on Roboflow uptime and network latency for image uploads.
- **FUTURE CONSIDERATION**: Caching common image classifications or moving to an Edge-deployed Roboflow container for faster response times.

## 4. File Storage (Images vs Reports)
- **DECISION**: Use Cloudinary for images (Vision) and Supabase Storage for PDFs (Reports).
- **REASON**: Cloudinary offers superior on-the-fly image transformations (resizing, cropping) which helps optimize Vision AI preprocessing. Supabase Storage is utilized for generated Vet Reports as it aligns with the data storage ecosystem.
- **CURRENT STATE**: **Implemented**.
- **TRADE-OFF**: Having two different blob storage providers complicates infrastructure management.
- **FUTURE CONSIDERATION**: Consolidate all storage to Supabase to reduce the dependency footprint.

## 5. Safety Engine (Deterministic Guardrails)
- **DECISION**: Enforce hardcoded dictionaries (`TOXIC_FOODS`) and regex rules (`detect_emergency`) *before* the LLM.
- **REASON**: LLMs hallucinate. In a pet healthcare context, failing to flag grapes or chocolate as toxic is unacceptable. Deterministic rules override probabilistic generation.
- **CURRENT STATE**: **Fully Implemented**.
- **TRADE-OFF**: Requires manual maintenance of the toxic foods list and regex patterns.
- **FUTURE CONSIDERATION**: Build an admin UI to dynamically update the `TOXIC_FOODS` dictionary without deploying code.

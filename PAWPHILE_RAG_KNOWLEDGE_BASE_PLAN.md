# PAWPHILE RAG Knowledge Base Architecture

## 1. System Objective
Integrate Retrieval-Augmented Generation (RAG) to ground PAW AI's generative responses in highly trusted, verified veterinary databases (e.g., AAHA, WSAVA, Merck Veterinary Manual), drastically reducing hallucinations while strictly maintaining deterministic safety overrides.

## 2. Infrastructure & Storage
- **Database:** Supabase PostgreSQL with the `pgvector` extension.
- **Table Schema:** `knowledge_embeddings`
  - `id` (UUID)
  - `content_chunk` (Text)
  - `metadata` (JSONB) - Contains `source_org`, `author_credentials`, `last_updated`, `tags`.
  - `embedding` (Vector: 1536/384/etc. depending on the embedding model).

## 3. Ingestion & Tagging Pipeline
1. **Source Vetting:** Only official, peer-reviewed documents are ingested. Scraping random pet blogs is strictly banned.
2. **Chunking Strategy:** Documents chunked by semantic sections (e.g., "Symptoms of Parvo", "Diet for Renal Failure") to maintain context continuity.
3. **Embedding Generation:** Fast/local embedding model (e.g., `bge-small-en` or `text-embedding-3-small`) to convert chunks into dense vectors.
4. **Metadata Tagging:** Crucial step. Every chunk must have a `source_org` label to be returned to the frontend for UI citation.

## 4. Retrieval & LLM Generation Logic
1. User submits query to FastAPI (`/api/paw-ai/chat`).
2. *[Guardrail Check]* - See Section 5.
3. Query is embedded.
4. Top K (e.g., 3-5) closest knowledge chunks are retrieved using vector similarity search in Supabase.
5. The LLM (Ollama/Gemma) prompt is injected with: 
   *"You are PAW AI. Answer the user based ONLY on the following context. Do not invent medical advice. If the context does not answer the question, state: 'I don't have verified data on that.' Context: {retrieved_chunks}"*
6. The frontend receives the answer alongside an array of `citations` (e.g., `"Source: WSAVA Nutrition Guidelines"`).

## 5. Unbreakable Architectural Rule: Guardrail Supremacy
**The Deterministic Safety Guardrails MUST execute before RAG retrieval or LLM inference.**
- **Enforcement Location:** `backend/app/services/paw_ai_engine.py` -> `generate_paw_ai_response()`
- **Mechanism:** The `EmergencyClassifier` and `ToxicFoodDetector` strictly parse the raw user query.
- **Rule:** If a red-flag is triggered (e.g., "grapes", "seizure", "unresponsive"), the RAG pipeline is **bypassed entirely**. The engine immediately returns the static, deterministic emergency response. **An LLM cannot be trusted to rewrite emergency triage instructions.**

*Build & Verify: The FastAPI test suite (`run_safety_tests.py`) proves this exact bypass is active and functioning in the current codebase.*

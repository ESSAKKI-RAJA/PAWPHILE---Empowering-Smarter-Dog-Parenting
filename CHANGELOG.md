# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Export to PDF functionality for comprehensive veterinary health reports.
- Extended Vision AI datasets for early detection of cataract progression (EyeScan AI™).

### Changed
- Refined Groq LLM system prompt to further minimize diagnostic hallucinations.

## [1.0.0] - 2026-07-06

### Added
- **Core Platform Release**: Initial stable release of the PAWPHILE enterprise-grade architecture.
- **Frontend PWA**: React + Vite application with IndexedDB for offline-first support.
- **FastAPI Core**: Secure API with SQLAlchemy and Neon PostgreSQL integration.
- **Clerk Authentication**: Seamless identity management and stateless JWT validation.
- **PAW AI Triage Assistant**: Integrated with Groq for low-latency, context-aware veterinary triage.
- **Deterministic Rule Engine**: Hardcoded red-tier emergency detection to bypass LLM during critical scenarios.
- **Vision AI Service (Beta)**: Independent PyTorch-based FastAPI microservice utilizing ResNet50 for DermAI™ hot spot and lesion detection.
- **Cloudinary Integration**: Secure, backend-proxied image uploading and storage pipeline.

### Changed
- Migrated entirely away from Supabase to Neon PostgreSQL for the database layer.
- Simplified local development by removing Docker dependency requirements.

### Removed
- Legacy Docker Compose configurations and Supabase migration scripts (moved to `archive/`).

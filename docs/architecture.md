# Architecture

## Overview

```
Browser (React + Vite + TypeScript)
     │
     │  Auth: Clerk JWT
     │  API calls with Bearer token
     ▼
FastAPI Backend (port 8001)
     │
     ├──► Neon PostgreSQL (cloud)
     │      All user, dog, health data
     │
     ├──► Cloudinary (cloud)
     │      All image uploads (profile, vision scans)
     │      SECRET stays on backend only
     │
     └──► Vision FastAPI Service (port 8000)
            PyTorch / ResNet inference
            Returns prediction, confidence, explanation
```

## Security Rules
1. **Clerk JWT** — every protected route verifies `Authorization: Bearer <token>`.
2. **clerk_user_id** is always extracted from the token server-side. Frontend body is never trusted for user identity.
3. **Cloudinary API Secret** — never sent to frontend. Backend handles all uploads.
4. **Neon** — accessed only from backend. DATABASE_URL never exposed to frontend.
5. **Vision service** — called from backend after Cloudinary upload. Frontend never calls Vision directly.

## Data Flow: Vision Scan
```
Frontend → POST /api/vision/scan (multipart form, Bearer token)
  Backend:
    1. Verify Clerk JWT → get clerk_user_id
    2. Verify dog ownership
    3. Upload image to Cloudinary → get secure_url + public_id
    4. Call Vision service POST /predict
    5. Save result to Neon (vision_scan_records)
    6. Return VisionScanOut to frontend
```

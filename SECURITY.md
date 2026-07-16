# Security Policy

## Supported Versions

Currently, only the latest release of PAWPHILE receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of PAWPHILE seriously. If you believe you have found a security vulnerability in the PAWPHILE platform, its backend, Vision AI service, or offline sync engine, please report it to us immediately.

### How to Report
Please do **not** report security vulnerabilities through public GitHub issues.

Instead, please email the maintainers directly at:
**[essakki.data@gmail.com]** (or the designated security contact).

### What to Include
When reporting a vulnerability, please provide the following details:
1. **Description**: A clear description of the vulnerability.
2. **Scope**: Which component is affected (e.g., FastAPI backend, React PWA, Cloudinary upload flow, Clerk integration).
3. **Reproduction Steps**: Step-by-step instructions on how to reproduce the issue.
4. **Impact**: An assessment of the potential impact (e.g., unauthorized access, data exposure, XSS, SSRF).
5. **Proof of Concept (PoC)**: Any scripts, screenshots, or HTTP request dumps that demonstrate the vulnerability.

### Response Timeline
- We will acknowledge receipt of your vulnerability report within **48 hours**.
- We aim to provide an initial assessment and timeline for a fix within **5 business days**.
- Once the vulnerability is confirmed and patched, we will publicly acknowledge your contribution (with your permission) in our release notes.

## Security Architecture & Best Practices

If you are deploying PAWPHILE in a production environment, please review the following security domains:

### 1. Identity & Authentication
- All authentication is delegated to **Clerk**.
- The frontend must never handle raw passwords.
- The backend relies entirely on validating the Clerk-issued JWT signature.
- `clerk_user_id` should always be extracted from the validated token on the backend, not trusted from the client payload.

### 2. Data Access & Authorization
- Implement Row Level Security (RLS) policies in Neon/Postgres or enforce strict ORM multi-tenancy filters (`WHERE clerk_user_id = :id`) to ensure users can only access data belonging to their own dogs.

### 3. Image Storage (Cloudinary)
- **Do not expose the Cloudinary API Secret to the frontend.**
- Image uploads must be proxied through the FastAPI backend to ensure authentication and authorization before uploading to the storage bucket.
- User-uploaded images should be treated as untrusted data and sanitized.

### 4. Machine Learning & API Key Management
- API Keys for external services (Groq LLM, Cloudinary, Clerk Secret) must be stored in secure environment variables.
- Ensure the `.env` files are added to `.gitignore` and never committed to version control.

### 5. Deterministic Safety Guardrails
- The Vision AI and LLM services must not be exposed directly to the public internet without the FastAPI proxy layer to enforce the deterministic emergency rule engine and rate-limiting.

Thank you for helping keep PAWPHILE and the data of our users secure.

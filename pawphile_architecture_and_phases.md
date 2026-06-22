# PAWPHILE: AI Dog Health Platform Architecture & Overview

This document serves as the master blueprint for **PAWPHILE**, detailing its development phases, underlying systems, primary use cases, data architecture, and technology stack.

---

## 1. Development Phases

The product was built systematically to ensure scalability, offline-first reliability, and a premium user experience:

*   **Phase 1: Foundation & Scaffolding**
    *   Setup of the Vite + React TypeScript frontend and the Python FastAPI backend.
    *   Establishment of the fundamental routing architecture and dummy data structures.
*   **Phase 2: UI/UX & Core Modules Design**
    *   Development of a mobile-first, responsive interface heavily utilizing Tailwind CSS.
    *   Creation of core screens: Dashboard, Profile Setup, Nutrition Tracker, Walk Reminder, and Settings.
    *   Implementation of the global `ThemeContext` for seamless Light/Dark mode toggling.
*   **Phase 3: Intelligence & Engine Integration**
    *   Implementation of deterministic health algorithms: **MER** (Maintenance Energy Requirement) and **BCS** (Body Condition Score).
    *   Creation of the `behaviorEngine` for detecting mood anomalies.
    *   Integration of the AI Symptom Checker and Emergency Triage system.
*   **Phase 4: Advanced Features & Connectivity**
    *   Development of the **Vision AI Scan** interface (for analyzing physical traits via image uploads).
    *   Integration of `jsPDF` and `html2canvas` for generating professional, exportable PDF medical reports.
    *   Implementation of `react-leaflet` for the interactive Vet Finder map.
*   **Phase 5: Global State Migration & Hardening (Current)**
    *   Centralizing all fragmented states into a unified `PawphileDataContext` as the single source of truth.
    *   Connecting the UI components to global states so updates in the Profile instantaneously reflect across Triage, Nutrition, and Reports.
    *   End-to-end responsiveness pass (ensuring it looks like a premium web app on desktop, rather than a stretched mobile screen).

---

## 2. Core Systems

The PAWPHILE platform is composed of three primary interconnected systems:

1.  **Frontend Client Application (UI/UX Layer):**
    *   The user-facing portal built in React. It handles all state management, user interactions, local caching, charting, and PDF generation. It uses a "Local-First" approach, saving data to LocalStorage immediately to ensure the app works instantly without network lag.
2.  **Core API Backend (Data & Auth Layer):**
    *   Built with FastAPI (Python), this system is designed to handle cloud synchronization, user authentication, and heavy server-side validation.
3.  **Vision Intelligence Service (AI Layer):**
    *   A separate, dedicated Python/batch pipeline (`vision/start.bat`) designed to process image-based AI tasks such as breed detection, physical anomaly spotting, and BCS visual estimation.

---

## 3. Product Uses & Capabilities

PAWPHILE acts as an all-in-one digital health assistant for dog owners:

*   **Emergency Triage & Symptom Checking:** Evaluates symptoms to categorize severity (Mild, Moderate, Emergency) and provides immediate first-aid guidance.
*   **Nutritional & Weight Management:** Calculates precise daily caloric needs based on breed, age, activity level, and spay/neuter status to prevent canine obesity.
*   **Preventive Care Tracking:** Logs vaccinations, upcoming due dates, and daily walking statistics.
*   **Behavioral Monitoring:** Tracks sleep, mood, and lethargy over time using interactive trend charts to detect early signs of illness.
*   **Report Generation:** One-click generation of professional PDF reports (Full Medical, Vaccine Certificates, Triage Logs) to hand over to veterinarians or boarding facilities.
*   **Location Services:** Helps owners quickly locate nearby veterinary clinics, emergency hospitals, and pharmacies on an interactive map.

---

## 4. Data Models & Usage

The application centers around highly structured, veterinary-aligned data:

*   **`dogProfile` (The Core Context):**
    *   *Fields:* Name, Breed, DOB/Age, Gender, Weight, Diet Type, Activity Level, Spay/Neuter status, Health Goals (Maintenance/Weight Loss).
    *   *Usage:* Used by every engine in the app to calculate baselines (e.g., calculating MER requires weight, age, and neutered status).
*   **`BREEDS` Dataset:**
    *   *Fields:* Ideal weight ranges, exercise requirements, climate suitability.
    *   *Usage:* Acts as the reference library. If a dog is above its breed's ideal weight, the UI automatically flags it and adjusts calorie targets.
*   **Health & Daily Logs:**
    *   *`nutritionLogs`:* Daily food intake vs. target calories.
    *   *`behaviorLogs`:* Daily scores (1-5) for mood, appetite, lethargy.
    *   *`vaccineRecords`:* Vaccine types, administered dates, and next due dates.
*   **`reportHistory` & `medicalRecords`:**
    *   Logs of past triage emergencies and chronic conditions (allergies, prior surgeries) used for compiling veterinary PDFs.

---

## 5. Technology Stack

### Frontend (Client)
*   **Framework:** React 18, Vite, TypeScript
*   **Styling:** Tailwind CSS (with advanced `dark:` variants for dark mode)
*   **Icons:** Lucide React
*   **Data Visualization:** Recharts (responsive SVG charts)
*   **Routing:** React Router v6
*   **Mapping:** React Leaflet (OpenStreetMap integration)
*   **Document Generation:** jsPDF, html2canvas

### Backend (Core API)
*   **Framework:** FastAPI (Python)
*   **Server:** Uvicorn
*   **Data Validation:** Pydantic
*   **Environment Management:** `venv`, Python `python-dotenv`

### Vision / AI Services
*   **Execution:** Python Scripts / Windows Batch files (`start.bat`)
*   **Infrastructure:** Typically involves OpenCV, PyTorch, or ONNX runtimes for evaluating computer vision models locally.

### Infrastructure / Persistence
*   **Local Data:** Browser `LocalStorage` API (via React Context)
*   **Cloud Data:** Supabase (PostgreSQL, Authentication) - *Wired in settings for synchronization.*

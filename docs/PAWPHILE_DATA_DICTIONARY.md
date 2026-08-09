# PAWPHILE Data Dictionary

> [!WARNING]
> **SPLIT BRAIN ARCHITECTURE**: PAWPHILE currently maintains two distinct data schemas.
> 1. The **Supabase Native Schema** (documented below) is used directly by the frontend PWA offline sync (`syncService.ts`).
> 2. The **FastAPI Backend Schema** uses SQLAlchemy ORM (`backend/app/models/all_models.py`) mapping to tables like `users`, `dog_profiles`, `vaccine_records`, and `vision_scan_records`. 
> Data is currently duplicated across these paths.

This document represents the Supabase Native schema derived from `backend/supabase_schema.sql`.

## Core Entities

### 1. `profiles`
**Purpose**: Stores user account details. Linked to Clerk authentication via `clerk_user_id`.
**RLS Policy**: Users can only read and write their own profile based on Clerk JWT `sub`.
| Field | Type | Required? | Description | Sensitive? |
|-------|------|-----------|-------------|------------|
| `id` | UUID | Yes | Primary key | No |
| `clerk_user_id` | TEXT | Yes | Unique ID provided by Clerk authentication | Yes |
| `name` | TEXT | Yes | User's full name | Partially |
| `phone` | TEXT | No | User's phone number | Yes |
| `email` | TEXT | No | User's email address | Yes |
| `city` | TEXT | No | User's city | No |
| `address` | TEXT | No | User's full address | Yes |
| `app_language` | VARCHAR | No | App language preference (default: 'en') | No |
| `subscription_status` | VARCHAR | No | Subscription tier (default: 'free') | No |
| `cloud_backup_enabled` | BOOLEAN | No | Opt-in for cloud backup | No |
| `consent_for_ai` | BOOLEAN | No | Opt-in for AI data processing | No |

### 2. `dogs`
**Purpose**: Represents dog profiles belonging to a user.
**RLS Policy**: Users can only access dogs where `profile_id` matches their own `profile_id`.
| Field | Type | Required? | Description | Sensitive? |
|-------|------|-----------|-------------|------------|
| `id` | UUID | Yes | Primary key | No |
| `profile_id` | UUID | Yes | Foreign key to `profiles.id` | No |
| `name` | TEXT | Yes | Dog's name | No |
| `photo_url` | TEXT | No | URL to dog's profile picture | No |
| `breed` | TEXT | Yes | Dog's breed | No |
| `dob` | DATE | Yes | Date of birth | No |
| `gender` | VARCHAR | Yes | Dog's gender | No |
| `weight_kg` | DECIMAL | No | Dog's weight in kilograms | No |
| `diet_type` | TEXT | No | Dog's diet description | No |
| `activity_level` | VARCHAR | No | Dog's activity level rating | No |
| `health_goal` | VARCHAR | No | Specific health goals | No |
| `neutered` | BOOLEAN | No | Spay/Neuter status | No |
| `allergies` | TEXT[] | No | Array of known allergies | Health Data |
| `past_illnesses`| TEXT[] | No | Array of past illnesses | Health Data |
| `medical_history`| TEXT | No | Free text medical history | Health Data |
| `linked_vet_id` | UUID | No | Foreign key to `vet_clinics.id` | No |

## Health & Logging Entities

### 3. `dog_health_logs`
**Purpose**: General purpose health logging.
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `dog_id` | UUID | Yes | Target dog profile |
| `log_type`| VARCHAR | No | Type of log (e.g., 'weight', 'temperature') |
| `value` | TEXT | No | Value logged |
| `notes` | TEXT | No | Additional user notes |

### 4. `triage_events`
**Purpose**: Records outputs of the PAW AI triage engine.
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `symptoms` | TEXT[] | Yes | Array of reported symptoms |
| `duration` | VARCHAR | No | Duration of symptoms |
| `severity_rating`| INTEGER | No | Computed severity |
| `calculated_risk_level` | VARCHAR | No | Red/Yellow/Green classification |
| `ai_assessment` | TEXT | No | Output text from Groq LLM |
| `recommended_action`| TEXT | No | Action recommended to user |

### 5. `vision_scans`
**Purpose**: Records outputs from the Roboflow vision engine.
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `image_url` | TEXT | Yes | URL of uploaded image |
| `body_area` | VARCHAR | No | Area of body scanned |
| `concern_type` | VARCHAR | No | User-selected concern category |
| `ai_confidence` | DECIMAL | No | Confidence score from Roboflow |
| `ai_findings` | TEXT | No | Processed findings text |
| `disclaimer_accepted`| BOOLEAN| No | Whether user accepted the liability disclaimer |

### 6. `nutrition_logs`
**Purpose**: Records dietary intake for dogs.
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `meal_type` | VARCHAR | No | Breakfast, Dinner, Snack, etc. |
| `food_name` | TEXT | No | Name of food fed |
| `calories_kcal` | INTEGER | No | Calories logged |
| `amount_grams` | INTEGER | No | Weight of food logged |

### 7. `behavior_logs`
**Purpose**: Records behavioral tracking (mood, appetite).
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `mood_score` | INTEGER | No | 1-5 scale rating |
| `appetite_score` | INTEGER | No | 1-5 scale rating |
| `lethargy_score` | INTEGER | No | 1-5 scale rating |
| `sleep_hours` | DECIMAL | No | Estimated sleep duration |

### 8. `preventive_care_records`
**Purpose**: Tracks vaccines, deworming, and routine care.
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `care_type` | VARCHAR | No | e.g., 'vaccine', 'deworming' |
| `name` | TEXT | No | Name of treatment |
| `administered_date`| DATE | No | Date given |
| `next_due_date` | DATE | No | Due date for reminders |
| `veterinarian` | TEXT | No | Vet who administered treatment |

### 9. `reports`
**Purpose**: Metadata for generated PDF health reports.
| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `report_type` | VARCHAR | No | Type of report generated |
| `file_path` | TEXT | Yes | Path to file in Cloudinary/Supabase Storage |
| `included_sections`| TEXT[] | No | Sections the user chose to include |

## Utility Entities

### 10. `reminder_preferences` & `reminder_events`
**Purpose**: Configures when a user receives push/email notifications and logs those notifications.

### 11. `vet_clinics`
**Purpose**: PostGIS-enabled table of veterinary clinics.
**Features**: Includes a geography `POINT` and an RPC function `search_clinics(lat, lng, radius)` for geospatial queries.

### 12. `pawnews_articles` & `pawnews_sources`
**Purpose**: Caches articles fetched from external PAWNEWS sources (Guardian, GNews, NewsData).

### 13. `paw_ai_events`
**Purpose**: Audit logging for queries sent to the Groq LLM.
| Field | Type | Description |
|-------|------|-------------|
| `query_intent`| VARCHAR | Categorized intent of user query |
| `guardrail_triggered`| BOOLEAN | True if the safety engine intervened |
| `source_context_used`| TEXT[] | Context fragments passed to LLM |

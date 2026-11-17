# Persistent Core Workflows

The repository includes an additive FastAPI workflow API under `/api/v1`. It uses
new `core_` database tables and leaves the existing Node API, its authentication
tokens, and its data untouched. The new frontend integrations are opt-in:
`VITE_CORE_API_ENABLED=true`. Leave the flag unset or false to retain the
existing application integrations.

## What is connected

- Institution assessment creation in the admin assessment form, including
  question authoring payloads, candidate roster synchronization, publication,
  and per-candidate exam links.
- Public candidate exam links, server-validated schedule and assignment, email
  OTP, timed start, MCQ answer persistence, coding draft/run/submit, evaluation,
  and candidate report retrieval.
- Eligible institution assessment interviews use their assessment and attempt
  IDs and stay on the assessment page. They do not use Practice Interviews.
- `/upload-resume` in core mode confirms edited profile data, requests role
  recommendations, persists the selected career goal and skill gaps, then
  opens `/career-assessment/:analysisId` for a skill-wise interview, report,
  server-checked subscription, learning plan, and progress tracking.

In the admin form, each section needs a JSON array containing actual questions.
MCQ entries require `prompt`, `marks`, `public_data.options`, and
`answer_key.correct_option_id`. Coding entries require `prompt`, `marks`,
`public_data` (including language/starter code and optional visible sample
cases), and server-only `hidden_test_cases`. The API validates the data and
does not return MCQ answer keys or hidden coding cases to candidates.

## Configure and run on Windows PowerShell

1. Install the frontend dependencies and configure Vite to proxy to the
   FastAPI service:

   ```powershell
   npm install
   $env:VITE_CORE_API_ENABLED = "true"
   $env:VITE_RESUME_API_URL = "http://127.0.0.1:8000"
   npm run dev
   ```

2. Set up and start the FastAPI service in a second PowerShell window:

   ```powershell
   Set-Location roleinterview
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

   Configure the following values in the service process/environment before
   starting it. Use the actual legacy JWT verification contract; do not copy
   example or guessed claims:

   - `CORE_DATABASE_URL` (recommended PostgreSQL URL using `psycopg`).
   - `CORE_LEGACY_JWT_ALGORITHM`
   - `CORE_LEGACY_JWT_VERIFYING_KEY`
   - `CORE_LEGACY_JWT_ISSUER`
   - `CORE_LEGACY_JWT_AUDIENCE`
   - `CORE_LEGACY_JWT_SUBJECT_CLAIM`
   - `CORE_LEGACY_JWT_ROLE_CLAIM`
   - `CORE_LEGACY_JWT_EMAIL_CLAIM`
   - `CORE_LEGACY_ADMIN_ROLE_VALUES` (comma-separated accepted admin role
     values)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and, when needed,
     `SMTP_USERNAME` / `SMTP_PASSWORD` for OTP delivery.
   - `CORE_JUDGE0_URL` and `CORE_JUDGE0_ALLOWED_LANGUAGE_IDS` for server-side
     code execution. Optional resource settings are
     `CORE_JUDGE0_CPU_SECONDS`, `CORE_JUDGE0_MEMORY_KB`,
     `CORE_JUDGE0_TIMEOUT_SECONDS`, and `CORE_JUDGE0_API_KEY`.

   Apply the additive migration and run the service:

   ```powershell
   alembic -c alembic.ini upgrade head
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   Career role discovery, question generation, and answer evaluation use the
   existing local Ollama integration (`http://localhost:11434`, model
   `qwen2.5:1.5b`). Make the required model available before exercising those
   stages. No generated question, evaluation, or code execution result is
   replaced with a frontend mock.

3. Validate:

   ```powershell
   npm run typecheck
   npm run build
   Set-Location roleinterview
   python -m unittest discover -s tests -p test_core_workflows.py -v
   ```

## API areas

The routers are mounted under `/api/v1`:

- Admin: `/institutions`, `/institutions/{id}/members:sync`,
  `/assessments`, `/assessments/{id}/publish`, `/assessments/{id}/results`.
- Exam: `/exam/{token}`, `/exam/{token}/otp`,
  `/exam/{token}/otp/verify`, `/exam/{token}/start`, answer/coding routes,
  `/exam/{token}/submit`, `/exam/{token}/report`.
- Assessment interview: `/assessments/{assessment_id}/attempts/{attempt_id}/interview/start`
  and `/assessment-interviews/{interview_id}/...`.
- Career assessment: `/career/profile`, `/career/roles/recommend`,
  `/career/goal`, `/career/skill-gaps/{id}`,
  `/career/interviews/{id}/...`, `/subscriptions/me`, and
  `/learning-plans/...`.

## Safety and verification limits

- Legacy JWT verification settings and production database export/contract
  were not provided. Protected core APIs deliberately return `503` until the
  verification settings are complete; the existing authentication service is
  not replaced.
- The migration creates only namespaced core tables and its downgrade is
  intentionally non-destructive. Review and back up the production database
  before applying any migration.
- SMTP, PostgreSQL, Judge0, Ollama, deployed JWT claims/roles, browser-delivered
  OTP, and full production journeys have not been exercised in this workspace.
- The legacy Node service source is absent here. Core-mode frontend integration
  must be enabled only after identity/claim mapping, service configuration,
  and production database provisioning are verified.

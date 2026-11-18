# skillEngine

One React app (Vite, port 5173) with three backends:

| Service | Where | Role |
|---|---|---|
| Legacy Node API | `VITE_BACKEND_URL` (source **not** in this repo) | users, quiz, coding, master data, `/api/assessment/*` |
| Role-interview API | `roleinterview/` (FastAPI, `app.main:app`, port 8000) | resume analysis, roles, skill-wise interviews, and the opt-in `core_` workflows under `/api/v1` |
| Ollama / Groq / Judge0 / SMTP / PostgreSQL | external | see `roleinterview/.env.example` |

Two independent workflows: **Institution Assessment** (`/exam/:token`, `/assessment/:token`, admin under `/admin`)
and **Individual career** (`/upload-resume`, `/career-assessment/:analysisId`). Assessment-linked interviews
stay inside the assessment pages and never use Practice Interviews. Core mode is off until
`VITE_CORE_API_ENABLED=true` — see [docs/core-workflows.md](docs/core-workflows.md).

## Run on Windows (PowerShell, two terminals)

Backend (first run):
```powershell
cd roleinterview
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env        # then fill in values
alembic -c alembic.ini upgrade head   # needs CORE_DATABASE_URL
.\run_backend.ps1             # picks first free port of 8000,8001,8002,8003,8010
```
Frontend:
```powershell
npm install
copy .env.example .env
npm run dev                   # http://localhost:5173 (listens on 0.0.0.0)
npm run typecheck ; npm run build
```
`roleinterview/app.py` is a standalone **Streamlit** demo client, not the API; do not run it with uvicorn.

## Reaching the app over Tailscale
`http://100.66.72.68:5173/admin/dashboard?section=Dashboard` works only if Vite runs on that machine, the
Windows firewall allows inbound TCP 5173, and the Node API (`VITE_BACKEND_URL`) is reachable from it. Unauthenticated
visitors are redirected to `/admin/login` and returned to the original URL after signing in. If a browser calls
FastAPI directly, add `http://100.66.72.68:5173` to `CORS_ORIGINS`.

## Layout
`src/admin` admin panel · `src/assessment` timed MCQ/coding assessment (TypeScript) · `src/components` practice,
auth, dashboard, interview · `roleinterview/app` FastAPI (routers, schemas, models, services, Alembic migrations).
Further docs: [docs/exam-link-setup.md](docs/exam-link-setup.md), [docs/gap-report.md](docs/gap-report.md).

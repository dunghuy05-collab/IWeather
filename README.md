# AI Personal Travel Planner

Web application that will turn a travel request into a personalized, weather-aware,
budget-conscious itinerary. The system is being delivered incrementally through the
checkpoints in the project specification.

## Checkpoint status

Checkpoint 1, Checkpoint 2, and Checkpoint 3 are implemented. The repository contains:

- Next.js frontend with TypeScript, App Router, Tailwind CSS, and ESLint
- FastAPI backend with typed settings, CORS, health endpoint, and API documentation
- Environment-variable templates with no committed secrets
- Backend tests and linting
- Dockerfiles and Docker Compose configuration
- A responsive trip-request form with client-side validation
- Validated travel-request API endpoints backed by SQLAlchemy
- Local SQLite persistence, configurable for a production database later
- Basic LLM travel planning with stateless conversation continuation

### Checkpoint 2 API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/travel-requests` | Validate and save a trip request |
| `GET` | `/api/v1/travel-requests` | List saved requests |
| `GET` | `/api/v1/travel-requests/{id}` | Read one saved request |
| `POST` | `/api/v1/travel-requests/{id}/plan` | Generate an AI itinerary |
| `POST` | `/api/v1/travel-requests/{id}/chat` | Continue an AI planning conversation |

## Repository layout

```text
backend/                  FastAPI application and tests
frontend/                 Next.js application
docker-compose.yml        Local container orchestration
AI_Personal_...docx       Original project specification
```

## Local setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
# Add OPENAI_API_KEY to .env before calling the planning endpoints.
uvicorn app.main:app --reload
```

The API runs at <http://localhost:8000>, interactive documentation is available at
<http://localhost:8000/docs>, and the health endpoint is
<http://localhost:8000/api/v1/health>.

### Frontend

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

The web application runs at <http://localhost:3000>.

## Tests and quality checks

```powershell
cd backend
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python -m ruff check .

cd ..\frontend
npm run lint
npm run build
```

## Docker

Create local environment files first, then run both services:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.local.example frontend\.env.local
docker compose up --build
```

Real API keys and secrets must only be added to local environment files or a secret
manager; they must never be committed.

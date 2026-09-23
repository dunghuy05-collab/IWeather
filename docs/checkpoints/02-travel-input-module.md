# Checkpoint 2 — User Travel Input Module

Status: **Complete**

## Delivered

- Responsive Vietnamese trip-requirement form
- Destination, budget, currency, duration, travel style, interests, and notes inputs
- Browser constraints and clear submission feedback
- Pydantic server-side validation and normalization
- SQLAlchemy `TravelRequest` persistence model
- SQLite development database with a configurable `DATABASE_URL`
- Create, list, and detail travel-request endpoints
- Isolated in-memory test database to avoid contaminating development data

## Validation rules

- Destination: 2–120 characters
- Budget: greater than zero, up to 1 billion, two decimal places
- Currency: three-letter code normalized to uppercase
- Duration: 1–365 days
- Travel style: one supported style
- Interests: 1–10 non-empty, normalized, unique values
- Notes: optional, up to 1,000 characters

## Verification

- 4 backend tests pass, covering health, creation, persistence/readback, normalization, and invalid input
- Ruff reports no backend issues
- ESLint reports no errors for the application source
- Next.js production build passes TypeScript checks and prerenders successfully
- Live Uvicorn smoke test returned HTTP 201 for request creation and HTTP 200 for health
- Development database was cleared after the smoke test

Result: users can submit valid travel requirements and the application stores them for later planning checkpoints.


# Checkpoint 2 - User Travel Input Module

Status: Complete

## Delivered

- Responsive trip-request form
- Destination, budget, currency, duration, travel style, interests, and notes inputs
- Browser validation and submission feedback
- Zod server-side validation and normalization
- PostgreSQL `travel_requests` table for deployed persistence
- In-memory repository fallback for local tests and no-database development
- Create, list, and detail travel-request endpoints
- Discord webhook notification after successful request creation

## Validation rules

- Destination: 2-120 characters
- Budget: greater than zero, up to 1 billion
- Currency: three-letter code normalized to uppercase
- Duration: 1-365 days
- Travel style: one supported style
- Interests: 1-10 non-empty, normalized, unique values
- Notes: optional, up to 1,000 characters

## Verification

- Backend tests cover health, creation, normalization, readback, Discord notifier, itinerary generation, and invalid input
- TypeScript checks pass
- Frontend lint passes
- Next.js static production build passes

Result: users can submit travel requirements, persist them, and alert the Discord channel.

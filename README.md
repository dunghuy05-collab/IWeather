# AI Personal Travel Planner

WanderMind is a travel-request and itinerary web app prepared for Render Free Tier.
The app now runs as one Node.js service: a Fastify API serves the Next.js static
frontend and writes trip requests to PostgreSQL.

## Current status

- Next.js App Router frontend exported as static files
- Node.js, TypeScript, Fastify, Zod, and PostgreSQL backend
- Discord incoming webhook notification when a travel request is created
- Discord `/trip` slash command for in-channel trip planning
- Local rule-based itinerary draft endpoint
- Render Blueprint configuration in `render.yaml`
- Docker Compose stack with app plus PostgreSQL
- Backend tests, TypeScript checks, frontend lint, and frontend production build

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Service health check |
| `GET` | `/api/v1/integrations/discord/status` | Check whether Discord webhook is configured |
| `POST` | `/api/v1/integrations/discord/test` | Send a Discord test notification |
| `POST` | `/api/v1/discord/interactions` | Discord slash-command interactions endpoint |
| `POST` | `/api/v1/travel-requests` | Validate, save, and notify Discord |
| `GET` | `/api/v1/travel-requests` | List saved requests |
| `GET` | `/api/v1/travel-requests/:id` | Read one saved request |
| `POST` | `/api/v1/travel-requests/:id/plan` | Generate an itinerary draft |

## Local development

Backend:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`. The backend example env uses
`PORT=4000`, and `frontend/.env.local.example` points to
`http://localhost:4000/api/v1`.

## Docker

```powershell
docker compose up --build
```

The Docker stack runs the combined app at `http://localhost:3000` and PostgreSQL
inside the compose network.

## Discord setup

For one-way notifications, create an incoming webhook in the target Discord
channel, then set:

```text
DISCORD_WEBHOOK_URL=<your Discord webhook URL>
```

For in-channel trip planning, create a Discord application and configure:

```text
DISCORD_PUBLIC_KEY=<application public key>
DISCORD_APPLICATION_ID=<application id>
DISCORD_BOT_TOKEN=<bot token>
DISCORD_GUILD_ID=<optional test server id>
FUEL_PRICE_PER_LITER_VND=24000
```

Set the Interactions Endpoint URL in the Discord Developer Portal to:

```text
https://<your-render-url>/api/v1/discord/interactions
```

Register the slash command from your local machine:

```powershell
cd backend
$env:DISCORD_APPLICATION_ID="..."
$env:DISCORD_BOT_TOKEN="..."
$env:DISCORD_GUILD_ID="..." # optional, faster for testing
npm run register:discord
```

The command is:

```text
/trip from:"Ho Chi Minh City" to:"Da Lat" days:3 people:2 vehicle:motorbike
```

It returns homestay search links, weather, driving time, distance, and fuel cost
estimate in the Discord channel. The app never exposes Discord secrets through
API responses.

## Render deployment

The repository includes `render.yaml` for a Blueprint deploy:

- one free web service named `wandermind`
- one free PostgreSQL database named `wandermind-db`
- health check path: `/api/v1/health`
- `DISCORD_WEBHOOK_URL` marked `sync: false` so the secret is entered in Render
- `DISCORD_PUBLIC_KEY` marked `sync: false` for slash-command verification

Render Free Tier is suitable for a demo. Its free web service can spin down after
idle time and cold start on the next request. Free PostgreSQL has short retention
and no production-grade backup guarantees, so upgrade before real users or paid
travel data.

## Verification

```powershell
npm run typecheck --prefix backend
npm test --prefix backend
npm run build --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
docker compose config
```

Real secrets must stay in local `.env` files or Render environment variables.

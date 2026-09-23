# Render and Discord Architecture

## Decision

Use a single Node.js web service on Render Free Tier:

- Fastify serves `/api/v1/*`
- Fastify serves `frontend/out` for the static Next.js UI
- PostgreSQL stores travel requests
- Discord incoming webhook sends outbound notifications
- Discord slash commands call `/api/v1/discord/interactions`

## Why slash commands instead of reading every message

Render Free web services can sleep after idle time. A gateway bot needs a stable
long-running connection, so a sleeping free service is a poor fit. Reading normal
message text also requires Discord's privileged Message Content Intent. Slash
commands are HTTP interactions, which fit the existing Render web service.

## Slash command

`/trip` accepts:

- `from`: starting city or place
- `to`: destination city or place
- `days`: 1-7 forecast days
- `people`: number of travelers
- `vehicle`: `car` or `motorbike`
- `fuel_consumption`: optional L/100km override

The response includes:

- homestay search links
- weather from Open-Meteo
- distance and travel time from OSRM
- fuel estimate using `FUEL_PRICE_PER_LITER_VND`

## Runtime environment

- `PORT`: supplied by Render in production
- `DATABASE_URL`: supplied from the Render PostgreSQL database
- `DISCORD_WEBHOOK_URL`: secret entered manually in Render
- `DISCORD_PUBLIC_KEY`: Discord application public key for request verification
- `NODE_ENV=production`

## Render Free Tier notes

- Free web services are demo-friendly, not production infrastructure
- Free PostgreSQL is suitable for evaluation only
- The local filesystem should be treated as ephemeral
- Upgrade the web service and database before handling real customer data

References:

- Render Free Tier: https://render.com/docs/free
- Render Blueprint spec: https://render.com/docs/blueprint-spec
- Render web services: https://render.com/docs/web-services
- Discord webhooks: https://docs.discord.com/resources/webhook
- Discord slash commands: https://docs.discord.com/developers/docs/interactions/slash-commands
- Open-Meteo forecast API: https://open-meteo.com/en/docs

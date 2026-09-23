# Render and Discord Architecture

## Decision

Use a single Node.js web service on Render Free Tier:

- Fastify serves `/api/v1/*`
- Fastify serves `frontend/out` for the static Next.js UI
- PostgreSQL stores travel requests
- Discord incoming webhook sends outbound notifications

## Why not a Discord Gateway bot on Render Free Tier

Render Free web services can sleep after idle time. A gateway bot needs a stable
long-running connection, so a sleeping free service is a poor fit. A webhook is
reliable for this checkpoint because it runs during the same HTTP request that
creates the travel request.

## Runtime environment

- `PORT`: supplied by Render in production
- `DATABASE_URL`: supplied from the Render PostgreSQL database
- `DISCORD_WEBHOOK_URL`: secret entered manually in Render
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

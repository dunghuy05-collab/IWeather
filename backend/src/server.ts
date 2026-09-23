import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyRequest } from "fastify";

import { notifyDiscord } from "./discord.js";
import {
  handleDiscordInteraction,
  verifyDiscordRequest,
} from "./discordInteractions.js";
import { createTravelPlan } from "./planner.js";
import {
  createRepository,
  type TravelRequestRepository,
} from "./repository.js";
import { travelRequestSchema } from "./schema.js";

type AppOptions = {
  repository?: TravelRequestRepository;
  discordNotifier?: typeof notifyDiscord;
  serveFrontend?: boolean;
  skipDiscordSignatureVerification?: boolean;
};

type RawBodyRequest = FastifyRequest & {
  rawBody?: string;
};

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const repository = options.repository ?? createRepository();
  const discordNotifier = options.discordNotifier ?? notifyDiscord;

  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const rawBody = typeof body === "string" ? body : body.toString();
    (request as RawBodyRequest).rawBody = rawBody;
    try {
      done(null, rawBody ? JSON.parse(rawBody) : {});
    } catch (error) {
      done(error as Error);
    }
  });

  await repository.initialize();
  app.addHook("onClose", async () => repository.close());

  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());
  await app.register(cors, { origin: allowedOrigins });

  app.get("/api/v1/health", async () => ({ status: "ok", runtime: "node" }));

  app.get("/api/v1/integrations/discord/status", async () => ({
    incomingWebhookConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
    slashCommandConfigured: Boolean(process.env.DISCORD_PUBLIC_KEY),
    mode: "incoming-webhook",
  }));

  app.post("/api/v1/discord/interactions", async (request, reply) => {
    const rawBody = (request as RawBodyRequest).rawBody ?? "";
    const signature = request.headers["x-signature-ed25519"];
    const timestamp = request.headers["x-signature-timestamp"];
    const verified =
      options.skipDiscordSignatureVerification ||
      (typeof signature === "string" &&
        typeof timestamp === "string" &&
        verifyDiscordRequest(rawBody, signature, timestamp));

    if (!verified) {
      return reply.code(401).send({ detail: "Invalid Discord request signature" });
    }

    const response = await handleDiscordInteraction({
      interaction: request.body as Parameters<typeof handleDiscordInteraction>[0]["interaction"],
      logger: request.log,
    });
    return reply.send(response);
  });

  app.post("/api/v1/integrations/discord/test", async (request, reply) => {
    const probe = {
      id: "discord-webhook-test",
      destination: "Webhook smoke test",
      budget: 1,
      currency: "USD",
      duration_days: 1,
      travel_style: "comfort" as const,
      interests: ["integration"],
      notes: "WanderMind Discord integration is configured.",
      created_at: new Date().toISOString(),
    };

    try {
      const delivered = await discordNotifier(probe);
      return reply.send({ configured: delivered, delivered });
    } catch (error) {
      request.log.warn({ error }, "Discord test notification failed");
      return reply.code(502).send({ configured: true, delivered: false });
    }
  });

  app.post("/api/v1/travel-requests", async (request, reply) => {
    const parsed = travelRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({
        detail: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const created = await repository.create(parsed.data);
    try {
      await discordNotifier(created);
    } catch (error) {
      request.log.warn({ error }, "Discord notification failed");
    }
    return reply.code(201).send(created);
  });

  app.get("/api/v1/travel-requests", () => repository.list());

  app.get<{ Params: { id: string } }>("/api/v1/travel-requests/:id", async (request, reply) => {
    const record = await repository.findById(request.params.id);
    return record ?? reply.code(404).send({ detail: "Travel request not found" });
  });

  app.post<{ Params: { id: string } }>("/api/v1/travel-requests/:id/plan", async (request, reply) => {
    const record = await repository.findById(request.params.id);
    if (!record) {
      return reply.code(404).send({ detail: "Travel request not found" });
    }
    return createTravelPlan(record);
  });

  const frontendRoot = join(process.cwd(), "frontend", "out");
  if (options.serveFrontend !== false && existsSync(frontendRoot)) {
    await app.register(fastifyStatic, { root: frontendRoot });
  }

  return app;
}

async function start() {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ host: "0.0.0.0", port });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

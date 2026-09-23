import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

import { notifyDiscord } from "./discord.js";
import {
  createRepository,
  type TravelRequestRepository,
} from "./repository.js";
import { travelRequestSchema } from "./schema.js";

type AppOptions = {
  repository?: TravelRequestRepository;
  discordNotifier?: typeof notifyDiscord;
  serveFrontend?: boolean;
};

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const repository = options.repository ?? createRepository();
  const discordNotifier = options.discordNotifier ?? notifyDiscord;

  await repository.initialize();
  app.addHook("onClose", () => repository.close());

  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());
  await app.register(cors, { origin: allowedOrigins });

  app.get("/api/v1/health", async () => ({ status: "ok", runtime: "node" }));

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


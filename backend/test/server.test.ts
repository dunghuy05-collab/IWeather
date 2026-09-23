import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { MemoryTravelRequestRepository } from "../src/repository.js";
import { buildApp } from "../src/server.js";

let app: FastifyInstance;
const notifications: string[] = [];

before(async () => {
  process.env.NODE_ENV = "test";
  delete process.env.DISCORD_WEBHOOK_URL;
  app = await buildApp({
    repository: new MemoryTravelRequestRepository(),
    discordNotifier: async (request) => {
      notifications.push(request.id);
      return true;
    },
    serveFrontend: false,
    skipDiscordSignatureVerification: true,
  });
});

after(async () => app.close());

test("health endpoint reports Node runtime", async () => {
  const response = await app.inject({ method: "GET", url: "/api/v1/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok", runtime: "node" });
});

test("creates, normalizes, and reads a travel request", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/travel-requests",
    payload: {
      destination: "Da Nang, Vietnam",
      budget: 1200,
      currency: "usd",
      duration_days: 5,
      travel_style: "comfort",
      interests: ["Food", "Beach", "food"],
      notes: "Relaxed pace",
    },
  });

  assert.equal(response.statusCode, 201);
  const created = response.json();
  assert.equal(created.currency, "USD");
  assert.deepEqual(created.interests, ["food", "beach"]);

  const fetched = await app.inject({
    method: "GET",
    url: `/api/v1/travel-requests/${created.id}`,
  });
  assert.equal(fetched.statusCode, 200);
  assert.equal(fetched.json().id, created.id);
  assert.ok(notifications.includes(created.id));
});

test("reports Discord integration status without exposing secrets", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/integrations/discord/status",
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    incomingWebhookConfigured: false,
    slashCommandConfigured: false,
    mode: "incoming-webhook",
  });
});

test("handles Discord ping interactions", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/discord/interactions",
    payload: { type: 1 },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { type: 1 });
});

test("generates a local itinerary draft", async () => {
  const createdResponse = await app.inject({
    method: "POST",
    url: "/api/v1/travel-requests",
    payload: {
      destination: "Bangkok, Thailand",
      budget: 900,
      currency: "usd",
      duration_days: 3,
      travel_style: "culture",
      interests: ["Food", "Culture"],
    },
  });
  const created = createdResponse.json();

  const planResponse = await app.inject({
    method: "POST",
    url: `/api/v1/travel-requests/${created.id}/plan`,
  });

  assert.equal(planResponse.statusCode, 200);
  assert.equal(planResponse.json().request_id, created.id);
  assert.match(planResponse.json().content, /Trip overview/);
});

test("rejects invalid input", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/travel-requests",
    payload: { destination: "X", budget: 0, interests: [] },
  });
  assert.equal(response.statusCode, 422);
});

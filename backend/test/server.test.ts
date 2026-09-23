import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { MemoryTravelRequestRepository } from "../src/repository.js";
import { buildApp } from "../src/server.js";

let app: FastifyInstance;

before(async () => {
  process.env.NODE_ENV = "test";
  app = await buildApp({
    repository: new MemoryTravelRequestRepository(),
    discordNotifier: async () => false,
    serveFrontend: false,
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
});

test("rejects invalid input", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/travel-requests",
    payload: { destination: "X", budget: 0, interests: [] },
  });
  assert.equal(response.statusCode, 422);
});


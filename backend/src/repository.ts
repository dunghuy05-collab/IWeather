import { randomUUID } from "node:crypto";

import pg from "pg";

import type { TravelRequest, TravelRequestInput } from "./schema.js";

const { Pool } = pg;

export interface TravelRequestRepository {
  initialize(): Promise<void>;
  create(input: TravelRequestInput): Promise<TravelRequest>;
  list(): Promise<TravelRequest[]>;
  findById(id: string): Promise<TravelRequest | null>;
  close(): Promise<void>;
}

export class MemoryTravelRequestRepository implements TravelRequestRepository {
  private readonly records = new Map<string, TravelRequest>();

  async initialize(): Promise<void> {}

  async create(input: TravelRequestInput): Promise<TravelRequest> {
    const record = {
      ...input,
      id: randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async list(): Promise<TravelRequest[]> {
    return [...this.records.values()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }

  async findById(id: string): Promise<TravelRequest | null> {
    return this.records.get(id) ?? null;
  }

  async close(): Promise<void> {}
}

export class PostgresTravelRequestRepository implements TravelRequestRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 3,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS travel_requests (
        id UUID PRIMARY KEY,
        destination VARCHAR(120) NOT NULL,
        budget NUMERIC(12, 2) NOT NULL CHECK (budget > 0),
        currency CHAR(3) NOT NULL,
        duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
        travel_style VARCHAR(40) NOT NULL,
        interests JSONB NOT NULL,
        notes VARCHAR(1000),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS travel_requests_created_at_idx
        ON travel_requests (created_at DESC);
    `);
  }

  async create(input: TravelRequestInput): Promise<TravelRequest> {
    const id = randomUUID();
    const result = await this.pool.query<TravelRequest>(
      `INSERT INTO travel_requests
        (id, destination, budget, currency, duration_days, travel_style, interests, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING id, destination, budget::float8 AS budget, currency,
         duration_days, travel_style, interests, notes, created_at::text`,
      [
        id,
        input.destination,
        input.budget,
        input.currency,
        input.duration_days,
        input.travel_style,
        JSON.stringify(input.interests),
        input.notes,
      ],
    );
    return result.rows[0]!;
  }

  async list(): Promise<TravelRequest[]> {
    const result = await this.pool.query<TravelRequest>(`
      SELECT id, destination, budget::float8 AS budget, currency,
        duration_days, travel_style, interests, notes, created_at::text
      FROM travel_requests ORDER BY created_at DESC
    `);
    return result.rows;
  }

  async findById(id: string): Promise<TravelRequest | null> {
    const result = await this.pool.query<TravelRequest>(
      `SELECT id, destination, budget::float8 AS budget, currency,
        duration_days, travel_style, interests, notes, created_at::text
       FROM travel_requests WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createRepository(): TravelRequestRepository {
  const databaseUrl = process.env.DATABASE_URL;
  return databaseUrl
    ? new PostgresTravelRequestRepository(databaseUrl)
    : new MemoryTravelRequestRepository();
}

function shouldUseSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    return sslMode === "require" || url.hostname.endsWith(".render.com");
  } catch {
    return false;
  }
}

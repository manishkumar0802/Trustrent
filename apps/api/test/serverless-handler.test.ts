import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";

/* ------------------------------------------------------------------ */
/*  The serverless handler relies on the same Fastify instance that    */
/*  buildServer() creates. We test two things:                         */
/*   1. All routes respond correctly via app.inject() (no TCP socket)  */
/*   2. The handler export itself works end-to-end                     */
/* ------------------------------------------------------------------ */

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── inject()-based route verification (no listen) ──────────────────

describe("serverless: routes via inject()", () => {
  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("trustrent-api");
    expect(body.network).toBe("testnet");
  });

  it("GET /api/agreements returns mock data", async () => {
    const res = await app.inject({ method: "GET", url: "/api/agreements" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.source).toBe("mock");
  });

  it("GET /api/agreements/:id returns a single agreement", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/agreements/AG-1042",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.id).toBe("AG-1042");
    expect(body.data.state).toBe("ACTIVE");
  });

  it("GET /api/agreements/:id returns 404 for unknown id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/agreements/AG-9999",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_found");
  });
});



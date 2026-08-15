import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("trustrent-api", () => {
  it("reports health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().network).toBe("testnet");
  });

  it("lists agreements from the mock repository", async () => {
    const res = await app.inject({ method: "GET", url: "/api/agreements" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.source).toBe("mock");
  });

  it("returns 404 for unknown agreements", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/agreements/AG-0000",
    });
    expect(res.statusCode).toBe(404);
  });
});

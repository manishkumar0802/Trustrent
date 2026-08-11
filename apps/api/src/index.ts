import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { loadConfig } from "./config";
import { agreementRoutes } from "./modules/agreements/routes";
import { MockAgreementRepository } from "./modules/agreements/service";

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    ok: true,
    service: "trustrent-api",
    network: config.soroban.network,
    storageProvider: config.storageProvider,
    phase: 1,
  }));

  const repo = new MockAgreementRepository(app.log);
  await app.register((instance, _opts, done) => {
    void agreementRoutes(instance, repo);
    done();
  });

  return app;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const app = await buildServer();
  const { port } = loadConfig();
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

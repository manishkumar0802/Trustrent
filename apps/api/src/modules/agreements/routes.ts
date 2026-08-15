import type { FastifyInstance } from "fastify";
import type { AgreementRepository } from "./service";

export async function agreementRoutes(
  app: FastifyInstance,
  repo: AgreementRepository,
): Promise<void> {
  app.get("/api/agreements", async (_req, reply) => {
    const agreements = await repo.list();
    return reply.send({ data: agreements, meta: { source: "mock", phase: 1 } });
  });

  app.get<{ Params: { id: string } }>("/api/agreements/:id", async (req, reply) => {
    const agreement = await repo.getById(req.params.id);
    if (!agreement) {
      return reply.code(404).send({ error: "not_found", message: "Agreement not found" });
    }
    return reply.send({
      data: agreement,
      meta: { source: "mock", phase: 1 },
    });
  });
}

import { FastifyTypeBox } from "../types/fastify.js";

export async function connectionRoutes(app: FastifyTypeBox) {
  app.get(
    "/connection",
    {
      schema: {},
    },
    async (request, reply) => {
      return reply.status(200).send({
        message: "Hello, world!",
      });
    },
  );
}

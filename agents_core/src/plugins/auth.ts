import { FastifyRequest, FastifyReply } from "fastify";
import buildGetJwks from "get-jwks";
import fastifyJwt from "@fastify/jwt";
import dotenv from "dotenv";
dotenv.config();
import { getAuth } from "@clerk/fastify";
import fp from "fastify-plugin";

export const registerAuth = fp(async (fastify) => {
  const getJwks = buildGetJwks();

  fastify.register(fastifyJwt, {
    decode: { complete: true },
    secret: (request: FastifyRequest, token: any, done: any) => {
      const {
        header: { kid, alg },
        payload: { iss },
      } = token;
      getJwks
        .getPublicKey({
          kid,
          alg,
          domain: iss,
        })
        .then((key) => {
          done(null, key);
        });
    },
  });

  fastify.decorate(
    "verifyClerk",
    async function verifyClerk(request: FastifyRequest, reply: FastifyReply) {
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      return;
    },
  );

  fastify.decorate(
    "verifyExternalJwt",
    async function verifyExternalJwt(
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      try {
        const decoded = await request.jwtVerify();
        return decoded;
      } catch (err) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
});

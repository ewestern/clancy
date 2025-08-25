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

  fastify.decorate(
    "requireScopes",
    function requireScopes(opts: { anyOf?: string[]; allOf?: string[] }) {
      const resourceServer =
        process.env.COGNITO_RESOURCE_SERVER_IDENTIFIER ||
        "https://clancyai.com";
      const prefix = (scopes: string[] | undefined): string[] =>
        (scopes || []).map((s) => `${resourceServer}/${s}`);

      const requiredAny = new Set(prefix(opts.anyOf));
      const requiredAll = new Set(prefix(opts.allOf));

      return async function preHandler(
        request: FastifyRequest,
        reply: FastifyReply,
      ) {
        try {
          const decoded = await request.jwtVerify<{ scope?: string }>();
          const tokenScopes = new Set(
            (decoded.scope || "")
              .split(" ")
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          );

          const allOk = Array.from(requiredAll).every((s) =>
            tokenScopes.has(s),
          );
          const anyOk =
            requiredAny.size === 0
              ? true
              : Array.from(requiredAny).some((s) => tokenScopes.has(s));

          if (!allOk || !anyOk) {
            return reply.status(403).send({ error: "Forbidden" });
          }
        } catch (_err) {
          return reply.status(401).send({ error: "Unauthorized" });
        }
      };
    },
  );
});

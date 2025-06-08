import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import buildGetJwks from "get-jwks" ;
import fastifyJwt, { FastifyJWTOptions } from '@fastify/jwt'
import dotenv from "dotenv";
dotenv.config();
import { getAuth } from "@clerk/fastify";


export const registerAuth: FastifyPluginAsync = async (fastify) => {
  const getJwks = buildGetJwks();

  fastify.register(fastifyJwt, {
    decode: {complete: true},
    secret: (request: FastifyRequest, token: any, done: any) => {
      const {
        header: { kid, alg },
        payload: { iss },
      } = token
      getJwks.getPublicKey({
        kid,
        alg,
        domain: iss,
      }).then((key) => {
        done(null, key);
      });
    },
  });

  fastify.decorate(
    'verifyClerk',
    async function verifyClerk(request: FastifyRequest, reply: FastifyReply) {
      const { userId } = getAuth(request)
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    }
  );

  fastify.decorate(
    'verifyExternalJwt',
    async function verifyExternalJwt(request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
      }
    }
  );

};


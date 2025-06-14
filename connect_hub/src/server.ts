import { createApp } from "./app.js";

async function start() {
  try {
    const app = await createApp();

    const host = "0.0.0.0";
    const port = 3000;

    await app.listen({ port, host });

    app.log.info(`ConnectHub server running on http://${host}:${port}`);
    app.log.info(
      `API Documentation available at http://${host}:${port}/reference`,
    );
    app.log.info(
      `OpenAPI Spec available at http://${host}:${port}/openapi.json`,
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

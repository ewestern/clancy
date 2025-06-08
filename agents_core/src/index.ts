import { createApp } from "./app.js";

async function start() {
  try {
    const app = await createApp();

    // Get port from environment
    const port = parseInt(process.env.PORT || "3000", 10);
    const nodeEnv = process.env.NODE_ENV || "development";

    // Start the server
    await app.listen({
      port,
      host: "0.0.0.0",
    });

    app.log.info(`Agent-Core service started on port ${port}`);
    app.log.info(`Environment: ${nodeEnv}`);
    app.log.info(
      `API Reference available at http://localhost:${port}/reference`,
    );
    app.log.info(
      `OpenAPI JSON available at http://localhost:${port}/openapi.json`,
    );

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down gracefully`);

      try {
        await app.close();
        app.log.info("Application closed successfully");
        process.exit(0);
      } catch (error) {
        app.log.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

start();

export interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  logLevel: string;
  connectIqUrl: string;
  authServiceUrl: string;
  redisUrl: string;
  openaiApiKey: string;
}

export function createConfig(): Config {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    connectIqUrl: process.env.CONNECT_IQ_URL!,
    authServiceUrl: process.env.AUTH_SERVICE_URL!,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    openaiApiKey: process.env.OPENAI_API_KEY!,
  };
} 
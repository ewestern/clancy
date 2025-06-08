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

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  databaseUrl: process.env.DATABASE_URL || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production');
    }
    return 'postgresql://localhost:5432/agents_core';
  })(),
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'development-secret';
  })(),
  connectIqUrl: process.env.CONNECT_IQ_URL || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CONNECT_IQ_URL is required in production');
    }
    return 'http://localhost:3001';
  })(),
  authServiceUrl: process.env.AUTH_SERVICE_URL || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SERVICE_URL is required in production');
    }
    return 'http://localhost:3002';
  })(),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  openaiApiKey: process.env.OPENAI_API_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OPENAI_API_KEY is required in production');
    }
    return 'sk-development-key';
  })(),
}; 
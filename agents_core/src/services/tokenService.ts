import type { Config } from '../config.js';

export class TokenService {
  constructor(private config: Config) {}

  async generateToken(payload: Record<string, any>): Promise<string> {
    // TODO: Implement JWT token generation
    throw new Error('Not implemented');
  }

  async verifyToken(token: string): Promise<Record<string, any> | null> {
    // TODO: Implement JWT token verification
    throw new Error('Not implemented');
  }
} 
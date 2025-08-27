import axios from "axios";

type CachedToken = {
  accessToken: string;
  expiresAtEpochMs: number;
};

const tokenCache: Map<string, CachedToken> = new Map();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable not set`);
  }
  return value;
}

function buildCacheKey(scopes: string[], orgId: string): string {
  return `${orgId}::${[...scopes].sort().join(" ")}`;
}

function toResourceServerScopes(scopes: string[]): string[] {
  const resourceServer = getRequiredEnv("COGNITO_RESOURCE_SERVER_IDENTIFIER");
  return scopes.map((s) => `${resourceServer}/${s}`);
}

export async function getCognitoM2MToken(params: {
  scopes: string[];
  orgId: string;
}): Promise<string> {
  const { scopes, orgId } = params;

  const cacheKey = buildCacheKey(scopes, orgId);
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAtEpochMs - 30000 > now) {
    return cached.accessToken;
  }

  const tokenUrl = getRequiredEnv("COGNITO_TOKEN_URL");
  const clientId = getRequiredEnv("COGNITO_CLIENT_ID");
  const clientSecret = getRequiredEnv("COGNITO_CLIENT_SECRET");

  const scopeParam = toResourceServerScopes(scopes).join(" ");
  const metadata = encodeURIComponent(JSON.stringify({ org_id: orgId }));

  const body = `grant_type=client_credentials&scope=${encodeURIComponent(
    scopeParam,
  )}&aws_client_metadata=${metadata}`;

  const response = await axios.post(tokenUrl, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    auth: {
      username: clientId,
      password: clientSecret,
    },
  });

  const accessToken: string = response.data.access_token;
  const expiresInSec: number = response.data.expires_in ?? 3600;
  const expiresAtEpochMs = now + expiresInSec * 1000;

  tokenCache.set(cacheKey, { accessToken, expiresAtEpochMs });
  return accessToken;
}

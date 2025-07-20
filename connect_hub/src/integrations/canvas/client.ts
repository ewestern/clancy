import { ExecutionContext } from "../../providers/types.js";
import { Database } from "../../plugins/database.js";

async function canvasFetch<T>(
  ctx: ExecutionContext,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!ctx.tokenPayload || !ctx.tokenPayload.access_token) {
    throw new Error("Canvas access token is missing.");
  }
  const accessToken = ctx.tokenPayload.access_token as string;

  if (!ctx.externalAccountId) {
    throw new Error(
      "Canvas external account ID is not set in execution context.",
    );
  }

  const connection = await ctx.db.query.connections.findFirst({
    where: (connections, { eq }) => eq(connections.id, ctx.externalAccountId!),
  });

  if (!connection || !connection.externalAccountMetadata) {
    throw new Error("Canvas connection details not found.");
  }

  const canvasDomain = (
    connection.externalAccountMetadata as { domain: string }
  ).domain;
  if (!canvasDomain) {
    throw new Error("Canvas domain not found in connection metadata.");
  }

  const baseUrl = `https://${canvasDomain}/api/v1`;
  const url = `${baseUrl}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") ?? "60";
    throw new Error(`Rate limited. Please retry after ${retryAfter} seconds.`);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Canvas API request failed with status ${res.status}: ${errorBody}`,
    );
  }

  if (res.status === 204 || res.headers.get("Content-Length") === "0") {
    return null as T;
  }

  return res.json() as T;
}

export { canvasFetch };

import { registry } from "../integrations.js";
// eslint-disable-next-line import/no-extraneous-dependencies
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Zod } from "@sinclair/typemap";

/**
 * Build an MCP `Server` that exposes one tool per provider-capability pair.
 * Only metadata is wired up for now — the actual execution handler returns a
 * placeholder. This is enough for clients to discover the RPC catalogue via
 * `GET /mcp`.
 */
export function createConnectHubMcpServer() {
  //const server = new McpServer({
  //  name: "clancy.connecthub",
  //  version: "0.1.0",
  //});
  //// Iterate over providers and capabilities to register tools.
  //for (const provider of registry.getCapabilities()) {
  //  for (const cap of provider.capabilities) {
  //    // We cast TypeBox schemas to `any` as MCP SDK expects Zod schemas.
  //    // This will validate at runtime once we migrate schemas.
  //    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //    // @ts-ignore – until schemas are migrated to Zod
  //    server.registerTool(
  //      `${provider.id}.${cap.id}`,
  //      {
  //        title: cap.displayName,
  //        description: cap.description,
  //        inputSchema: Zod(cap.paramsSchema),
  //      },
  //      async () => {
  //        return {
  //          content: [
  //            {
  //              type: "text",
  //              text: "Execution handler not yet implemented for ConnectHub",
  //            },
  //          ],
  //          isError: true,
  //        };
  //      },
  //    );
  //  }
  //}
  //return server.server;
}

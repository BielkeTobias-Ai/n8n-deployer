import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const DEPLOY_URL = process.env.DEPLOY_URL;
const DEPLOYER_TOKEN = process.env.DEPLOYER_TOKEN;

if (!DEPLOY_URL || !DEPLOYER_TOKEN) {
  console.error("Missing DEPLOY_URL or DEPLOYER_TOKEN env vars");
  process.exit(1);
}

const server = new Server(
  { name: "n8n-deployer-mcp", version: "1.0.0" },
  { capabilities: { tools: { list: true, call: true } } }
);

// Lista verktyg
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deploy_workflow",
        description: "Create or update an n8n workflow via the deployer HTTP service",
        inputSchema: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["create", "update"] },
            workflowId: { type: "string" },
            workflow: { type: "object" }
          },
          required: ["mode", "workflow"]
        }
      }
    ]
  };
});

// Kör verktyg
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name !== "deploy_workflow") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const Schema = z.object({
    mode: z.enum(["create", "update"]),
    workflowId: z.string().optional(),
    workflow: z.any()
  });

  const parsed = Schema.parse(args);

  const r = await fetch(DEPLOY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-deployer-token": DEPLOYER_TOKEN
    },
    body: JSON.stringify(parsed)
  });

  const text = await r.text();

  return {
    content: [{ type: "text", text }]
  };
});

await server.connect(new StdioServerTransport());

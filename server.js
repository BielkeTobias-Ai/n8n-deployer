import express from "express";
import cors from "cors";

const app = express();

app.use(cors()); // <-- gör att Hoppscotch/Browser får posta
app.options("*", cors()); // <-- svarar på preflight

app.use(express.json({ limit: "5mb" }));

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const DEPLOYER_TOKEN = process.env.DEPLOYER_TOKEN;

function mustAuth(req) {
  const token = req.headers["x-deployer-token"];
  return !DEPLOYER_TOKEN || token === DEPLOYER_TOKEN;
}

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/deploy", async (req, res) => {
  if (!mustAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  const { mode, workflowId, workflow } = req.body;

  if (!workflow || !workflow.name || !workflow.nodes || !workflow.connections) {
    return res.status(400).json({ error: "workflow must include name, nodes, connections" });
  }

  const url =
    mode === "update"
      ? `${N8N_BASE_URL}/api/v1/workflows/${encodeURIComponent(workflowId)}`
      : `${N8N_BASE_URL}/api/v1/workflows`;

  const method = mode === "update" ? "PUT" : "POST";

  const r = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": N8N_API_KEY,
    },
    body: JSON.stringify(workflow),
  });

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return res.status(r.status).json(data);
});

app.listen(process.env.PORT || 3000, () => console.log("deployer up"));

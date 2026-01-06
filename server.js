import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" }));

const DEPLOYER_TOKEN = process.env.DEPLOYER_TOKEN;
const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!DEPLOYER_TOKEN || !N8N_BASE_URL || !N8N_API_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

app.get("/", (_, res) => res.send("ok"));

app.post("/deploy", async (req, res) => {
  const token = req.header("x-deployer-token");
  if (token !== DEPLOYER_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { mode, workflowId, workflow } = req.body;
  if (!mode || !workflow) {
    return res.status(400).json({ error: "Missing mode or workflow" });
  }

  const url =
    mode === "create"
      ? `${N8N_BASE_URL}/api/v1/workflows`
      : `${N8N_BASE_URL}/api/v1/workflows/${workflowId}`;

  const method = mode === "create" ? "POST" : "PATCH";

  const r = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": N8N_API_KEY
    },
    body: JSON.stringify(workflow)
  });

  const text = await r.text();
  res.status(r.status).send(text);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Deployer listening"));

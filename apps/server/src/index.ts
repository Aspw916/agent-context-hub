import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { initDb, repo, getOverview, getAgentAssetMatrix, getSkillDistribution, searchAll, sse } from "@agent-hub/core";
import { runFullScan } from "@agent-hub/scanner";
import { defaultDataDir, nowISO, generateId } from "@agent-hub/shared";
import type { PaginatedResponse } from "@agent-hub/shared";

const app = new Hono();
const PORT = parseInt(process.env.PORT ?? "3737");

// ─── CORS ────────────────────────────────────────────────
app.use("/*", cors());

// ─── Static file serve for web app ───────────────────────
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

// ─── Init ────────────────────────────────────────────────
const DATA_DIR = process.env.AGENT_HUB_HOME ?? defaultDataDir();
initDb(DATA_DIR);

// ─── Health ──────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", dataDir: DATA_DIR }));

// ─── Overview ────────────────────────────────────────────
app.get("/api/overview", (c) => {
  const overview = getOverview(nowISO());
  const matrix = getAgentAssetMatrix();
  const skillDistribution = getSkillDistribution();
  return c.json({ ...overview, agentMatrix: matrix, skillDistribution });
});

// ─── Agents ──────────────────────────────────────────────
app.get("/api/agents", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const data = repo.listAgents(limit, offset);
  const total = repo.countAgents();
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total } satisfies PaginatedResponse<unknown>);
});

app.get("/api/agents/:id", (c) => {
  const agent = repo.getAgent(c.req.param("id"));
  return agent ? c.json(agent) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/agents/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateAgent(c.req.param("id"), body);
  return ok ? c.json(repo.getAgent(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

app.post("/api/agents", async (c) => {
  const body = await c.req.json();
  const agent = {
    id: generateId("agent"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    configPaths: [] as string[],
    skillRoots: [] as string[],
    mcpConfigPaths: [] as string[],
    expertRoots: [] as string[],
    notes: null,
    version: null,
    vendor: "manual",
    status: "detected",
    ...body,
  };
  repo.upsertAgent(agent);
  return c.json(agent, 201);
});

// ─── Skills ──────────────────────────────────────────────
app.get("/api/skills", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const status = c.req.query("status");
  const data = repo.listSkills(limit, offset, status ? { status } : undefined);
  const total = repo.countSkills();
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.get("/api/skills/:id", (c) => {
  const skill = repo.getSkill(c.req.param("id"));
  return skill ? c.json(skill) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/skills/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateSkill(c.req.param("id"), body);
  return ok ? c.json(repo.getSkill(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

// ─── MCP Servers ─────────────────────────────────────────
app.get("/api/mcp-servers", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const data = repo.listMcpServers(limit, offset);
  const total = repo.countMcpServers();
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.get("/api/mcp-servers/:id", (c) => {
  const mcp = repo.getMcpServer(c.req.param("id"));
  return mcp ? c.json(mcp) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/mcp-servers/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateMcpServer(c.req.param("id"), body);
  return ok ? c.json(repo.getMcpServer(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

app.post("/api/mcp-servers/:id/health-check", async (c) => {
  const mcp = repo.getMcpServer(c.req.param("id"));
  if (!mcp) return c.json({ error: "Not found" }, 404);

  // Run health check asynchronously, push results via SSE
  (async () => {
    try {
      const start = Date.now();
      if (mcp.transport === "stdio" && mcp.command) {
        // stdio: spawn and check if process stays alive briefly
        const { spawn } = await import("node:child_process");
        const child = spawn(mcp.command, mcp.args ?? [], {
          stdio: "pipe",
          shell: true,
        });

        let settled = false;
        const finish = (status: "healthy" | "unhealthy", err?: string) => {
          if (settled) return;
          settled = true;
          child.kill();
          const latencyMs = Date.now() - start;
          repo.updateMcpHealthStatus(mcp.id, status);
          if (status === "healthy") {
            sse.healthResult(mcp.id, "healthy", latencyMs);
          } else {
            sse.healthError(mcp.id, err ?? "Unknown error");
          }
        };

        child.on("error", (err) => finish("unhealthy", err.message));
        child.on("exit", (code) => {
          // Process exited before our short wait — if exit code 0, it's ok
          if (code === 0) finish("healthy");
          else finish("unhealthy", `Exited with code ${code}`);
        });

        // Wait 2 seconds — if process is still alive, consider it healthy
        setTimeout(() => finish("healthy"), 2000);
      } else if ((mcp.transport === "sse" || mcp.transport === "http") && (mcp.url || mcp.command)) {
        // sse/http: fetch the URL
        const targetUrl = mcp.url || mcp.command!;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(targetUrl, { signal: controller.signal });
          clearTimeout(timeout);
          const latencyMs = Date.now() - start;
          const status = res.ok ? "healthy" : "unhealthy";
          repo.updateMcpHealthStatus(mcp.id, status);
          if (status === "healthy") {
            sse.healthResult(mcp.id, "healthy", latencyMs);
          } else {
            sse.healthError(mcp.id, `HTTP ${res.status}`);
          }
        } catch (err: any) {
          clearTimeout(timeout);
          repo.updateMcpHealthStatus(mcp.id, "unhealthy");
          sse.healthError(mcp.id, err.message ?? "Connection failed");
        }
      } else {
        repo.updateMcpHealthStatus(mcp.id, "unknown");
        sse.healthResult(mcp.id, "unknown", 0);
      }
    } catch (err: any) {
      repo.updateMcpHealthStatus(mcp.id, "unhealthy");
      sse.healthError(mcp.id, err.message ?? "Unknown error");
    }
  })();

  return c.json({ status: "checking", id: mcp.id });
});

// ─── Experts ─────────────────────────────────────────────
app.get("/api/experts", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const data = repo.listExperts(limit, offset);
  const total = repo.countExperts();
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.get("/api/experts/:id", (c) => {
  const expert = repo.getExpert(c.req.param("id"));
  return expert ? c.json(expert) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/experts/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateExpert(c.req.param("id"), body);
  return ok ? c.json(repo.getExpert(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

// ─── Projects ────────────────────────────────────────────
app.get("/api/projects", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const data = repo.listProjects(limit, offset);
  const total = repo.countProjects();
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.post("/api/projects", async (c) => {
  const body = await c.req.json();
  const project = {
    id: generateId("proj"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    rootPath: null as string | null,
    description: null as string | null,
    techStack: [] as string[],
    agents: [] as string[],
    activeContext: null as string | null,
    status: "active",
    ...body,
  };
  repo.upsertProject(project);
  return c.json(project, 201);
});

app.get("/api/projects/:id", (c) => {
  const project = repo.getProject(c.req.param("id"));
  return project ? c.json(project) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/projects/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateProject(c.req.param("id"), body);
  return ok ? c.json(repo.getProject(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

// ─── Context ─────────────────────────────────────────────
app.get("/api/context", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const projectId = c.req.query("project_id");
  const data = repo.listContext(limit, offset, projectId ?? undefined);
  const total = repo.countContext(projectId ?? undefined);
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.post("/api/context", async (c) => {
  const body = await c.req.json();
  const item = {
    id: generateId("ctx"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    type: "note",
    title: "",
    body: "",
    visibility: "private",
    projectId: null as string | null,
    sourceAgent: null as string | null,
    sourceEventId: null as string | null,
    confidence: null as number | null,
    tags: [] as string[],
    ...body,
  };
  repo.insertContext(item);
  return c.json(item, 201);
});

app.get("/api/context/:id", (c) => {
  const item = repo.getContext(c.req.param("id"));
  return item ? c.json(item) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/context/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateContext(c.req.param("id"), body);
  return ok ? c.json(repo.getContext(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

app.post("/api/context/:id/promote-from-event", async (c) => {
  const event = repo.getEvent(c.req.param("id"));
  if (!event) return c.json({ error: "Event not found" }, 404);
  const body = await c.req.json().catch(() => ({}));
  const item: import("@agent-hub/shared").ContextItem = {
    id: generateId("ctx"),
    projectId: event.projectId ?? body.projectId ?? undefined,
    type: body.type ?? "finding",
    title: body.title ?? event.title,
    body: body.body ?? event.body ?? event.summary ?? "",
    sourceAgent: event.agentId,
    sourceEventId: event.id,
    confidence: body.confidence ?? undefined,
    visibility: body.visibility ?? "project",
    tags: body.tags ?? [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  repo.insertContext(item);
  return c.json(item, 201);
});

// ─── Artifacts ───────────────────────────────────────────
app.get("/api/artifacts", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const projectId = c.req.query("project_id");
  const data = repo.listArtifacts(limit, offset, projectId ?? undefined);
  const total = repo.countArtifacts(projectId ?? undefined);
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.post("/api/artifacts", async (c) => {
  const body = await c.req.json();
  const artifact = {
    id: generateId("art"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    name: "",
    artifactType: "file",
    trustStatus: "untrusted",
    projectId: null as string | null,
    path: null as string | null,
    uri: null as string | null,
    mimeType: null as string | null,
    sizeBytes: null as number | null,
    hash: null as string | null,
    sourceAgent: null as string | null,
    sourceEventId: null as string | null,
    summary: null as string | null,
    tags: [] as string[],
    ...body,
  };
  repo.insertArtifact(artifact);
  return c.json(artifact, 201);
});

app.get("/api/artifacts/:id", (c) => {
  const artifact = repo.getArtifact(c.req.param("id"));
  return artifact ? c.json(artifact) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/artifacts/:id", async (c) => {
  const body = await c.req.json();
  const ok = repo.updateArtifact(c.req.param("id"), body);
  return ok ? c.json(repo.getArtifact(c.req.param("id"))) : c.json({ error: "Not found" }, 404);
});

// ─── Events ──────────────────────────────────────────────
app.get("/api/events", (c) => {
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = parseInt(c.req.query("offset") ?? "0");
  const projectId = c.req.query("project_id");
  const data = repo.listEvents(limit, offset, projectId ?? undefined);
  const total = repo.countEvents();
  return c.json({ data, total, limit, offset, hasMore: offset + limit < total });
});

app.post("/api/events", async (c) => {
  const body = await c.req.json();
  const event = {
    id: generateId("event"),
    ...body,
    relatedResourceIds: body.relatedResourceIds ?? [],
    relatedArtifactIds: body.relatedArtifactIds ?? [],
    createdAt: nowISO(),
  };
  repo.insertEvent(event);
  return c.json(event, 201);
});

app.get("/api/events/:id", (c) => {
  const event = repo.getEvent(c.req.param("id"));
  return event ? c.json(event) : c.json({ error: "Not found" }, 404);
});

// ─── Delete endpoints ─────────────────────────────────────
app.delete("/api/agents/:id", (c) => {
  return repo.deleteAgent(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/skills/:id", (c) => {
  return repo.deleteSkill(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/mcp-servers/:id", (c) => {
  return repo.deleteMcpServer(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/experts/:id", (c) => {
  return repo.deleteExpert(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/projects/:id", (c) => {
  return repo.deleteProject(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/context/:id", (c) => {
  return repo.deleteContext(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/artifacts/:id", (c) => {
  return repo.deleteArtifact(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});
app.delete("/api/events/:id", (c) => {
  return repo.deleteEvent(c.req.param("id")) ? c.json({ success: true }) : c.json({ error: "Not found" }, 404);
});

// ─── Scan ────────────────────────────────────────────────
app.post("/api/scan", async (c) => {
  const run = await runFullScan();
  return c.json(run);
});

app.get("/api/scan/status", (c) => {
  return c.json({ lastScanAt: nowISO(), status: "idle" });
});

// ─── Search ──────────────────────────────────────────────
app.get("/api/search", (c) => {
  const q = c.req.query("q") ?? "";
  const types = c.req.query("types")?.split(",").filter(Boolean);
  const limit = parseInt(c.req.query("limit") ?? "20");
  if (!q) return c.json({ data: [] });
  const results = searchAll(q, types, limit);
  return c.json({ data: results });
});

// ─── Export / Import ─────────────────────────────────────
app.get("/api/export", (c) => {
  const data = repo.exportAll();
  return c.json(data);
});

app.post("/api/export", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const redacted = body.redacted !== false; // default redacted
  const data = repo.exportAll();
  if (redacted) {
    // Redact env var values in MCP servers — only keep env var names
    data.mcpServers = data.mcpServers.map(m => ({ ...m })) as typeof data.mcpServers;
  }
  return c.json(data);
});

app.post("/api/import", async (c) => {
  const body = await c.req.json();
  const result = repo.importAll(body);
  return c.json(result, 200);
});

// ─── SSE ─────────────────────────────────────────────────
app.get("/api/events/stream", (c) => {
  return streamSSE(c, async (stream) => {
    const unsub = sse.subscribe((event) => {
      stream.writeSSE({ data: JSON.stringify(event), event: event.type });
    });

    // Keep alive
    const interval = setInterval(() => {
      stream.writeSSE({ data: "ping", event: "keepalive" });
    }, 15000);

    stream.onAbort(() => {
      clearInterval(interval);
      unsub();
    });

    // Wait indefinitely
    await new Promise(() => {});
  });
});

// ─── Static files ─────────────────────────────────────────
// Serve web app in production; in dev, Vite dev server handles this
const webDist = join(import.meta.dirname ?? ".", "../../web/dist");
if (existsSync(webDist)) {
  app.get("/*", async (c) => {
    const path = c.req.path === "/" ? "/index.html" : c.req.path;
    // Never intercept /api/ routes
    if (path.startsWith("/api/")) return c.notFound();
    const filePath = join(webDist, path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      const ext = path.split(".").pop();
      const mime: Record<string, string> = {
        html: "text/html", js: "application/javascript", css: "text/css",
        json: "application/json", png: "image/png", svg: "image/svg+xml",
      };
      return new Response(content, {
        headers: { "Content-Type": mime[ext ?? ""] ?? "text/plain" },
      });
    }
    // SPA fallback
    const indexFile = join(webDist, "index.html");
    if (existsSync(indexFile)) {
      return new Response(readFileSync(indexFile, "utf-8"), {
        headers: { "Content-Type": "text/html" },
      });
    }
    return c.text("Not Found", 404);
  });
}

// ─── Start ───────────────────────────────────────────────
if (!process.env.AGENT_HUB_NO_LISTEN) {
  console.log(`\n  Agent Context Hub v0.1.0`);
  console.log(`  Web Console: http://localhost:${PORT}`);
  console.log(`  Health:      http://localhost:${PORT}/health`);
  console.log(`  Data Dir:    ${DATA_DIR}\n`);

  serve({ fetch: app.fetch, port: PORT });
}

export default app;

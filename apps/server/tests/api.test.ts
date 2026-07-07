import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Hono } from "hono";

// Set env before any server import
const tmpDir = mkdtempSync(join(tmpdir(), "agent-hub-test-"));
process.env.AGENT_HUB_HOME = tmpDir;
process.env.AGENT_HUB_NO_LISTEN = "1";

let app: Hono;

beforeAll(async () => {
  const mod = await import("../src/index.js");
  app = mod.default;
});

afterAll(async () => {
  // Close DB before cleanup to release file locks
  const { closeDb } = await import("@agent-hub/core");
  closeDb();
  rmSync(tmpDir, { recursive: true, force: true });
});

// Helpers
async function get(path: string) {
  const res = await app.request(path);
  const body = await res.json();
  return { status: res.status, body };
}

async function post(path: string, data: unknown) {
  const res = await app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function patch(path: string, data: unknown) {
  const res = await app.request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function del(path: string) {
  const res = await app.request(path, { method: "DELETE" });
  const body = await res.json();
  return { status: res.status, body };
}

describe("API — Health", () => {
  it("GET /health returns ok", async () => {
    const { status, body } = await get("/health");
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
  });
});

describe("API — Agents CRUD", () => {
  let agentId: string;

  it("POST creates an agent", async () => {
    const { status, body } = await post("/api/agents", { name: "Test", type: "cli" });
    expect(status).toBe(201);
    expect(body.name).toBe("Test");
    agentId = body.id;
  });

  it("GET lists agents", async () => {
    const { status, body } = await get("/api/agents");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET returns single agent", async () => {
    const { status, body } = await get(`/api/agents/${agentId}`);
    expect(status).toBe(200);
    expect(body.id).toBe(agentId);
  });

  it("GET returns 404 for unknown id", async () => {
    const { status } = await get("/api/agents/nonexistent");
    expect(status).toBe(404);
  });

  it("PATCH updates agent", async () => {
    const { status, body } = await patch(`/api/agents/${agentId}`, { notes: "updated" });
    expect(status).toBe(200);
    expect(body.notes).toBe("updated");
  });

  it("DELETE removes agent", async () => {
    const { status } = await del(`/api/agents/${agentId}`);
    expect(status).toBe(200);
    const { status: s2 } = await get(`/api/agents/${agentId}`);
    expect(s2).toBe(404);
  });
});

describe("API — Skills", () => {
  it("GET returns paginated response", async () => {
    const { status, body } = await get("/api/skills");
    expect(status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
  });

  it("GET with status filter", async () => {
    const { status, body } = await get("/api/skills?status=active");
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET returns 404 for unknown", async () => {
    const { status } = await get("/api/skills/nonexistent");
    expect(status).toBe(404);
  });
});

describe("API — MCP Servers", () => {
  it("GET returns paginated", async () => {
    const { status, body } = await get("/api/mcp-servers");
    expect(status).toBe(200);
    expect(body).toHaveProperty("data");
  });

  it("GET returns 404 for unknown", async () => {
    const { status } = await get("/api/mcp-servers/nonexistent");
    expect(status).toBe(404);
  });
});

describe("API — Experts", () => {
  it("GET returns paginated", async () => {
    const { status, body } = await get("/api/experts");
    expect(status).toBe(200);
    expect(body).toHaveProperty("data");
  });
});

describe("API — Projects CRUD", () => {
  let projectId: string;

  it("POST creates project", async () => {
    const { status, body } = await post("/api/projects", { name: "TestProject" });
    expect(status).toBe(201);
    projectId = body.id;
  });

  it("GET lists projects", async () => {
    const { status, body } = await get("/api/projects");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET returns single", async () => {
    const { status } = await get(`/api/projects/${projectId}`);
    expect(status).toBe(200);
  });

  it("PATCH updates", async () => {
    const { status, body } = await patch(`/api/projects/${projectId}`, { description: "new" });
    expect(status).toBe(200);
    expect(body.description).toBe("new");
  });

  it("DELETE removes", async () => {
    await del(`/api/projects/${projectId}`);
    const { status } = await get(`/api/projects/${projectId}`);
    expect(status).toBe(404);
  });
});

describe("API — Context Items CRUD", () => {
  let ctxId: string;

  it("POST creates context item", async () => {
    const { status, body } = await post("/api/context", {
      type: "decision", title: "Test", body: "Body", visibility: "project",
    });
    expect(status).toBe(201);
    ctxId = body.id;
  });

  it("GET lists items", async () => {
    const { status, body } = await get("/api/context");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH updates item", async () => {
    const { status, body } = await patch(`/api/context/${ctxId}`, { title: "Updated" });
    expect(status).toBe(200);
    expect(body.title).toBe("Updated");
  });

  it("DELETE removes item", async () => {
    await del(`/api/context/${ctxId}`);
    const { status } = await get(`/api/context/${ctxId}`);
    expect(status).toBe(404);
  });
});

describe("API — Artifacts CRUD", () => {
  let artId: string;

  it("POST creates artifact", async () => {
    const { status, body } = await post("/api/artifacts", {
      name: "TestFile", artifactType: "file",
    });
    expect(status).toBe(201);
    artId = body.id;
  });

  it("GET lists artifacts", async () => {
    const { status, body } = await get("/api/artifacts");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH updates", async () => {
    const { status, body } = await patch(`/api/artifacts/${artId}`, { summary: "updated" });
    expect(status).toBe(200);
    expect(body.summary).toBe("updated");
  });

  it("DELETE removes", async () => {
    await del(`/api/artifacts/${artId}`);
    const { status } = await get(`/api/artifacts/${artId}`);
    expect(status).toBe(404);
  });
});

describe("API — Events CRUD", () => {
  let eventId: string;

  it("POST creates event", async () => {
    const { status, body } = await post("/api/events", {
      eventType: "manual_note", title: "Test",
    });
    expect(status).toBe(201);
    eventId = body.id;
  });

  it("GET lists events", async () => {
    const { status, body } = await get("/api/events");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("DELETE removes event", async () => {
    await del(`/api/events/${eventId}`);
    const { status } = await get(`/api/events/${eventId}`);
    expect(status).toBe(404);
  });
});

describe("API — Overview", () => {
  it("returns overview with counts", async () => {
    const { status, body } = await get("/api/overview");
    expect(status).toBe(200);
    expect(body).toHaveProperty("counts");
    expect(body).toHaveProperty("agentMatrix");
  });
});

describe("API — Export/Import", () => {
  it("GET /api/export returns data", async () => {
    const { status, body } = await get("/api/export");
    expect(status).toBe(200);
    expect(body).toHaveProperty("version");
  });
});

describe("API — Search", () => {
  it("returns empty for no query", async () => {
    const { status, body } = await get("/api/search");
    expect(status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

describe("API — Scan", () => {
  it("returns idle status", async () => {
    const { status, body } = await get("/api/scan/status");
    expect(status).toBe(200);
    expect(body.status).toBe("idle");
  });
});

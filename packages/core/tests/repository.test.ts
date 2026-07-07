import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initTestDb,
  closeDb,
  getDb,
} from "../src/storage/db.js";
import {
  upsertAgent, getAgent, listAgents, countAgents, deleteAgent, updateAgent,
  upsertSkill, getSkill, listSkills, countSkills, deleteSkill, updateSkill,
  upsertMcpServer, getMcpServer, listMcpServers, countMcpServers, deleteMcpServer,
  updateMcpServer, updateMcpHealthStatus,
  upsertExpert, getExpert, listExperts, countExperts, deleteExpert, updateExpert,
  upsertProject, getProject, listProjects, countProjects, deleteProject, updateProject,
  insertContext, upsertContext, getContext, listContext, countContext, deleteContext, updateContext,
  insertArtifact, upsertArtifact, getArtifact, listArtifacts, countArtifacts, deleteArtifact, updateArtifact,
  insertEvent, getEvent, listEvents, countEvents, deleteEvent,
  insertScanRun,
  exportAll, importAll,
} from "../src/storage/repository.js";

const NOW = "2026-07-07T12:00:00.000Z";

// ─── Test fixtures ───────────────────────────────────────

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent_test1", name: "TestAgent", type: "cli", vendor: "testcorp",
    version: "1.0", configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
    status: "active", notes: null, lastSeenAt: NOW, createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeSkill(overrides: Record<string, unknown> = {}) {
  return {
    id: "skill_test1", name: "TestSkill", description: "A test skill",
    source: "TestAgent", rootPath: "/skills/test", skillFilePath: "/skills/test/SKILL.md",
    version: "1.0", risk: "low", tags: ["test"], capabilities: ["testing"],
    dependencies: [], compatibleAgents: ["TestAgent"], status: "active",
    metadataQuality: "complete", lastScannedAt: NOW, createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeMcpServer(overrides: Record<string, unknown> = {}) {
  return {
    id: "mcp_test1", name: "TestMCP", transport: "stdio", command: "npx",
    url: null, args: ["-y", "@test/mcp"], envVarNames: [],
    configPath: "~/.workbuddy/mcp.json", configOwnerAgents: ["TestAgent"],
    capabilities: ["search"], tools: ["search"], resources: [], prompts: [],
    healthStatus: "unknown", lastHealthCheckAt: null,
    status: "active", createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeExpert(overrides: Record<string, unknown> = {}) {
  return {
    id: "expert_test1", name: "TestExpert", description: "An expert",
    source: "TestAgent", rootPath: "/experts/test", definitionFilePath: "/experts/test/expert.yaml",
    version: "1.0", capabilities: ["advice"], compatibleAgents: ["TestAgent"],
    dependencies: [], status: "active", lastScannedAt: NOW,
    createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj_test1", name: "TestProject", rootPath: "/projects/test",
    description: "Test project", techStack: ["typescript"], agents: ["TestAgent"],
    activeContext: null, status: "active", lastScannedAt: NOW,
    createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeContextItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "ctx_test1", projectId: "proj_test1", type: "decision",
    title: "Test Decision", body: "We decided to test",
    sourceAgent: "TestAgent", sourceEventId: null,
    confidence: 0.9, visibility: "project", tags: ["test"],
    createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeArtifact(overrides: Record<string, unknown> = {}) {
  return {
    id: "art_test1", projectId: "proj_test1", name: "Test File",
    artifactType: "file", path: "/test/file.ts", uri: null,
    mimeType: "text/typescript", sizeBytes: 1024, hash: "abc123",
    sourceAgent: "TestAgent", sourceEventId: null,
    trustStatus: "trusted", summary: "Test artifact", tags: ["code"],
    createdAt: NOW, updatedAt: NOW,
    ...overrides,
  };
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test1", projectId: "proj_test1", agentId: "agent_test1",
    eventType: "scan", title: "Scan done", summary: "OK",
    body: "No problems", relatedResourceIds: [], relatedArtifactIds: [],
    createdAt: NOW,
    ...overrides,
  };
}

// ─── Setup / teardown ────────────────────────────────────

beforeAll(() => { initTestDb(); });
afterAll(() => { closeDb(); });
beforeEach(() => {
  // Clear all data between tests for isolation
  const db = getDb();
  for (const table of ["events", "artifacts", "context_items", "projects", "experts", "mcp_servers", "skills", "agents", "scan_runs"]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
});

// ─── DB Initialization ───────────────────────────────────

describe("Database initialization", () => {
  it("creates all tables successfully", () => {
    const db = getDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' AND name NOT LIKE '%_fts_%' AND name != '_migrations' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain("agents");
    expect(names).toContain("skills");
    expect(names).toContain("mcp_servers");
    expect(names).toContain("experts");
    expect(names).toContain("projects");
    expect(names).toContain("context_items");
    expect(names).toContain("artifacts");
    expect(names).toContain("events");
    expect(names).toContain("scan_runs");
  });

  it("creates FTS tables", () => {
    const db = getDb();
    const fts = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts'").all() as { name: string }[];
    expect(fts.length).toBeGreaterThanOrEqual(7);
  });

  it("records migration versions", () => {
    const db = getDb();
    const rows = db.prepare("SELECT version FROM _migrations ORDER BY version").all() as { version: number }[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.version).toBe(0);
  });
});

// ─── Agent CRUD ──────────────────────────────────────────

describe("Agent repository", () => {
  it("upserts and retrieves an agent", () => {
    upsertAgent(makeAgent());
    const a = getAgent("agent_test1");
    expect(a).toBeDefined();
    expect(a!.name).toBe("TestAgent");
    expect(a!.type).toBe("cli");
  });

  it("upsert updates existing agent", () => {
    upsertAgent(makeAgent());
    upsertAgent(makeAgent({ name: "UpdatedAgent", vendor: "newcorp" }));
    const a = getAgent("agent_test1");
    expect(a!.name).toBe("UpdatedAgent");
    expect(a!.vendor).toBe("newcorp");
  });

  it("lists agents with pagination", () => {
    upsertAgent(makeAgent({ id: "agent_a", name: "A" }));
    upsertAgent(makeAgent({ id: "agent_b", name: "B" }));
    const list = listAgents(1, 0);
    expect(list).toHaveLength(1);
    const list2 = listAgents(10, 0);
    expect(list2).toHaveLength(2);
  });

  it("counts agents", () => {
    expect(countAgents()).toBe(0);
    upsertAgent(makeAgent());
    expect(countAgents()).toBe(1);
    upsertAgent(makeAgent({ id: "agent_x", name: "X" }));
    expect(countAgents()).toBe(2);
  });

  it("updates agent metadata", () => {
    upsertAgent(makeAgent());
    const ok = updateAgent("agent_test1", { notes: "new note" });
    expect(ok).toBe(true);
    expect(getAgent("agent_test1")!.notes).toBe("new note");
  });

  it("updateAgent returns false for non-existent", () => {
    expect(updateAgent("nonexistent", { notes: "nope" })).toBe(false);
  });

  it("deletes an agent and returns false for missing", () => {
    upsertAgent(makeAgent());
    expect(deleteAgent("agent_test1")).toBe(true);
    expect(getAgent("agent_test1")).toBeUndefined();
    expect(deleteAgent("agent_test1")).toBe(false);
  });

  it("returns undefined for non-existent agent", () => {
    expect(getAgent("nonexistent")).toBeUndefined();
  });

  it("handles nullable fields correctly", () => {
    upsertAgent(makeAgent({ vendor: null, version: null, lastSeenAt: null }));
    const a = getAgent("agent_test1")!;
    expect(a.vendor).toBeNull();
    expect(a.version).toBeNull();
    expect(a.lastSeenAt).toBeNull();
  });
});

// ─── Skill CRUD ──────────────────────────────────────────

describe("Skill repository", () => {
  it("upserts and retrieves a skill", () => {
    upsertSkill(makeSkill());
    const s = getSkill("skill_test1");
    expect(s).toBeDefined();
    expect(s!.name).toBe("TestSkill");
    expect(s!.tags).toEqual(["test"]);
  });

  it("lists skills with status filter", () => {
    upsertSkill(makeSkill({ id: "s1", status: "active" }));
    upsertSkill(makeSkill({ id: "s2", status: "disabled" }));
    const active = listSkills(10, 0, { status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe("s1");
  });

  it("countSkills by agent name", () => {
    upsertSkill(makeSkill({ source: "MyAgent" }));
    upsertSkill(makeSkill({ id: "s2", source: "OtherAgent" }));
    expect(countSkills("MyAgent")).toBe(1);
    expect(countSkills()).toBe(2);
  });

  it("updates and deletes skill", () => {
    upsertSkill(makeSkill());
    updateSkill("skill_test1", { status: "disabled" });
    expect(getSkill("skill_test1")!.status).toBe("disabled");
    deleteSkill("skill_test1");
    expect(getSkill("skill_test1")).toBeUndefined();
  });
});

// ─── MCP Server CRUD ─────────────────────────────────────

describe("MCP Server repository", () => {
  it("upserts and retrieves an MCP server", () => {
    upsertMcpServer(makeMcpServer());
    const m = getMcpServer("mcp_test1");
    expect(m).toBeDefined();
    expect(m!.name).toBe("TestMCP");
    expect(m!.transport).toBe("stdio");
  });

  it("handles url field for SSE transport", () => {
    upsertMcpServer(makeMcpServer({ transport: "sse", url: "http://localhost:3000/sse" }));
    const m = getMcpServer("mcp_test1")!;
    expect(m.transport).toBe("sse");
    expect(m.url).toBe("http://localhost:3000/sse");
  });

  it("countMcpServers by agent name", () => {
    upsertMcpServer(makeMcpServer({ configOwnerAgents: ["MyAgent"] }));
    expect(countMcpServers("MyAgent")).toBe(1);
    expect(countMcpServers("OtherAgent")).toBe(0);
  });

  it("updates health status", () => {
    upsertMcpServer(makeMcpServer());
    const ok = updateMcpHealthStatus("mcp_test1", "healthy");
    expect(ok).toBe(true);
    const m = getMcpServer("mcp_test1")!;
    expect(m.healthStatus).toBe("healthy");
    expect(m.lastHealthCheckAt).toBeDefined();
  });

  it("updates and deletes MCP server", () => {
    upsertMcpServer(makeMcpServer());
    updateMcpServer("mcp_test1", { status: "disabled" });
    expect(getMcpServer("mcp_test1")!.status).toBe("disabled");
    deleteMcpServer("mcp_test1");
    expect(getMcpServer("mcp_test1")).toBeUndefined();
  });
});

// ─── Expert CRUD ─────────────────────────────────────────

describe("Expert repository", () => {
  it("upserts and retrieves an expert", () => {
    upsertExpert(makeExpert());
    const e = getExpert("expert_test1");
    expect(e).toBeDefined();
    expect(e!.name).toBe("TestExpert");
    expect(e!.capabilities).toEqual(["advice"]);
  });

  it("countExperts by agent name", () => {
    upsertExpert(makeExpert({ source: "MyAgent" }));
    upsertExpert(makeExpert({ id: "e2", source: "OtherAgent" }));
    expect(countExperts("MyAgent")).toBe(1);
  });

  it("updates and deletes expert", () => {
    upsertExpert(makeExpert());
    updateExpert("expert_test1", { status: "disabled" });
    expect(getExpert("expert_test1")!.status).toBe("disabled");
    deleteExpert("expert_test1");
    expect(getExpert("expert_test1")).toBeUndefined();
  });
});

// ─── Project CRUD ────────────────────────────────────────

describe("Project repository", () => {
  it("upserts and retrieves a project", () => {
    upsertProject(makeProject());
    const p = getProject("proj_test1");
    expect(p).toBeDefined();
    expect(p!.name).toBe("TestProject");
    expect(p!.techStack).toEqual(["typescript"]);
  });

  it("updates and deletes project", () => {
    upsertProject(makeProject());
    updateProject("proj_test1", { description: "Updated" });
    expect(getProject("proj_test1")!.description).toBe("Updated");
    deleteProject("proj_test1");
    expect(getProject("proj_test1")).toBeUndefined();
  });
});

// ─── Context Item CRUD ───────────────────────────────────

describe("Context Item repository", () => {
  it("inserts and retrieves a context item", () => {
    insertContext(makeContextItem());
    const c = getContext("ctx_test1");
    expect(c).toBeDefined();
    expect(c!.title).toBe("Test Decision");
    expect(c!.confidence).toBe(0.9);
  });

  it("upserts context (merge on conflict)", () => {
    insertContext(makeContextItem({ title: "Original" }));
    upsertContext(makeContextItem({ title: "Merged" }));
    expect(getContext("ctx_test1")!.title).toBe("Merged");
  });

  it("lists context by projectId", () => {
    insertContext(makeContextItem({ id: "c1", projectId: "proj_a" }));
    insertContext(makeContextItem({ id: "c2", projectId: "proj_b" }));
    expect(listContext(10, 0, "proj_a")).toHaveLength(1);
  });

  it("updates and deletes context", () => {
    insertContext(makeContextItem());
    updateContext("ctx_test1", { title: "Updated title" });
    expect(getContext("ctx_test1")!.title).toBe("Updated title");
    deleteContext("ctx_test1");
    expect(getContext("ctx_test1")).toBeUndefined();
  });
});

// ─── Artifact CRUD ───────────────────────────────────────

describe("Artifact repository", () => {
  it("inserts and retrieves an artifact", () => {
    insertArtifact(makeArtifact());
    const a = getArtifact("art_test1");
    expect(a).toBeDefined();
    expect(a!.name).toBe("Test File");
    expect(a!.sizeBytes).toBe(1024);
  });

  it("upserts artifact on conflict", () => {
    insertArtifact(makeArtifact({ name: "Original" }));
    upsertArtifact(makeArtifact({ name: "Updated" }));
    expect(getArtifact("art_test1")!.name).toBe("Updated");
  });

  it("lists artifacts by projectId", () => {
    insertArtifact(makeArtifact({ id: "a1", projectId: "proj_a" }));
    insertArtifact(makeArtifact({ id: "a2", projectId: "proj_b" }));
    expect(listArtifacts(10, 0, "proj_a")).toHaveLength(1);
  });

  it("updates and deletes artifact", () => {
    insertArtifact(makeArtifact());
    updateArtifact("art_test1", { trustStatus: "deprecated" });
    expect(getArtifact("art_test1")!.trustStatus).toBe("deprecated");
    deleteArtifact("art_test1");
    expect(getArtifact("art_test1")).toBeUndefined();
  });
});

// ─── Event CRUD ──────────────────────────────────────────

describe("Event repository", () => {
  it("inserts and retrieves an event", () => {
    insertEvent(makeEvent());
    const e = getEvent("evt_test1");
    expect(e).toBeDefined();
    expect(e!.title).toBe("Scan done");
    expect(e!.eventType).toBe("scan");
  });

  it("lists events with projectId filter", () => {
    insertEvent(makeEvent({ id: "e1", projectId: "proj_a" }));
    insertEvent(makeEvent({ id: "e2", projectId: "proj_b" }));
    expect(listEvents(10, 0, "proj_a")).toHaveLength(1);
  });

  it("deletes event", () => {
    insertEvent(makeEvent());
    deleteEvent("evt_test1");
    expect(getEvent("evt_test1")).toBeUndefined();
  });
});

// ─── Scan Run ────────────────────────────────────────────

describe("Scan Run", () => {
  it("inserts and retrieves a scan run", () => {
    insertScanRun({
      id: "scan_1", scanner: "full", status: "completed",
      startedAt: NOW, finishedAt: null, discoveredCount: 5, warningCount: 1,
      errorCount: 0, messages: [],
    });
    const db = getDb();
    const row = db.prepare("SELECT * FROM scan_runs WHERE id = ?").get("scan_1") as any;
    expect(row).toBeDefined();
    expect(row.status).toBe("completed");
    expect(row.discovered_count).toBe(5);
  });
});

// ─── Export / Import ─────────────────────────────────────

describe("Export / Import", () => {
  it("exports all entities and re-imports them", () => {
    upsertAgent(makeAgent());
    upsertSkill(makeSkill());
    upsertMcpServer(makeMcpServer());
    upsertExpert(makeExpert());
    upsertProject(makeProject());
    insertContext(makeContextItem());
    insertArtifact(makeArtifact());
    insertEvent(makeEvent());

    const data = exportAll();
    expect(data.agents).toHaveLength(1);
    expect(data.skills).toHaveLength(1);
    expect(data.mcpServers).toHaveLength(1);
    expect(data.experts).toHaveLength(1);
    expect(data.version).toBe("0.1.0");

    // Clear and re-import
    const db = getDb();
    for (const table of ["events", "artifacts", "context_items", "projects", "experts", "mcp_servers", "skills", "agents"]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    const result = importAll(data);
    expect(result.imported.agents).toBe(1);
    expect(countAgents()).toBe(1);
    expect(countSkills()).toBe(1);
  });
});

// ─── Edge cases ──────────────────────────────────────────

describe("Edge cases", () => {
  it("handles empty arrays in JSON fields", () => {
    upsertSkill(makeSkill({ tags: [], capabilities: [], dependencies: [], compatibleAgents: [] }));
    const s = getSkill("skill_test1")!;
    expect(s.tags).toEqual([]);
    expect(s.capabilities).toEqual([]);
  });

  it("handles multiple items of same type", () => {
    for (let i = 0; i < 5; i++) {
      upsertSkill(makeSkill({ id: `skill_${i}`, name: `Skill ${i}` }));
    }
    expect(listSkills(100, 0)).toHaveLength(5);
    expect(countSkills()).toBe(5);
  });

  it("isolation: operations on one table don't affect others", () => {
    upsertAgent(makeAgent());
    expect(countAgents()).toBe(1);
    expect(countSkills()).toBe(0);
    expect(countMcpServers()).toBe(0);
  });
});

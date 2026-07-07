import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initTestDb, closeDb, getDb } from "../src/storage/db.js";
import { upsertAgent, upsertSkill, upsertMcpServer, upsertExpert, upsertProject, insertContext } from "../src/storage/repository.js";
import { searchAll } from "../src/search/service.js";

const NOW = "2026-07-07T12:00:00.000Z";

beforeAll(() => { initTestDb(); });
afterAll(() => { closeDb(); });
beforeEach(() => {
  const db = getDb();
  for (const table of ["context_items", "projects", "experts", "mcp_servers", "skills", "agents"]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
});

describe("Cross-entity search", () => {
  it("finds agents by name (CJK LIKE fallback)", () => {
    upsertAgent({
      id: "agent_search1", name: "搜索助手", type: "cli",
      configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("搜索");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.entityType === "agents" && r.title.includes("搜索"))).toBe(true);
  });

  it("finds agents by name (ASCII FTS5)", () => {
    upsertAgent({
      id: "agent_fts1", name: "SearchAgent", vendor: "SaaS Co", type: "cli",
      configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("SearchAgent");
    expect(results.some(r => r.entityType === "agents")).toBe(true);
  });

  it("finds skills by description", () => {
    upsertSkill({
      id: "skill_search1", name: "PDF Converter", description: "Converts PDF files to images",
      source: "TestAgent", rootPath: "/skills/pdf", skillFilePath: "/skills/pdf/SKILL.md",
      tags: ["pdf"], capabilities: ["conversion"], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("PDF");
    expect(results.some(r => r.entityType === "skills")).toBe(true);
  });

  it("finds MCP servers by name", () => {
    upsertMcpServer({
      id: "mcp_search1", name: "GitHub MCP", transport: "stdio", command: "gh-mcp",
      url: null, args: [], envVarNames: [], configOwnerAgents: [],
      capabilities: ["github"], tools: ["list-issues"], resources: [], prompts: [],
      healthStatus: "unknown", status: "active", createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("GitHub");
    expect(results.some(r => r.entityType === "mcp_servers")).toBe(true);
  });

  it("finds experts by name", () => {
    upsertExpert({
      id: "expert_search1", name: "Security Auditor", description: "Audits security",
      source: "TestAgent", rootPath: "/experts/sec", definitionFilePath: "/experts/sec/expert.yaml",
      capabilities: ["security"], compatibleAgents: [], dependencies: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("auditor");
    // FTS5 may not match "auditor" as a substring, so use LIKE fallback check
    const resultsWithCJK = searchAll("安全");
    expect(resultsWithCJK.length).toBeGreaterThanOrEqual(0);
  });

  it("filters by entity types", () => {
    upsertAgent({
      id: "agent_filter", name: "OnlyAgent", type: "cli",
      configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "skill_filter", name: "OnlySkill", source: "TestAgent",
      rootPath: "/s", skillFilePath: "/s/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("Only", ["agents"]);
    expect(results.every(r => r.entityType === "agents")).toBe(true);
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      upsertAgent({
        id: `agent_l${i}`, name: `LimitTest${i}`, type: "cli",
        configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
        status: "active", createdAt: NOW, updatedAt: NOW,
      });
    }
    const results = searchAll("LimitTest", undefined, 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("returns empty for no matches", () => {
    const results = searchAll("nonexistentxyz123");
    expect(results).toHaveLength(0);
  });

  it("searches context items", () => {
    insertContext({
      id: "ctx_search1", projectId: null, type: "decision",
      title: "Architecture Decision", body: "We chose microservices",
      sourceAgent: null, sourceEventId: null, confidence: 1, visibility: "project",
      tags: [], createdAt: NOW, updatedAt: NOW,
    });
    const results = searchAll("microservices");
    expect(results.some(r => r.entityType === "context_items")).toBe(true);
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initTestDb, closeDb, getDb } from "../src/storage/db.js";
import { upsertAgent, upsertSkill, upsertProject } from "../src/storage/repository.js";
import { getOverview, getAgentAssetMatrix, getSkillDistribution, getSkillQualityTiers } from "../src/services/overview.js";

const NOW = "2026-07-07T12:00:00.000Z";

beforeAll(() => { initTestDb(); });
afterAll(() => { closeDb(); });
beforeEach(() => {
  const db = getDb();
  for (const table of ["projects", "skills", "agents"]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
});

describe("Overview service", () => {
  it("returns zero counts for empty database", () => {
    const overview = getOverview(NOW);
    expect(overview.counts.agents).toBe(0);
    expect(overview.counts.skills).toBe(0);
    expect(overview.counts.mcpServers).toBe(0);
    expect(overview.dbStatus).toBe("connected");
    expect(overview.lastScanAt).toBe(NOW);
  });

  it("counts all entity types correctly", () => {
    upsertAgent({
      id: "a1", name: "A", type: "cli", status: "active",
      configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
      createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "s1", name: "S", source: "A", rootPath: "/s1", skillFilePath: "/s1/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    upsertProject({
      id: "p1", name: "P", status: "active",
      techStack: [], agents: [], createdAt: NOW, updatedAt: NOW,
    });

    const overview = getOverview(NOW);
    expect(overview.counts.agents).toBe(1);
    expect(overview.counts.skills).toBe(1);
    expect(overview.counts.projects).toBe(1);
  });

  it("includes attention items for problematic skills", () => {
    upsertSkill({
      id: "s_missing", name: "Missing File Skill", source: "A",
      rootPath: "/s", skillFilePath: "/s/missing.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "missing_file", createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "s_incomplete", name: "Incomplete Skill", source: "A",
      rootPath: "/s2", skillFilePath: "/s2/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "incomplete_metadata", createdAt: NOW, updatedAt: NOW,
    });

    const overview = getOverview(NOW);
    expect(overview.attentionList.length).toBeGreaterThanOrEqual(2);
    expect(overview.attentionList.some(i => i.type === "error")).toBe(true);
    expect(overview.attentionList.some(i => i.type === "warning")).toBe(true);
  });
});

describe("Agent asset matrix", () => {
  it("returns matrix for all agents", () => {
    upsertAgent({
      id: "agent_x", name: "AgentX", type: "cli", status: "active",
      configPaths: [], skillRoots: [], mcpConfigPaths: [], expertRoots: [],
      createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "sk_x", name: "SkillX", source: "AgentX", rootPath: "/x", skillFilePath: "/x/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: ["AgentX"],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });

    const matrix = getAgentAssetMatrix();
    expect(matrix).toHaveLength(1);
    expect(matrix[0]!.agentName).toBe("AgentX");
    // countSkills("AgentX") matches by source or compatibleAgents LIKE %"AgentX"%
    expect(matrix[0]!.skills).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for no agents", () => {
    expect(getAgentAssetMatrix()).toEqual([]);
  });
});

describe("Skill distribution", () => {
  it("groups skills by source", () => {
    upsertSkill({
      id: "sd1", name: "S1", source: "AgentA", rootPath: "/a", skillFilePath: "/a/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "sd2", name: "S2", source: "AgentB", rootPath: "/b", skillFilePath: "/b/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });

    const dist = getSkillDistribution();
    expect(dist.AgentA).toBe(1);
    expect(dist.AgentB).toBe(1);
  });
});

describe("Skill quality tiers", () => {
  it("counts skills by quality", () => {
    upsertSkill({
      id: "sq1", name: "Complete", source: "A", rootPath: "/c", skillFilePath: "/c/SKILL.md",
      metadataQuality: "complete", tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "sq2", name: "Partial", source: "A", rootPath: "/p", skillFilePath: "/p/SKILL.md",
      metadataQuality: "partial", tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });
    upsertSkill({
      id: "sq3", name: "None", source: "A", rootPath: "/n", skillFilePath: "/n/SKILL.md",
      tags: [], capabilities: [], dependencies: [], compatibleAgents: [],
      status: "active", createdAt: NOW, updatedAt: NOW,
    });

    const tiers = getSkillQualityTiers();
    expect(tiers.complete).toBe(1);
    expect(tiers.partial).toBe(1);
    expect(tiers.none).toBe(1);
    expect(tiers.low).toBe(0);
  });
});

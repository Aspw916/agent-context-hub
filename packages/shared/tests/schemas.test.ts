import { describe, it, expect } from "vitest";
import {
  // Enums
  AgentStatus,
  SkillStatus,
  McpTransport,
  McpHealthStatus,
  ExpertStatus,
  ProjectStatus,
  ContextType,
  ContextVisibility,
  TrustStatus,
  EventType,
  ScanStatus,
  // Entity schemas
  AgentSchema,
  SkillSchema,
  McpServerSchema,
  ExpertSchema,
  ProjectSchema,
  ProjectBriefSchema,
  ContextItemSchema,
  ArtifactSchema,
  EventSchema,
  ScanRunSchema,
} from "../src/schemas/entities.js";
import { PaginationParams, SearchParams } from "../src/schemas/api.js";

// ─── Helpers ─────────────────────────────────────────────

const NOW = "2026-07-07T12:00:00.000Z";

const validAgent = {
  id: "agent_abc123",
  name: "TestAgent",
  type: "cli",
  vendor: "test-vendor",
  version: "1.0.0",
  configPaths: ["/config.yaml"],
  skillRoots: ["~/.workbuddy/skills"],
  mcpConfigPaths: ["~/.workbuddy/mcp.json"],
  expertRoots: [],
  status: "active" as const,
  notes: "A test agent",
  lastSeenAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const validSkill = {
  id: "skill_abc123",
  name: "TestSkill",
  description: "A test skill",
  source: "TestAgent",
  rootPath: "/skills/test",
  skillFilePath: "/skills/test/SKILL.md",
  version: "1.0.0",
  risk: "low",
  tags: ["test"],
  capabilities: ["testing"],
  dependencies: [],
  compatibleAgents: ["TestAgent"],
  status: "active" as const,
  metadataQuality: "complete",
  lastScannedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const validMcpServer = {
  id: "mcp_abc123",
  name: "TestMCP",
  transport: "stdio" as const,
  command: "npx",
  args: ["-y", "@test/mcp"],
  envVarNames: [],
  configPath: "~/.workbuddy/mcp.json",
  configOwnerAgents: ["TestAgent"],
  capabilities: ["search"],
  tools: ["search"],
  resources: [],
  prompts: [],
  healthStatus: "unknown" as const,
  status: "active" as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const validExpert = {
  id: "expert_abc123",
  name: "TestExpert",
  description: "A test expert",
  rootPath: "/experts/test",
  definitionFilePath: "/experts/test/expert.yaml",
  version: "1.0.0",
  capabilities: ["advice"],
  compatibleAgents: ["TestAgent"],
  dependencies: [],
  status: "active" as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const validProject = {
  id: "proj_abc123",
  name: "TestProject",
  rootPath: "/projects/test",
  description: "A test project",
  techStack: ["typescript"],
  agents: ["TestAgent"],
  status: "active" as const,
  createdAt: NOW,
  updatedAt: NOW,
};

const validContextItem = {
  id: "ctx_abc123",
  projectId: "proj_abc123",
  type: "decision" as const,
  title: "Test Decision",
  body: "We decided to use TypeScript",
  sourceAgent: "TestAgent",
  confidence: 0.9,
  visibility: "project" as const,
  tags: ["architecture"],
  createdAt: NOW,
  updatedAt: NOW,
};

const validArtifact = {
  id: "art_abc123",
  projectId: "proj_abc123",
  name: "Test Artifact",
  artifactType: "file",
  path: "/path/to/file.ts",
  mimeType: "text/typescript",
  sizeBytes: 1024,
  hash: "abc123def",
  sourceAgent: "TestAgent",
  trustStatus: "trusted" as const,
  summary: "A test artifact",
  tags: ["code"],
  createdAt: NOW,
  updatedAt: NOW,
};

const validEvent = {
  id: "evt_abc123",
  projectId: "proj_abc123",
  agentId: "agent_abc123",
  eventType: "scan" as const,
  title: "Scan completed",
  summary: "All good",
  body: "No issues found",
  relatedResourceIds: ["skill_abc123"],
  relatedArtifactIds: [],
  createdAt: NOW,
};

const validScanRun = {
  id: "scan_abc123",
  scanner: "full",
  status: "completed" as const,
  startedAt: NOW,
  finishedAt: NOW,
  discoveredCount: 10,
  warningCount: 1,
  errorCount: 0,
  messages: ["Scan finished"],
};

// ─── Enum Tests ──────────────────────────────────────────

describe("Enums", () => {
  describe("AgentStatus", () => {
    it("accepts valid values", () => {
      for (const val of ["active", "detected", "manual", "missing_config", "disabled", "unknown"]) {
        expect(AgentStatus.safeParse(val).success).toBe(true);
      }
    });
    it("rejects invalid values", () => {
      expect(AgentStatus.safeParse("invalid").success).toBe(false);
    });
  });

  describe("SkillStatus", () => {
    it("accepts valid values", () => {
      for (const val of ["active", "incomplete_metadata", "unreadable", "duplicate", "disabled", "missing_file"]) {
        expect(SkillStatus.safeParse(val).success).toBe(true);
      }
    });
  });

  describe("McpTransport", () => {
    it("accepts only stdio, http, sse", () => {
      expect(McpTransport.safeParse("stdio").success).toBe(true);
      expect(McpTransport.safeParse("http").success).toBe(true);
      expect(McpTransport.safeParse("sse").success).toBe(true);
      expect(McpTransport.safeParse("ws").success).toBe(false);
    });
  });

  describe("McpHealthStatus", () => {
    it("accepts valid values", () => {
      for (const val of ["unknown", "healthy", "unhealthy", "unreachable", "checking"]) {
        expect(McpHealthStatus.safeParse(val).success).toBe(true);
      }
    });
  });

  describe("ContextType", () => {
    it("accepts all 8 values", () => {
      const types = ["project_brief", "decision", "constraint", "preference", "instruction", "finding", "todo", "handoff"];
      for (const t of types) {
        expect(ContextType.safeParse(t).success).toBe(true);
      }
    });
  });

  describe("EventType", () => {
    it("accepts all 10 values", () => {
      const types = ["scan", "task_started", "task_progress", "task_completed", "finding", "decision", "artifact_registered", "handoff_created", "manual_note", "error"];
      for (const t of types) {
        expect(EventType.safeParse(t).success).toBe(true);
      }
    });
  });

  describe("ScanStatus", () => {
    it("accepts running, completed, failed", () => {
      expect(ScanStatus.safeParse("running").success).toBe(true);
      expect(ScanStatus.safeParse("completed").success).toBe(true);
      expect(ScanStatus.safeParse("failed").success).toBe(true);
    });
  });
});

// ─── Entity Schema Tests ─────────────────────────────────

describe("AgentSchema", () => {
  it("accepts a valid agent", () => {
    expect(AgentSchema.safeParse(validAgent).success).toBe(true);
  });

  it("rejects when name is empty", () => {
    const r = AgentSchema.safeParse({ ...validAgent, name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects when type is empty", () => {
    const r = AgentSchema.safeParse({ ...validAgent, type: "" });
    expect(r.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const r = AgentSchema.safeParse({ id: "x", name: "x", type: "x" });
    expect(r.success).toBe(false);
  });

  it("applies defaults for empty arrays", () => {
    const minimal = { id: "a", name: "X", type: "cli", status: "active", createdAt: NOW, updatedAt: NOW };
    const result = AgentSchema.parse(minimal);
    expect(result.configPaths).toEqual([]);
    expect(result.skillRoots).toEqual([]);
    expect(result.mcpConfigPaths).toEqual([]);
    expect(result.expertRoots).toEqual([]);
  });

  it("accepts nullable lastSeenAt", () => {
    const r = AgentSchema.safeParse({ ...validAgent, lastSeenAt: null });
    expect(r.success).toBe(true);
  });
});

describe("SkillSchema", () => {
  it("accepts a valid skill", () => {
    expect(SkillSchema.safeParse(validSkill).success).toBe(true);
  });

  it("rejects when name is empty", () => {
    expect(SkillSchema.safeParse({ ...validSkill, name: "" }).success).toBe(false);
  });

  it("rejects when rootPath is missing", () => {
    const { rootPath, ...rest } = validSkill;
    expect(SkillSchema.safeParse(rest).success).toBe(false);
  });

  it("applies defaults for arrays", () => {
    const minimal = { id: "s", name: "S", rootPath: "/", skillFilePath: "/SKILL.md", status: "active", createdAt: NOW, updatedAt: NOW };
    const r = SkillSchema.parse(minimal);
    expect(r.tags).toEqual([]);
    expect(r.capabilities).toEqual([]);
    expect(r.dependencies).toEqual([]);
    expect(r.compatibleAgents).toEqual([]);
  });
});

describe("McpServerSchema", () => {
  it("accepts a valid MCP server", () => {
    expect(McpServerSchema.safeParse(validMcpServer).success).toBe(true);
  });

  it("accepts url for sse transport", () => {
    const sse = { ...validMcpServer, transport: "sse", url: "http://localhost:3000/sse" };
    expect(McpServerSchema.safeParse(sse).success).toBe(true);
  });

  it("validates transport enum", () => {
    expect(McpServerSchema.safeParse({ ...validMcpServer, transport: "ws" }).success).toBe(false);
  });

  it("requires at minimum id, name, transport, healthStatus, status, createdAt, updatedAt", () => {
    const { command, args, ...rest } = validMcpServer;
    expect(McpServerSchema.safeParse(rest).success).toBe(true);
  });
});

describe("ExpertSchema", () => {
  it("accepts a valid expert", () => {
    expect(ExpertSchema.safeParse(validExpert).success).toBe(true);
  });

  it("rejects when rootPath is missing", () => {
    const { rootPath, ...rest } = validExpert;
    expect(ExpertSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects when definitionFilePath is missing", () => {
    const { definitionFilePath, ...rest } = validExpert;
    expect(ExpertSchema.safeParse(rest).success).toBe(false);
  });
});

describe("ProjectSchema", () => {
  it("accepts a valid project", () => {
    expect(ProjectSchema.safeParse(validProject).success).toBe(true);
  });

  it("rejects when name is empty", () => {
    expect(ProjectSchema.safeParse({ ...validProject, name: "" }).success).toBe(false);
  });
});

describe("ProjectBriefSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(ProjectBriefSchema.safeParse({}).success).toBe(true);
  });

  it("accepts all fields", () => {
    const full = {
      goal: "Build a web app",
      domain: "SaaS",
      architectureNotes: "Microservices",
      currentTasks: "Auth module",
      constraints: "Must use React",
      importantPaths: "/src",
      runCommands: "npm start",
      testCommands: "npm test",
      knownRisks: "None",
    };
    expect(ProjectBriefSchema.safeParse(full).success).toBe(true);
  });
});

describe("ContextItemSchema", () => {
  it("accepts a valid context item", () => {
    expect(ContextItemSchema.safeParse(validContextItem).success).toBe(true);
  });

  it("rejects confidence out of range", () => {
    expect(ContextItemSchema.safeParse({ ...validContextItem, confidence: 1.5 }).success).toBe(false);
    expect(ContextItemSchema.safeParse({ ...validContextItem, confidence: -0.1 }).success).toBe(false);
  });

  it("accepts confidence of 0 and 1", () => {
    expect(ContextItemSchema.safeParse({ ...validContextItem, confidence: 0 }).success).toBe(true);
    expect(ContextItemSchema.safeParse({ ...validContextItem, confidence: 1 }).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(ContextItemSchema.safeParse({ ...validContextItem, title: "" }).success).toBe(false);
  });
});

describe("ArtifactSchema", () => {
  it("accepts a valid artifact", () => {
    expect(ArtifactSchema.safeParse(validArtifact).success).toBe(true);
  });

  it("rejects empty artifactType", () => {
    expect(ArtifactSchema.safeParse({ ...validArtifact, artifactType: "" }).success).toBe(false);
  });
});

describe("EventSchema", () => {
  it("accepts a valid event", () => {
    expect(EventSchema.safeParse(validEvent).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(EventSchema.safeParse({ ...validEvent, title: "" }).success).toBe(false);
  });
});

describe("ScanRunSchema", () => {
  it("accepts a valid scan run", () => {
    expect(ScanRunSchema.safeParse(validScanRun).success).toBe(true);
  });

  it("applies number defaults", () => {
    const minimal = { id: "s", scanner: "full", status: "completed", startedAt: NOW };
    const r = ScanRunSchema.parse(minimal);
    expect(r.discoveredCount).toBe(0);
    expect(r.warningCount).toBe(0);
    expect(r.errorCount).toBe(0);
    expect(r.messages).toEqual([]);
  });
});

// ─── API Schema Tests ────────────────────────────────────

describe("PaginationParams", () => {
  it("accepts valid pagination", () => {
    expect(PaginationParams.safeParse({ limit: 10, offset: 0 }).success).toBe(true);
  });

  it("accepts strings and coerces them", () => {
    const r = PaginationParams.parse({ limit: "20", offset: "5" });
    expect(r.limit).toBe(20);
    expect(r.offset).toBe(5);
  });

  it("applies defaults when no params provided", () => {
    const r = PaginationParams.parse({});
    expect(r.limit).toBe(50);
    expect(r.offset).toBe(0);
  });

  it("rejects limit > 200", () => {
    expect(PaginationParams.safeParse({ limit: 201 }).success).toBe(false);
  });

  it("rejects limit < 1", () => {
    expect(PaginationParams.safeParse({ limit: 0 }).success).toBe(false);
  });

  it("rejects negative offset", () => {
    expect(PaginationParams.safeParse({ offset: -1 }).success).toBe(false);
  });
});

describe("SearchParams", () => {
  it("accepts valid search", () => {
    expect(SearchParams.safeParse({ q: "test" }).success).toBe(true);
  });

  it("rejects empty query", () => {
    expect(SearchParams.safeParse({ q: "" }).success).toBe(false);
  });

  it("rejects limit > 50", () => {
    expect(SearchParams.safeParse({ q: "test", limit: 51 }).success).toBe(false);
  });

  it("applies default limit of 20", () => {
    const r = SearchParams.parse({ q: "test" });
    expect(r.limit).toBe(20);
  });
});

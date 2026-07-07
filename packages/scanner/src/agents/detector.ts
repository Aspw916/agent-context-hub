import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { generateId, nowISO } from "@agent-hub/shared";
import type { Agent } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

type Platform = "win32" | "darwin" | "linux";

interface AgentDefinition {
  name: string;
  type: string;
  vendor: string;
  detectPaths: (home: string, platform: Platform) => string[];
  configPaths: (home: string, platform: Platform) => string[];
  skillRoots: (home: string, platform: Platform) => string[];
  mcpConfigPaths: (home: string, platform: Platform) => string[];
  expertRoots?: (home: string, platform: Platform) => string[];
}

const AGENTS: AgentDefinition[] = [
  {
    name: "WorkBuddy",
    type: "workbuddy",
    vendor: "Tencent",
    detectPaths: (home) => [`${home}/.workbuddy`],
    configPaths: (home) => [`${home}/.workbuddy`],
    skillRoots: (home) => [`${home}/.workbuddy/skills`],
    mcpConfigPaths: (home) => [`${home}/.workbuddy/mcp.json`],
    expertRoots: (home) => [`${home}/.workbuddy/experts`],
  },
  {
    name: "Codex",
    type: "codex",
    vendor: "OpenAI",
    detectPaths: (home) => [`${home}/.codex`],
    configPaths: (home) => [`${home}/.codex`],
    skillRoots: (home) => [`${home}/.codex/skills`],
    mcpConfigPaths: (home) => [`${home}/.codex/mcp.json`],
  },
  {
    name: "Claude Desktop",
    type: "claude",
    vendor: "Anthropic",
    detectPaths: (home, platform) => {
      if (platform === "win32") return [`${process.env.APPDATA ?? ""}/Claude`];
      if (platform === "darwin") return [`${home}/Library/Application Support/Claude`];
      return [`${home}/.config/Claude`];
    },
    configPaths: (home, platform) => {
      if (platform === "win32") return [`${process.env.APPDATA ?? ""}/Claude`];
      if (platform === "darwin") return [`${home}/Library/Application Support/Claude`];
      return [`${home}/.config/Claude`];
    },
    skillRoots: () => [],
    mcpConfigPaths: (home, platform) => {
      if (platform === "win32") return [`${process.env.APPDATA ?? ""}/Claude/claude_desktop_config.json`];
      if (platform === "darwin") return [`${home}/Library/Application Support/Claude/claude_desktop_config.json`];
      return [`${home}/.config/Claude/claude_desktop_config.json`];
    },
  },
  {
    name: "Cursor",
    type: "cursor",
    vendor: "Anysphere",
    detectPaths: (home) => [`${home}/.cursor`],
    configPaths: (home) => [`${home}/.cursor`],
    skillRoots: (home) => [`${home}/.cursor/skills`],
    mcpConfigPaths: (home) => [`${home}/.cursor/mcp.json`],
  },
  {
    name: "Hermes",
    type: "hermes",
    vendor: "Hermes",
    detectPaths: (home) => [`${home}/.hermes`],
    configPaths: (home) => [`${home}/.hermes`],
    skillRoots: (home) => [`${home}/.hermes/skills`],
    mcpConfigPaths: (home) => [`${home}/.hermes/mcp.json`],
  },
];

export interface AgentDetectResult {
  detected: number;
}

export function detectAgents(): AgentDetectResult {
  const result: AgentDetectResult = { detected: 0 };
  const home = homedir();
  const platform = process.platform as Platform;

  for (const def of AGENTS) {
    const paths = def.detectPaths(home, platform);
    const detected = paths.some(p => existsSync(p));

    const existing = repo.listAgents(100, 0).find(a => a.type === def.type);
    const now = nowISO();

    if (existing) {
      repo.upsertAgent({
        ...existing,
        status: detected ? "active" : "missing_config",
        lastSeenAt: detected ? now : existing.lastSeenAt,
        configPaths: def.configPaths(home, platform),
        skillRoots: def.skillRoots(home, platform),
        mcpConfigPaths: def.mcpConfigPaths(home, platform),
        expertRoots: def.expertRoots ? def.expertRoots(home, platform) : [],
        updatedAt: now,
      });
    } else {
      const agent: Agent = {
        id: generateId("agent"),
        name: def.name,
        type: def.type,
        vendor: def.vendor,
        configPaths: def.configPaths(home, platform),
        skillRoots: def.skillRoots(home, platform),
        mcpConfigPaths: def.mcpConfigPaths(home, platform),
        expertRoots: def.expertRoots ? def.expertRoots(home, platform) : [],
        status: detected ? "detected" : "missing_config",
        lastSeenAt: detected ? now : null,
        createdAt: now,
        updatedAt: now,
      };
      repo.upsertAgent(agent);
    }

    if (detected) result.detected++;
  }

  return result;
}

export function getAgentDefinitions(): AgentDefinition[] {
  return AGENTS;
}

import { readFileSync, existsSync } from "node:fs";
import { generateId, nowISO } from "@agent-hub/shared";
import type { McpServer } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

export interface McpScanResult {
  discovered: number;
  errors: number;
}

interface McpConfigEntry {
  [name: string]: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    transport?: string;
    url?: string;
  };
}

/** Parse an MCP config JSON file and register servers */
export function scanMcpConfig(
  configPath: string,
  ownerAgent: string,
): McpScanResult {
  const result: McpScanResult = { discovered: 0, errors: 0 };

  if (!existsSync(configPath)) {
    result.errors++;
    return result;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    const servers: McpConfigEntry = config.mcpServers ?? {};

    for (const [name, entry] of Object.entries(servers)) {
      try {
        const transport = entry.transport
          ?? (entry.command ? "stdio" : entry.url ? "sse" : "stdio");

        const existing = findExistingMcp(name, entry.command, entry.args);
        const now = nowISO();

        if (existing) {
          // Merge agent ownership
          const owners = existing.configOwnerAgents.includes(ownerAgent)
            ? existing.configOwnerAgents
            : [...existing.configOwnerAgents, ownerAgent];
          repo.upsertMcpServer({ ...existing, configOwnerAgents: owners, updatedAt: now });
        } else {
          const envVarNames = entry.env ? Object.keys(entry.env) : [];
          const mcp: McpServer = {
            id: generateId("mcp"),
            name,
            transport: transport as "stdio" | "http" | "sse",
            command: entry.command,
            url: entry.url,
            args: entry.args ?? [],
            envVarNames,
            configPath,
            configOwnerAgents: [ownerAgent],
            capabilities: [],
            tools: [],
            resources: [],
            prompts: [],
            healthStatus: "unknown",
            status: "active",
            createdAt: now,
            updatedAt: now,
          };
          repo.upsertMcpServer(mcp);
        }
        result.discovered++;
      } catch {
        result.errors++;
      }
    }
  } catch {
    result.errors++;
  }

  return result;
}

function findExistingMcp(name: string, command?: string, args?: string[]): McpServer | undefined {
  const all = repo.listMcpServers(500, 0);
  return all.find(s =>
    s.name === name &&
    s.command === (command ?? s.command) &&
    JSON.stringify(s.args) === JSON.stringify(args ?? [])
  );
}

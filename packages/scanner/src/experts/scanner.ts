import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { generateId, nowISO } from "@agent-hub/shared";
import type { Expert } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

export interface ExpertScanResult {
  discovered: number;
  errors: number;
}

export function scanExpertRoot(rootPath: string, source?: string): ExpertScanResult {
  const result: ExpertScanResult = { discovered: 0, errors: 0 };

  if (!existsSync(rootPath)) {
    result.errors++;
    return result;
  }

  try {
    const entries = readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

      const dirPath = join(rootPath, entry.name);
      const defFile = findExpertDefFile(dirPath);

      if (defFile) {
        try {
          const expert = parseExpert(defFile, rootPath, source);
          repo.upsertExpert(expert);
          result.discovered++;
        } catch {
          result.errors++;
        }
      }
    }
  } catch {
    result.errors++;
  }

  return result;
}

function findExpertDefFile(dir: string): string | null {
  const candidates = ["SKILL.md", "expert.json", "expert.yaml", "expert.yml", "index.md", "README.md"];
  for (const name of candidates) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function parseExpert(filePath: string, rootPath: string, source?: string): Expert {
  const raw = readFileSync(filePath, "utf-8");
  const now = nowISO();

  // Try JSON, fallback to markdown with frontmatter
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw);
  } catch {
    // Simple name extraction from markdown
    const match = raw.match(/^#\s+(.+)/m);
    data = { name: match ? match[1] : basename(rootPath), description: raw.substring(0, 200) };
  }

  return {
    id: generateId("expert"),
    name: String(data.name ?? basename(rootPath)),
    description: String(data.description ?? ""),
    source,
    rootPath,
    definitionFilePath: filePath,
    version: data.version ? String(data.version) : undefined,
    capabilities: Array.isArray(data.capabilities) ? data.capabilities.map(String) : [],
    compatibleAgents: Array.isArray(data.compatible_agents) ? data.compatible_agents.map(String) : [],
    dependencies: Array.isArray(data.dependencies) ? data.dependencies.map(String) : [],
    status: "active",
    lastScannedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

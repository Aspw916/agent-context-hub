import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname, relative } from "node:path";
import matter from "gray-matter";
import { generateId, nowISO } from "@agent-hub/shared";
import type { Skill } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

export interface ScanResult {
  discovered: number;
  warnings: number;
  errors: number;
}

/** Recursively scan a root directory for SKILL.md files */
export function scanSkillRoot(rootPath: string, source?: string): ScanResult {
  const result: ScanResult = { discovered: 0, warnings: 0, errors: 0 };

  if (!existsSync(rootPath)) {
    result.errors++;
    return result;
  }

  const skillFiles = findSkillFiles(rootPath);
  for (const filePath of skillFiles) {
    try {
      const skill = parseSkillFile(filePath, rootPath, source);
      repo.upsertSkill(skill);
      result.discovered++;
      if (skill.metadataQuality === "low") result.warnings++;
    } catch (err) {
      result.errors++;
    }
  }

  return result;
}

function findSkillFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          // Check for SKILL.md in this directory
          const skillFile = join(full, "SKILL.md");
          if (existsSync(skillFile)) {
            results.push(skillFile);
          } else {
            // Recurse (skip hidden dirs)
            if (!entry.startsWith(".")) {
              results.push(...findSkillFiles(full));
            }
          }
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip inaccessible dirs */ }
  return results;
}

function parseSkillFile(filePath: string, rootPath: string, source?: string): Skill {
  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const now = nowISO();

  const name = data.name ?? data.title ?? basename(dirname(filePath));
  const description = data.description ?? data.summary ?? "";
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const capabilities = Array.isArray(data.capabilities) ? data.capabilities : [];
  const deps = Array.isArray(data.dependencies) ? data.dependencies : [];
  const compatible = Array.isArray(data.compatible_agents) ? data.compatible_agents : [];

  const metadataQuality = name && description ? "complete" : "low";
  const status = content.trim() ? "active" as const : "incomplete_metadata" as const;

  return {
    id: generateId("skill"),
    name,
    description: description || undefined,
    source,
    rootPath,
    skillFilePath: filePath,
    relativePath: relative(rootPath, filePath),
    version: data.version ?? undefined,
    risk: data.risk ?? undefined,
    tags,
    capabilities,
    dependencies: deps,
    compatibleAgents: compatible,
    status,
    metadataQuality,
    lastScannedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

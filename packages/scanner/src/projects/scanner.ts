import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generateId, nowISO } from "@agent-hub/shared";
import type { Project } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

export interface ProjectScanResult {
  discovered: number;
  errors: number;
}

/** Detect Git repos and register projects */
export function scanWorkspaceRoot(workspacePath: string): ProjectScanResult {
  const result: ProjectScanResult = { discovered: 0, errors: 0 };

  if (!existsSync(workspacePath)) {
    result.errors++;
    return result;
  }

  // Check if workspacePath itself is a git repo
  const gitDir = join(workspacePath, ".git");
  if (existsSync(gitDir)) {
    try {
      const project = registerProject(workspacePath);
      repo.upsertProject(project);
      result.discovered++;
    } catch {
      result.errors++;
    }
  }

  return result;
}

function registerProject(rootPath: string): Project {
  const now = nowISO();
  const name = rootPath.split(/[/\\]/).pop() ?? "unknown";
  let techStack: string[] = [];
  let description = "";

  // Try reading package.json for metadata
  const pkgPath = join(rootPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      description = pkg.description ?? "";
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      techStack = Object.keys(deps);
    } catch { /* ignore */ }
  }

  return {
    id: generateId("project"),
    name,
    rootPath,
    description: description || undefined,
    techStack,
    agents: [],
    status: "active",
    lastScannedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

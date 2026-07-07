import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { generateId, nowISO } from "@agent-hub/shared";
import type { Project, ContextItem, ContextType } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

export interface ContextScanResult {
  discovered: number;
  errors: number;
}

/**
 * Context file patterns to scan.
 * Key: file name or pattern -> ContextType
 */
const CONTEXT_FILE_MAP: Record<string, ContextType> = {
  "CONTEXT.md": "project_brief",
  "PROJECT_BRIEF.md": "project_brief",
  "README.md": "project_brief",
  "ARCHITECTURE.md": "decision",
  "DECISIONS.md": "decision",
  "CONSTRAINTS.md": "constraint",
  "CONVENTIONS.md": "preference",
  "STYLE_GUIDE.md": "preference",
  "TODO.md": "todo",
  "ROADMAP.md": "todo",
  "HANDOFF.md": "handoff",
  "CLAUDE.md": "instruction",
  "AGENTS.md": "instruction",
  ".cursorrules": "instruction",
};

/** Additional directories to scan for context files */
const CONTEXT_DIRS = [".agent-context", ".cursor", ".claude", ".github"];

/** Max file size for context files (1 MB) */
const MAX_CONTEXT_SIZE = 1 * 1024 * 1024;

/**
 * Scan a single project for context files.
 */
export function scanProjectContext(project: Project): ContextScanResult {
  const result: ContextScanResult = { discovered: 0, errors: 0 };

  const rootPath = project.rootPath;
  if (!rootPath || !existsSync(rootPath)) {
    result.errors++;
    return result;
  }

  // 1. Scan known context files in the project root
  scanRootContextFiles(rootPath, project, result);

  // 2. Scan context directories
  for (const dirName of CONTEXT_DIRS) {
    const dirPath = join(rootPath, dirName);
    if (existsSync(dirPath) && statSync(dirPath, { throwIfNoEntry: false })?.isDirectory()) {
      scanContextDirectory(dirPath, project, result);
    }
  }

  return result;
}

function scanRootContextFiles(
  rootPath: string,
  project: Project,
  result: ContextScanResult,
): void {
  for (const [fileName, contextType] of Object.entries(CONTEXT_FILE_MAP)) {
    const filePath = join(rootPath, fileName);
    if (!existsSync(filePath)) continue;

    // Skip README.md if it's the ONLY context — too generic unless explicitly asked
    // (still include it but mark confidence lower)
    const isGenericReadme = fileName === "README.md";

    try {
      const st = statSync(filePath);
      if (!st.isFile() || st.size > MAX_CONTEXT_SIZE) continue;

      const body = readFileSync(filePath, "utf-8");
      if (body.trim().length === 0) continue;

      const item = buildContextItem(
        project,
        contextType,
        fileName.replace(/\.md$/, ""),
        body,
        isGenericReadme ? 0.5 : 0.9,
      );
      repo.upsertContext(item);
      result.discovered++;
    } catch {
      result.errors++;
    }
  }
}

function scanContextDirectory(
  dirPath: string,
  project: Project,
  result: ContextScanResult,
): void {
  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    let st;
    try {
      st = statSync(fullPath);
    } catch {
      continue;
    }

    if (st.isDirectory()) continue;
    if (!st.isFile()) continue;

    const ext = extname(entry).toLowerCase();
    if (ext !== ".md" && ext !== ".txt" && ext !== ".yaml" && ext !== ".yml") continue;
    if (st.size > MAX_CONTEXT_SIZE) continue;

    try {
      const body = readFileSync(fullPath, "utf-8");
      if (body.trim().length === 0) continue;

      const contextType = guessContextType(entry, body);
      const title = entry.replace(/\.(md|txt|ya?ml)$/, "").replace(/[-_]/g, " ");

      const item = buildContextItem(project, contextType, title, body, 0.7);
      repo.upsertContext(item);
      result.discovered++;
    } catch {
      result.errors++;
    }
  }
}

function guessContextType(fileName: string, _body: string): ContextType {
  const lower = fileName.toLowerCase();
  if (lower.includes("brief") || lower.includes("context") || lower.includes("summary")) return "project_brief";
  if (lower.includes("decision") || lower.includes("adr")) return "decision";
  if (lower.includes("constraint") || lower.includes("rule")) return "constraint";
  if (lower.includes("convention") || lower.includes("style") || lower.includes("preference")) return "preference";
  if (lower.includes("todo") || lower.includes("task") || lower.includes("plan")) return "todo";
  if (lower.includes("handoff")) return "handoff";
  if (lower.includes("finding") || lower.includes("note")) return "finding";
  if (lower.includes("instruction") || lower.includes("guide") || lower.includes("prompt")) return "instruction";
  // Default for unrecognized context files
  return "finding";
}

function buildContextItem(
  project: Project,
  type: ContextType,
  title: string,
  body: string,
  confidence: number,
): ContextItem {
  const now = nowISO();
  return {
    id: generateId("ctx"),
    projectId: project.id,
    type,
    title,
    body: body.length > 8000 ? body.substring(0, 8000) + "\n... (truncated)" : body,
    confidence,
    visibility: "project",
    tags: [project.name, type],
    createdAt: now,
    updatedAt: now,
  };
}

/** Scan all registered projects for context files */
export function scanAllProjectContext(): ContextScanResult {
  const total: ContextScanResult = { discovered: 0, errors: 0 };
  const projects = repo.listProjects(100, 0);

  for (const project of projects) {
    const r = scanProjectContext(project);
    total.discovered += r.discovered;
    total.errors += r.errors;
  }

  return total;
}

import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, extname, basename } from "node:path";
import { generateId, nowISO } from "@agent-hub/shared";
import type { Artifact, Project } from "@agent-hub/shared";
import { repo } from "@agent-hub/core";

export interface ArtifactScanResult {
  discovered: number;
  errors: number;
}

/** File extensions we treat as artifacts, mapped to artifactType */
const ARTIFACT_PATTERNS: Record<string, string> = {
  // Images
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
  ".svg": "image", ".webp": "image", ".bmp": "image", ".ico": "image",
  // Documents & Reports
  ".pdf": "document", ".docx": "document", ".pptx": "document",
  ".xlsx": "spreadsheet", ".csv": "data",
  // Archives
  ".zip": "archive", ".tar.gz": "archive", ".gz": "archive",
  // Data / Config
  ".json": "data", ".yaml": "config", ".yml": "config", ".toml": "config",
  // Output directories to scan
  ".html": "web-page",
};

/** File size threshold — skip files larger than 50 MB */
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** Directories to skip during recursive scan */
const SKIP_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv",
  ".tox", ".mypy_cache", ".pytest_cache", ".next", ".nuxt",
  "dist", "build", ".cache", "coverage", ".nyc_output",
]);

/** Directory names that are likely artifact output dirs (scan only top-level, not recursive) */
const ARTIFACT_DIRS = new Set(["outputs", "public", "static", "assets", "out", "exports"]);

/**
 * Scan a single project for artifact files.
 * Looks in common artifact output directories and the project root.
 */
export function scanProjectArtifacts(project: Project): ArtifactScanResult {
  const result: ArtifactScanResult = { discovered: 0, errors: 0 };

  const rootPath = project.rootPath;
  if (!rootPath || !existsSync(rootPath)) {
    result.errors++;
    return result;
  }

  // Scan project root for standalone artifacts (reports, exported data)
  scanDirectoryForArtifacts(rootPath, project, result, /* shallow */ true);

  // Scan common artifact output directories
  for (const dirName of ARTIFACT_DIRS) {
    const dirPath = join(rootPath, dirName);
    if (existsSync(dirPath) && statSync(dirPath, { throwIfNoEntry: false })?.isDirectory()) {
      scanDirectoryForArtifacts(dirPath, project, result, /* shallow */ true);
    }
  }

  return result;
}

function scanDirectoryForArtifacts(
  dirPath: string,
  project: Project,
  result: ArtifactScanResult,
  shallow: boolean,
): void {
  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    result.errors++;
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);

    if (SKIP_DIRS.has(entry)) continue;

    let st;
    try {
      st = statSync(fullPath);
    } catch {
      continue;
    }

    if (st.isDirectory()) {
      if (!shallow) {
        scanDirectoryForArtifacts(fullPath, project, result, false);
      }
      continue;
    }

    if (!st.isFile()) continue;
    if (st.size > MAX_SIZE_BYTES) continue;

    const ext = extname(entry).toLowerCase();
    const artifactType = ARTIFACT_PATTERNS[ext];
    if (!artifactType) continue;

    // For data/config files in root, skip very common ones (package.json, tsconfig, etc.)
    if (shallow && (artifactType === "config" || artifactType === "data")) {
      if (!["outputs", "public", "static", "assets"].some(d => fullPath.includes(`/${d}/`))) {
        // Only pick up data files in dedicated artifact directories
        continue;
      }
    }

    try {
      const artifact = createArtifact(fullPath, project, artifactType, st.size);
      repo.upsertArtifact(artifact);
      result.discovered++;
    } catch {
      result.errors++;
    }
  }
}

function createArtifact(
  filePath: string,
  project: Project,
  artifactType: string,
  sizeBytes: number,
): Artifact {
  const name = basename(filePath);
  const now = nowISO();

  // Compute a quick hash for dedup (first 64KB + last 64KB for larger files)
  let hash: string | undefined;
  try {
    const fd = readFileSync(filePath);
    const hasher = createHash("sha256");
    if (fd.length <= 128 * 1024) {
      hasher.update(fd);
    } else {
      hasher.update(fd.subarray(0, 65536));
      hasher.update(fd.subarray(fd.length - 65536));
    }
    hash = hasher.digest("hex").substring(0, 16);
  } catch {
    // hash is optional
  }

  // Guess mime type from extension
  const mimeMap: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
    ".bmp": "image/bmp", ".ico": "image/x-icon",
    ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv", ".json": "application/json",
    ".yaml": "application/x-yaml", ".yml": "application/x-yaml",
    ".toml": "application/toml", ".html": "text/html",
    ".zip": "application/zip", ".gz": "application/gzip",
  };
  const ext = extname(filePath).toLowerCase();
  const mimeType = mimeMap[ext] ?? "application/octet-stream";

  return {
    id: generateId("artifact"),
    projectId: project.id,
    name,
    artifactType,
    path: filePath,
    mimeType,
    sizeBytes,
    hash,
    trustStatus: "draft",
    tags: [project.name],
    createdAt: now,
    updatedAt: now,
  };
}

/** Scan all registered projects for artifacts */
export function scanAllProjectArtifacts(): ArtifactScanResult {
  const total: ArtifactScanResult = { discovered: 0, errors: 0 };
  const projects = repo.listProjects(100, 0);

  for (const project of projects) {
    const r = scanProjectArtifacts(project);
    total.discovered += r.discovered;
    total.errors += r.errors;
  }

  return total;
}

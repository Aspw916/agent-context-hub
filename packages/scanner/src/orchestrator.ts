import { generateId, nowISO } from "@agent-hub/shared";
import type { ScanRun } from "@agent-hub/shared";
import { repo, sse, getDb } from "@agent-hub/core";
import { detectAgents } from "./agents/detector.js";
import { scanSkillRoot } from "./skills/scanner.js";
import { scanMcpConfig } from "./mcp/scanner.js";
import { scanExpertRoot } from "./experts/scanner.js";
import { scanWorkspaceRoot } from "./projects/scanner.js";
import { scanAllProjectArtifacts } from "./artifacts/scanner.js";
import { scanAllProjectContext } from "./context/scanner.js";

export async function runFullScan(): Promise<ScanRun> {
  const run: ScanRun = {
    id: generateId("scan"),
    scanner: "full",
    status: "running",
    startedAt: nowISO(),
    discoveredCount: 0,
    warningCount: 0,
    errorCount: 0,
    messages: [],
  };
  repo.insertScanRun(run);

  // 1. Detect agents first
  sse.scanProgress("agents", 0, 5);
  const agents = detectAgents();
  run.discoveredCount += agents.detected;
  run.messages.push(`Agents detected: ${agents.detected}`);
  sse.scanComplete("agents", agents.detected, 0);

  // 2. Scan skills from all agent roots
  const allAgents = repo.listAgents(100, 0);
  for (const agent of allAgents) {
    for (const root of agent.skillRoots) {
      sse.scanProgress("skills", 0, 1);
      const r = scanSkillRoot(root, agent.name);
      run.discoveredCount += r.discovered;
      run.warningCount += r.warnings;
      run.errorCount += r.errors;
      sse.scanComplete("skills", r.discovered, r.warnings);
    }
  }

  // 3. Scan MCP configs
  for (const agent of allAgents) {
    for (const configPath of agent.mcpConfigPaths) {
      sse.scanProgress("mcp", 0, 1);
      const r = scanMcpConfig(configPath, agent.name);
      run.discoveredCount += r.discovered;
      run.errorCount += r.errors;
      sse.scanComplete("mcp", r.discovered, r.errors);
    }
  }

  // 4. Scan experts
  for (const agent of allAgents) {
    if (agent.expertRoots) {
      for (const root of agent.expertRoots) {
        sse.scanProgress("experts", 0, 1);
        const r = scanExpertRoot(root, agent.name);
        run.discoveredCount += r.discovered;
        run.errorCount += r.errors;
        sse.scanComplete("experts", r.discovered, r.errors);
      }
    }
  }

  // 5. Scan projects (current working directory)
  sse.scanProgress("projects", 0, 1);
  const pr = scanWorkspaceRoot(process.cwd());
  run.discoveredCount += pr.discovered;
  run.errorCount += pr.errors;
  sse.scanComplete("projects", pr.discovered, pr.errors);

  // 6. Scan context files from all projects
  sse.scanProgress("context", 0, 1);
  const ctx = scanAllProjectContext();
  run.discoveredCount += ctx.discovered;
  run.errorCount += ctx.errors;
  sse.scanComplete("context", ctx.discovered, ctx.errors);

  // 7. Scan artifact files from all projects
  sse.scanProgress("artifacts", 0, 1);
  const art = scanAllProjectArtifacts();
  run.discoveredCount += art.discovered;
  run.errorCount += art.errors;
  sse.scanComplete("artifacts", art.discovered, art.errors);

  // Update run status
  run.status = "completed";
  run.finishedAt = nowISO();
  getDb().prepare(`
    UPDATE scan_runs SET status = ?, finished_at = ?, discovered_count = ?,
    warning_count = ?, error_count = ?, messages_json = ?
    WHERE id = ?
  `).run(run.status, run.finishedAt, run.discoveredCount, run.warningCount,
    run.errorCount, JSON.stringify(run.messages), run.id);

  return run;
}

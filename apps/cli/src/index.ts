import { defineCommand, runMain } from "citty";
import { initDb, repo } from "@agent-hub/core";
import { runFullScan, detectAgents } from "@agent-hub/scanner";
import { defaultDataDir } from "@agent-hub/shared";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const dataDir = process.env.AGENT_HUB_HOME ?? defaultDataDir();
const rootDir = resolve(import.meta.dirname ?? ".", "../../..");

const main = defineCommand({
  meta: {
    name: "agent-hub",
    description: "Agent Context Hub CLI — local-first agent asset management",
  },
  subCommands: {
    init: defineCommand({
      meta: { name: "init", description: "Initialize local data directory and database" },
      async run() {
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true, mode: 0o700 });
          console.log(`Created data directory: ${dataDir}`);
        }
        initDb(dataDir);
        console.log(`Initialized database at ${dataDir}/hub.db`);
        console.log("Run 'agent-hub scan' to discover local assets.");
      },
    }),

    scan: defineCommand({
      meta: { name: "scan", description: "Scan local agents, skills, MCP configs, experts, and projects" },
      args: {
        watch: { type: "boolean", description: "Watch for file changes (incremental scan)", default: false },
      },
      async run({ args }) {
        initDb(dataDir);
        console.log("Detecting agents...");
        const agents = detectAgents();
        console.log(`  Found ${agents.detected} agent(s)`);

        console.log("Scanning assets...");
        const run = await runFullScan();
        console.log(`  Discovered: ${run.discoveredCount}`);
        console.log(`  Warnings:   ${run.warningCount}`);
        console.log(`  Errors:     ${run.errorCount}`);

        if (args.watch) {
          console.log("Watching for changes... (Ctrl+C to stop)");
          const { watch } = await import("node:fs");
          // Watch all agent config directories for changes
          const watchers: ReturnType<typeof watch>[] = [];
          for (const agent of repo.listAgents(50, 0)) {
            for (const path of [...agent.configPaths, ...agent.skillRoots, ...agent.mcpConfigPaths, ...agent.expertRoots]) {
              if (existsSync(path)) {
                watchers.push(watch(path, { recursive: true }, () => runFullScan()));
              }
            }
          }
          await new Promise(() => {}); // Wait indefinitely
        }

        console.log("Scan complete. Open http://localhost:3737 to view results.");
      },
    }),

    serve: defineCommand({
      meta: { name: "serve", description: "Start HTTP API server + Web Console (localhost:3737)" },
      async run() {
        initDb(dataDir);
        const serverPath = resolve(rootDir, "apps/server/dist/index.js");
        if (!existsSync(serverPath)) {
          console.error("Server not built. Run: npm run build");
          process.exit(1);
        }
        console.log("Starting Agent Context Hub server...");
        spawn(process.execPath, [serverPath], { stdio: "inherit", env: { ...process.env, AGENT_HUB_HOME: dataDir } });
      },
    }),

    "serve-mcp": defineCommand({
      meta: { name: "serve-mcp", description: "Start MCP Server over stdio" },
      async run() {
        initDb(dataDir);
        const mcpPath = resolve(rootDir, "packages/mcp-server/dist/index.js");
        if (!existsSync(mcpPath)) {
          console.error("MCP server not built. Run: npm run build");
          process.exit(1);
        }
        spawn(process.execPath, [mcpPath], { stdio: "inherit", env: { ...process.env, AGENT_HUB_HOME: dataDir } });
      },
    }),

    export: defineCommand({
      meta: { name: "export", description: "Export hub data as JSON backup" },
      args: {
        output: { type: "string", description: "Output directory for export", default: resolve(dataDir, "exports") },
      },
      async run({ args }) {
        initDb(dataDir);
        const data = repo.exportAll();
        const outDir = String(args.output);
        mkdirSync(outDir, { recursive: true, mode: 0o700 });
        const outFile = resolve(outDir, `hub-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
        writeFileSync(outFile, JSON.stringify(data, null, 2));
        console.log(`Exported to: ${outFile}`);
        console.log(`  Agents:    ${data.agents.length}`);
        console.log(`  Skills:    ${data.skills.length}`);
        console.log(`  MCP:       ${data.mcpServers.length}`);
        console.log(`  Experts:   ${data.experts.length}`);
        console.log(`  Projects:  ${data.projects.length}`);
        console.log(`  Context:   ${data.contextItems.length}`);
        console.log(`  Artifacts: ${data.artifacts.length}`);
        console.log(`  Events:    ${data.events.length}`);
      },
    }),

    import: defineCommand({
      meta: { name: "import", description: "Import hub data from JSON backup" },
      args: {
        input: { type: "string", description: "Input export file path", required: true },
      },
      async run({ args }) {
        initDb(dataDir);
        const inputPath = String(args.input);
        if (!existsSync(inputPath)) {
          console.error(`File not found: ${inputPath}`);
          process.exit(1);
        }
        const raw = readFileSync(inputPath, "utf-8");
        const data = JSON.parse(raw);
        const result = repo.importAll(data);
        console.log("Import complete:");
        for (const [type, count] of Object.entries(result.imported)) {
          console.log(`  ${type}: ${count}`);
        }
      },
    }),

    status: defineCommand({
      meta: { name: "status", description: "Show local hub state" },
      async run() {
        initDb(dataDir);
        console.log(`Data directory: ${dataDir}`);
        console.log(`Agents:    ${repo.countAgents()}`);
        console.log(`Skills:    ${repo.countSkills()}`);
        console.log(`MCP:       ${repo.countMcpServers()}`);
        console.log(`Experts:   ${repo.countExperts()}`);
        console.log(`Projects:  ${repo.countProjects()}`);
        console.log(`Context:   ${repo.countContext()}`);
        console.log(`Artifacts: ${repo.countArtifacts()}`);
        console.log(`Events:    ${repo.countEvents()}`);
      },
    }),
  },
});

runMain(main);

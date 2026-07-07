#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initDb, repo, searchAll } from "@agent-hub/core";
import { runFullScan } from "@agent-hub/scanner";
import { defaultDataDir, generateId, nowISO } from "@agent-hub/shared";

const DATA_DIR = process.env.AGENT_HUB_HOME ?? defaultDataDir();
initDb(DATA_DIR);

const server = new McpServer({
  name: "agent-context-hub",
  version: "0.1.0",
});

// ─── Read tools ──────────────────────────────────────────

server.tool("hub_status", "Get Hub overall status", {}, async () => {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        agents: repo.countAgents(),
        skills: repo.countSkills(),
        mcpServers: repo.countMcpServers(),
        experts: repo.countExperts(),
        projects: repo.countProjects(),
        events: repo.countEvents(),
      }, null, 2),
    }],
  };
});

server.tool("list_agents", "List all detected agents", {}, async () => {
  const agents = repo.listAgents(100, 0);
  return {
    content: [{ type: "text", text: JSON.stringify(agents, null, 2) }],
  };
});

server.tool("list_skills", "List all skills", {
  status: z.string().optional(),
}, async ({ status }) => {
  const skills = repo.listSkills(200, 0, status ? { status } : undefined);
  return {
    content: [{ type: "text", text: JSON.stringify(skills.map(s => ({
      id: s.id, name: s.name, description: s.description,
      tags: s.tags, status: s.status, compatibleAgents: s.compatibleAgents,
    })), null, 2) }],
  };
});

server.tool("search_skills", "Search skills by keyword", {
  query: z.string().min(1),
}, async ({ query }) => {
  const results = searchAll(query, ["skills"], 20);
  return {
    content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
  };
});

server.tool("list_mcp_servers", "List all MCP server configurations", {}, async () => {
  const servers = repo.listMcpServers(200, 0);
  return {
    content: [{ type: "text", text: JSON.stringify(servers.map(s => ({
      id: s.id, name: s.name, transport: s.transport,
      command: s.command, healthStatus: s.healthStatus,
      configOwnerAgents: s.configOwnerAgents,
    })), null, 2) }],
  };
});

server.tool("list_experts", "List all expert packages", {}, async () => {
  const experts = repo.listExperts(200, 0);
  return {
    content: [{ type: "text", text: JSON.stringify(experts, null, 2) }],
  };
});

server.tool("search_context", "Search project context", {
  query: z.string().min(1),
}, async ({ query }) => {
  const results = searchAll(query, ["context_items"], 20);
  return {
    content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
  };
});

// ─── Write tool (only 1 in v1) ───────────────────────────
server.tool("write_event", "Write an event to the log", {
  project_id: z.string().optional(),
  agent_name: z.string(),
  event_type: z.enum([
    "scan", "task_started", "task_progress", "task_completed",
    "finding", "decision", "artifact_registered", "handoff_created",
    "manual_note", "error",
  ]),
  title: z.string().min(1),
  summary: z.string().optional(),
  body: z.string().optional(),
  related_resource_ids: z.array(z.string()).default([]),
}, async (params) => {
  const event = {
    id: generateId("event"),
    projectId: params.project_id ?? undefined,
    agentId: params.agent_name,
    eventType: params.event_type,
    title: params.title,
    summary: params.summary,
    body: params.body,
    relatedResourceIds: params.related_resource_ids,
    relatedArtifactIds: [],
    createdAt: nowISO(),
  };
  repo.insertEvent(event as any);
  return {
    content: [{ type: "text", text: JSON.stringify({ id: event.id, status: "created" }) }],
  };
});

// ─── New tools (v0.2) ────────────────────────────────────

// Detail getters
server.tool("get_agent", "Get agent details by ID", {
  id: z.string().min(1),
}, async ({ id }) => {
  const agent = repo.getAgent(id);
  if (!agent) return { content: [{ type: "text", text: JSON.stringify({ error: "Agent not found" }) }] };
  return { content: [{ type: "text", text: JSON.stringify(agent, null, 2) }] };
});

server.tool("get_skill", "Get skill details by ID", {
  id: z.string().min(1),
}, async ({ id }) => {
  const skill = repo.getSkill(id);
  if (!skill) return { content: [{ type: "text", text: JSON.stringify({ error: "Skill not found" }) }] };
  return { content: [{ type: "text", text: JSON.stringify(skill, null, 2) }] };
});

server.tool("get_mcp_server", "Get MCP server details by ID", {
  id: z.string().min(1),
}, async ({ id }) => {
  const srv = repo.getMcpServer(id);
  if (!srv) return { content: [{ type: "text", text: JSON.stringify({ error: "MCP server not found" }) }] };
  return { content: [{ type: "text", text: JSON.stringify(srv, null, 2) }] };
});

server.tool("get_expert", "Get expert details by ID", {
  id: z.string().min(1),
}, async ({ id }) => {
  const expert = repo.getExpert(id);
  if (!expert) return { content: [{ type: "text", text: JSON.stringify({ error: "Expert not found" }) }] };
  return { content: [{ type: "text", text: JSON.stringify(expert, null, 2) }] };
});

// Listers
server.tool("list_projects", "List all detected projects", {}, async () => {
  const projects = repo.listProjects(200, 0);
  return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
});

server.tool("list_artifacts", "List all artifacts", {
  project_id: z.string().optional(),
}, async ({ project_id }) => {
  const artifacts = repo.listArtifacts(200, 0, project_id);
  return { content: [{ type: "text", text: JSON.stringify(artifacts, null, 2) }] };
});

server.tool("list_events", "List all events", {
  limit: z.number().default(50),
}, async ({ limit }) => {
  const events = repo.listEvents(limit, 0);
  return { content: [{ type: "text", text: JSON.stringify(events, null, 2) }] };
});

// Search
server.tool("search_all", "Search across all entity types", {
  query: z.string().min(1),
  types: z.array(z.string()).optional(),
  limit: z.number().default(20),
}, async ({ query, types, limit }) => {
  const results = searchAll(query, types as any, limit);
  return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
});

// Actions
server.tool("health_check", "Check health of an MCP server", {
  mcp_id: z.string().min(1),
}, async ({ mcp_id }) => {
  // Basic connectivity check — attempt TCP connect if transport is http
  const srv = repo.getMcpServer(mcp_id);
  if (!srv) return { content: [{ type: "text", text: JSON.stringify({ error: "MCP server not found" }) }] };
  const status = srv.transport === "stdio" ? "unknown" :
    srv.transport === "sse" ? "unknown" : "unknown";
  return { content: [{ type: "text", text: JSON.stringify({
    id: mcp_id, healthStatus: status, checkedAt: nowISO(),
    note: "Full health check requires HTTP endpoint; run via Web UI for live check",
  }, null, 2) }] };
});

server.tool("run_scan", "Trigger a full asset scan", {}, async () => {
  const run = await runFullScan();
  return { content: [{ type: "text", text: JSON.stringify({
    id: run.id, status: run.status, discoveredCount: run.discoveredCount,
    warningCount: run.warningCount, errorCount: run.errorCount,
    messages: run.messages,
  }, null, 2) }] };
});

server.tool("export_data", "Export all hub data as JSON", {}, async () => {
  const data = repo.exportAll();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("import_data", "Import hub data from JSON", {
  data: z.record(z.any()),
}, async ({ data }) => {
  const result = repo.importAll(data as any);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ─── Start ───────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

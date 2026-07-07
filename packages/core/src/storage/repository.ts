import { getDb } from "./db.js";
import type { Agent, Skill, McpServer, Expert, Project, ContextItem, Artifact, AgentEvent, ScanRun } from "@agent-hub/shared";
import { nowISO } from "@agent-hub/shared";

// ─── Generic helpers ─────────────────────────────────────

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// Snake → camelCase field mapping helper
function mapRow<T>(row: any, mappings: Record<string, string>, jsonFields: string[] = []): T {
  const result: any = {};
  for (const [dbCol, jsField] of Object.entries(mappings)) {
    const val = row[dbCol];
    result[jsField] = jsonFields.includes(dbCol) ? parseJson(val, []) : val;
  }
  return result as T;
}

function all<T>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

function one<T>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

function run(sql: string, ...params: unknown[]): void {
  getDb().prepare(sql).run(...params);
}

// ─── Agents ──────────────────────────────────────────────

const AGENT_MAP = {
  id: "id", name: "name", type: "type", vendor: "vendor", version: "version",
  status: "status", notes: "notes",
  config_paths_json: "configPaths", skill_roots_json: "skillRoots",
  mcp_config_paths_json: "mcpConfigPaths", expert_roots_json: "expertRoots",
  last_seen_at: "lastSeenAt", created_at: "createdAt", updated_at: "updatedAt",
};
const AGENT_JSON = ["config_paths_json", "skill_roots_json", "mcp_config_paths_json", "expert_roots_json"];

export function listAgents(limit = 50, offset = 0): Agent[] {
  const rows = all<any>("SELECT * FROM agents ORDER BY updated_at DESC LIMIT ? OFFSET ?", limit, offset);
  return rows.map(r => mapRow<Agent>(r, AGENT_MAP, AGENT_JSON));
}

export function getAgent(id: string): Agent | undefined {
  const row = one<any>("SELECT * FROM agents WHERE id = ?", id);
  return row ? mapRow<Agent>(row, AGENT_MAP, AGENT_JSON) : undefined;
}

export function countAgents(): number {
  return (getDb().prepare("SELECT COUNT(*) as c FROM agents").get() as { c: number }).c;
}

// ─── Skills ──────────────────────────────────────────────

const SKILL_MAP = {
  id: "id", name: "name", description: "description", source: "source",
  root_path: "rootPath", skill_file_path: "skillFilePath", relative_path: "relativePath",
  version: "version", risk: "risk", status: "status", metadata_quality: "metadataQuality",
  tags_json: "tags", capabilities_json: "capabilities",
  dependencies_json: "dependencies", compatible_agents_json: "compatibleAgents",
  last_scanned_at: "lastScannedAt", created_at: "createdAt", updated_at: "updatedAt",
};
const SKILL_JSON = ["tags_json", "capabilities_json", "dependencies_json", "compatible_agents_json"];

export function listSkills(limit = 50, offset = 0, filters?: { status?: string; agent?: string }): Skill[] {
  let sql = "SELECT * FROM skills WHERE 1=1";
  const params: unknown[] = [];
  if (filters?.status) { sql += " AND status = ?"; params.push(filters.status); }
  sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return all<any>(sql, ...params).map(r => mapRow<Skill>(r, SKILL_MAP, SKILL_JSON));
}

export function getSkill(id: string): Skill | undefined {
  const row = one<any>("SELECT * FROM skills WHERE id = ?", id);
  return row ? mapRow<Skill>(row, SKILL_MAP, SKILL_JSON) : undefined;
}

export function countSkills(agentName?: string): number {
  if (agentName) {
    return (getDb().prepare(
      "SELECT COUNT(*) as c FROM skills WHERE source = ? OR compatible_agents_json LIKE ?"
    ).get(agentName, `%"${agentName}"%`) as { c: number }).c;
  }
  return (getDb().prepare("SELECT COUNT(*) as c FROM skills").get() as { c: number }).c;
}

// ─── MCP Servers ─────────────────────────────────────────

const MCP_MAP = {
  id: "id", name: "name", transport: "transport", command: "command",
  url: "url",
  args_json: "args", env_var_names_json: "envVarNames",
  config_path: "configPath", config_owner_agents_json: "configOwnerAgents",
  capabilities_json: "capabilities", tools_json: "tools",
  resources_json: "resources", prompts_json: "prompts",
  health_status: "healthStatus", last_health_check_at: "lastHealthCheckAt",
  status: "status", created_at: "createdAt", updated_at: "updatedAt",
};
const MCP_JSON = ["args_json", "env_var_names_json", "config_owner_agents_json", "capabilities_json", "tools_json", "resources_json", "prompts_json"];

export function listMcpServers(limit = 50, offset = 0): McpServer[] {
  return all<any>("SELECT * FROM mcp_servers ORDER BY updated_at DESC LIMIT ? OFFSET ?", limit, offset)
    .map(r => mapRow<McpServer>(r, MCP_MAP, MCP_JSON));
}

export function getMcpServer(id: string): McpServer | undefined {
  const row = one<any>("SELECT * FROM mcp_servers WHERE id = ?", id);
  return row ? mapRow<McpServer>(row, MCP_MAP, MCP_JSON) : undefined;
}

export function countMcpServers(agentName?: string): number {
  if (agentName) {
    return (getDb().prepare(
      "SELECT COUNT(*) as c FROM mcp_servers WHERE config_owner_agents_json LIKE ?"
    ).get(`%"${agentName}"%`) as { c: number }).c;
  }
  return (getDb().prepare("SELECT COUNT(*) as c FROM mcp_servers").get() as { c: number }).c;
}

// ─── Experts ─────────────────────────────────────────────

const EXPERT_MAP = {
  id: "id", name: "name", description: "description", source: "source",
  root_path: "rootPath", definition_file_path: "definitionFilePath", version: "version",
  capabilities_json: "capabilities", compatible_agents_json: "compatibleAgents",
  dependencies_json: "dependencies", status: "status",
  last_scanned_at: "lastScannedAt", created_at: "createdAt", updated_at: "updatedAt",
};
const EXPERT_JSON = ["capabilities_json", "compatible_agents_json", "dependencies_json"];

export function listExperts(limit = 50, offset = 0): Expert[] {
  return all<any>("SELECT * FROM experts ORDER BY updated_at DESC LIMIT ? OFFSET ?", limit, offset)
    .map(r => mapRow<Expert>(r, EXPERT_MAP, EXPERT_JSON));
}

export function getExpert(id: string): Expert | undefined {
  const row = one<any>("SELECT * FROM experts WHERE id = ?", id);
  return row ? mapRow<Expert>(row, EXPERT_MAP, EXPERT_JSON) : undefined;
}

export function countExperts(agentName?: string): number {
  if (agentName) {
    return (getDb().prepare(
      "SELECT COUNT(*) as c FROM experts WHERE source = ? OR compatible_agents_json LIKE ?"
    ).get(agentName, `%"${agentName}"%`) as { c: number }).c;
  }
  return (getDb().prepare("SELECT COUNT(*) as c FROM experts").get() as { c: number }).c;
}

// ─── Projects ────────────────────────────────────────────

const PROJECT_MAP = {
  id: "id", name: "name", root_path: "rootPath", description: "description",
  tech_stack_json: "techStack", agents_json: "agents", active_context: "activeContext",
  status: "status", last_scanned_at: "lastScannedAt",
  created_at: "createdAt", updated_at: "updatedAt",
};
const PROJECT_JSON = ["tech_stack_json", "agents_json"];

export function listProjects(limit = 50, offset = 0): Project[] {
  return all<any>("SELECT * FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?", limit, offset)
    .map(r => mapRow<Project>(r, PROJECT_MAP, PROJECT_JSON));
}

export function countProjects(): number {
  return (getDb().prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
}

// ─── Upsert helpers ──────────────────────────────────────

export function upsertSkill(skill: Skill): void {
  run(`
    INSERT INTO skills (id, name, description, source, root_path, skill_file_path, relative_path,
      version, risk, tags_json, capabilities_json, dependencies_json, compatible_agents_json,
      status, metadata_quality, last_scanned_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, description=excluded.description, source=excluded.source,
      root_path=excluded.root_path, skill_file_path=excluded.skill_file_path,
      version=excluded.version, risk=excluded.risk, tags_json=excluded.tags_json,
      capabilities_json=excluded.capabilities_json, dependencies_json=excluded.dependencies_json,
      compatible_agents_json=excluded.compatible_agents_json, status=excluded.status,
      metadata_quality=excluded.metadata_quality, last_scanned_at=excluded.last_scanned_at,
      updated_at=excluded.updated_at
  `,
    skill.id, skill.name, skill.description ?? null, skill.source ?? null,
    skill.rootPath, skill.skillFilePath, skill.relativePath ?? null,
    skill.version ?? null, skill.risk ?? null, JSON.stringify(skill.tags),
    JSON.stringify(skill.capabilities), JSON.stringify(skill.dependencies),
    JSON.stringify(skill.compatibleAgents), skill.status, skill.metadataQuality ?? null,
    skill.lastScannedAt ?? null, skill.createdAt, skill.updatedAt
  );
}

export function upsertMcpServer(mcp: McpServer): void {
  run(`
    INSERT INTO mcp_servers (id, name, transport, command, url, args_json, env_var_names_json,
      config_path, config_owner_agents_json, capabilities_json, tools_json, resources_json,
      prompts_json, health_status, last_health_check_at, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, transport=excluded.transport, command=excluded.command,
      url=excluded.url,
      args_json=excluded.args_json, env_var_names_json=excluded.env_var_names_json,
      config_path=excluded.config_path, config_owner_agents_json=excluded.config_owner_agents_json,
      capabilities_json=excluded.capabilities_json, tools_json=excluded.tools_json,
      resources_json=excluded.resources_json, prompts_json=excluded.prompts_json,
      health_status=excluded.health_status, last_health_check_at=excluded.last_health_check_at,
      status=excluded.status, updated_at=excluded.updated_at
  `,
    mcp.id, mcp.name, mcp.transport, mcp.command ?? null, mcp.url ?? null, JSON.stringify(mcp.args),
    JSON.stringify(mcp.envVarNames), mcp.configPath ?? null,
    JSON.stringify(mcp.configOwnerAgents), JSON.stringify(mcp.capabilities),
    JSON.stringify(mcp.tools), JSON.stringify(mcp.resources), JSON.stringify(mcp.prompts),
    mcp.healthStatus, mcp.lastHealthCheckAt ?? null, mcp.status, mcp.createdAt, mcp.updatedAt
  );
}

export function upsertExpert(expert: Expert): void {
  run(`
    INSERT INTO experts (id, name, description, source, root_path, definition_file_path,
      version, capabilities_json, compatible_agents_json, dependencies_json,
      status, last_scanned_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, description=excluded.description, source=excluded.source,
      root_path=excluded.root_path, definition_file_path=excluded.definition_file_path,
      version=excluded.version, capabilities_json=excluded.capabilities_json,
      compatible_agents_json=excluded.compatible_agents_json, dependencies_json=excluded.dependencies_json,
      status=excluded.status, last_scanned_at=excluded.last_scanned_at, updated_at=excluded.updated_at
  `,
    expert.id, expert.name, expert.description ?? null, expert.source ?? null,
    expert.rootPath, expert.definitionFilePath, expert.version ?? null,
    JSON.stringify(expert.capabilities), JSON.stringify(expert.compatibleAgents),
    JSON.stringify(expert.dependencies), expert.status, expert.lastScannedAt ?? null,
    expert.createdAt, expert.updatedAt
  );
}

export function upsertAgent(agent: Agent): void {
  run(`
    INSERT INTO agents (id, name, type, vendor, version, config_paths_json, skill_roots_json,
      mcp_config_paths_json, expert_roots_json, status, notes, last_seen_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, type=excluded.type, vendor=excluded.vendor, version=excluded.version,
      config_paths_json=excluded.config_paths_json, skill_roots_json=excluded.skill_roots_json,
      mcp_config_paths_json=excluded.mcp_config_paths_json, expert_roots_json=excluded.expert_roots_json,
      status=excluded.status, notes=excluded.notes, last_seen_at=excluded.last_seen_at,
      updated_at=excluded.updated_at
  `,
    agent.id, agent.name, agent.type, agent.vendor ?? null, agent.version ?? null,
    JSON.stringify(agent.configPaths), JSON.stringify(agent.skillRoots),
    JSON.stringify(agent.mcpConfigPaths), JSON.stringify(agent.expertRoots),
    agent.status, agent.notes ?? null, agent.lastSeenAt ?? null,
    agent.createdAt, agent.updatedAt
  );
}

export function upsertProject(project: Project): void {
  run(`
    INSERT INTO projects (id, name, root_path, description, tech_stack_json, agents_json,
      active_context, status, last_scanned_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, root_path=excluded.root_path, description=excluded.description,
      tech_stack_json=excluded.tech_stack_json, agents_json=excluded.agents_json,
      active_context=excluded.active_context, status=excluded.status,
      last_scanned_at=excluded.last_scanned_at, updated_at=excluded.updated_at
  `,
    project.id, project.name, project.rootPath ?? null, project.description ?? null,
    JSON.stringify(project.techStack), JSON.stringify(project.agents),
    project.activeContext ?? null, project.status, project.lastScannedAt ?? null,
    project.createdAt, project.updatedAt
  );
}

export function insertEvent(event: AgentEvent): void {
  run(`
    INSERT INTO events (id, project_id, agent_id, event_type, title, summary, body,
      related_resource_ids_json, related_artifact_ids_json, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `,
    event.id, event.projectId ?? null, event.agentId ?? null,
    event.eventType, event.title, event.summary ?? null, event.body ?? null,
    JSON.stringify(event.relatedResourceIds), JSON.stringify(event.relatedArtifactIds),
    event.createdAt
  );
}

export function listEvents(limit = 50, offset = 0, projectId?: string): AgentEvent[] {
  let sql = "SELECT * FROM events";
  const params: unknown[] = [];
  if (projectId) { sql += " WHERE project_id = ?"; params.push(projectId); }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return all<any>(sql, ...params).map(row => ({
    id: row.id,
    projectId: row.project_id,
    agentId: row.agent_id,
    eventType: row.event_type,
    title: row.title,
    summary: row.summary,
    body: row.body,
    relatedResourceIds: parseJson(row.related_resource_ids_json, []),
    relatedArtifactIds: parseJson(row.related_artifact_ids_json, []),
    createdAt: row.created_at,
  }));
}

export function countEvents(): number {
  return (getDb().prepare("SELECT COUNT(*) as c FROM events").get() as { c: number }).c;
}

export function insertScanRun(scanRun: ScanRun): void {
  run(`
    INSERT INTO scan_runs (id, scanner, status, started_at, finished_at,
      discovered_count, warning_count, error_count, messages_json)
    VALUES (?,?,?,?,?,?,?,?,?)
  `,
    scanRun.id, scanRun.scanner, scanRun.status, scanRun.startedAt, scanRun.finishedAt ?? null,
    scanRun.discoveredCount, scanRun.warningCount, scanRun.errorCount, JSON.stringify(scanRun.messages)
  );
}

// ─── Patch helpers (metadata-only updates) ─────────────

export function updateSkill(id: string, patch: Partial<Skill>): boolean {
  const existing = getSkill(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertSkill(updated);
  return true;
}

export function updateMcpServer(id: string, patch: Partial<McpServer>): boolean {
  const existing = getMcpServer(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertMcpServer(updated);
  return true;
}

export function updateExpert(id: string, patch: Partial<Expert>): boolean {
  const existing = getExpert(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertExpert(updated);
  return true;
}

export function updateAgent(id: string, patch: Partial<Agent>): boolean {
  const existing = getAgent(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertAgent(updated);
  return true;
}

export function updateProject(id: string, patch: Partial<Project>): boolean {
  const existing = getProject(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertProject(updated);
  return true;
}

export function updateMcpHealthStatus(id: string, healthStatus: string): boolean {
  const existing = getMcpServer(id);
  if (!existing) return false;
  return run(
    "UPDATE mcp_servers SET health_status = ?, last_health_check_at = ?, updated_at = ? WHERE id = ?",
    healthStatus, nowISO(), nowISO(), id
  ), true;
}

// ─── Projects ────────────────────────────────────────────

export function getProject(id: string): Project | undefined {
  const row = one<any>("SELECT * FROM projects WHERE id = ?", id);
  return row ? mapRow<Project>(row, PROJECT_MAP, PROJECT_JSON) : undefined;
}

// ─── Context Items ───────────────────────────────────────

const CONTEXT_MAP: Record<string, string> = {
  id: "id", project_id: "projectId", type: "type", title: "title", body: "body",
  source_agent: "sourceAgent", source_event_id: "sourceEventId",
  confidence: "confidence", visibility: "visibility",
  tags_json: "tags", created_at: "createdAt", updated_at: "updatedAt",
};
const CONTEXT_JSON = ["tags_json"];

export function listContext(limit = 50, offset = 0, projectId?: string): ContextItem[] {
  let sql = "SELECT * FROM context_items WHERE 1=1";
  const params: unknown[] = [];
  if (projectId) { sql += " AND project_id = ?"; params.push(projectId); }
  sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return all<any>(sql, ...params).map(r => mapRow<ContextItem>(r, CONTEXT_MAP, CONTEXT_JSON));
}

export function getContext(id: string): ContextItem | undefined {
  const row = one<any>("SELECT * FROM context_items WHERE id = ?", id);
  return row ? mapRow<ContextItem>(row, CONTEXT_MAP, CONTEXT_JSON) : undefined;
}

export function countContext(projectId?: string): number {
  if (projectId) {
    return (getDb().prepare("SELECT COUNT(*) as c FROM context_items WHERE project_id = ?").get(projectId) as { c: number }).c;
  }
  return (getDb().prepare("SELECT COUNT(*) as c FROM context_items").get() as { c: number }).c;
}

export function insertContext(item: ContextItem): void {
  run(`
    INSERT INTO context_items (id, project_id, type, title, body, source_agent,
      source_event_id, confidence, visibility, tags_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `,
    item.id, item.projectId ?? null, item.type, item.title, item.body,
    item.sourceAgent ?? null, item.sourceEventId ?? null,
    item.confidence ?? null, item.visibility,
    JSON.stringify(item.tags), item.createdAt, item.updatedAt
  );
}

export function upsertContext(item: ContextItem): void {
  run(`
    INSERT INTO context_items (id, project_id, type, title, body, source_agent,
      source_event_id, confidence, visibility, tags_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      project_id=excluded.project_id, type=excluded.type, title=excluded.title,
      body=excluded.body, source_agent=excluded.source_agent,
      source_event_id=excluded.source_event_id, confidence=excluded.confidence,
      visibility=excluded.visibility, tags_json=excluded.tags_json, updated_at=excluded.updated_at
  `,
    item.id, item.projectId ?? null, item.type, item.title, item.body,
    item.sourceAgent ?? null, item.sourceEventId ?? null,
    item.confidence ?? null, item.visibility,
    JSON.stringify(item.tags), item.createdAt, item.updatedAt
  );
}

export function updateContext(id: string, patch: Partial<ContextItem>): boolean {
  const existing = getContext(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertContext(updated);
  return true;
}

// ─── Artifacts ───────────────────────────────────────────

const ARTIFACT_MAP: Record<string, string> = {
  id: "id", project_id: "projectId", name: "name", artifact_type: "artifactType",
  path: "path", uri: "uri", mime_type: "mimeType", size_bytes: "sizeBytes",
  hash: "hash", source_agent: "sourceAgent", source_event_id: "sourceEventId",
  trust_status: "trustStatus", summary: "summary",
  tags_json: "tags", created_at: "createdAt", updated_at: "updatedAt",
};
const ARTIFACT_JSON = ["tags_json"];

export function listArtifacts(limit = 50, offset = 0, projectId?: string): Artifact[] {
  let sql = "SELECT * FROM artifacts WHERE 1=1";
  const params: unknown[] = [];
  if (projectId) { sql += " AND project_id = ?"; params.push(projectId); }
  sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return all<any>(sql, ...params).map(r => mapRow<Artifact>(r, ARTIFACT_MAP, ARTIFACT_JSON));
}

export function getArtifact(id: string): Artifact | undefined {
  const row = one<any>("SELECT * FROM artifacts WHERE id = ?", id);
  return row ? mapRow<Artifact>(row, ARTIFACT_MAP, ARTIFACT_JSON) : undefined;
}

export function countArtifacts(projectId?: string): number {
  if (projectId) {
    return (getDb().prepare("SELECT COUNT(*) as c FROM artifacts WHERE project_id = ?").get(projectId) as { c: number }).c;
  }
  return (getDb().prepare("SELECT COUNT(*) as c FROM artifacts").get() as { c: number }).c;
}

export function insertArtifact(artifact: Artifact): void {
  run(`
    INSERT INTO artifacts (id, project_id, name, artifact_type, path, uri, mime_type,
      size_bytes, hash, source_agent, source_event_id, trust_status, summary,
      tags_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,
    artifact.id, artifact.projectId ?? null, artifact.name, artifact.artifactType,
    artifact.path ?? null, artifact.uri ?? null, artifact.mimeType ?? null,
    artifact.sizeBytes ?? null, artifact.hash ?? null,
    artifact.sourceAgent ?? null, artifact.sourceEventId ?? null,
    artifact.trustStatus, artifact.summary ?? null,
    JSON.stringify(artifact.tags), artifact.createdAt, artifact.updatedAt
  );
}

export function updateArtifact(id: string, patch: Partial<Artifact>): boolean {
  const existing = getArtifact(id);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: nowISO() };
  upsertArtifact(updated);
  return true;
}

export function upsertArtifact(artifact: Artifact): void {
  run(`
    INSERT INTO artifacts (id, project_id, name, artifact_type, path, uri, mime_type,
      size_bytes, hash, source_agent, source_event_id, trust_status, summary,
      tags_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      project_id=excluded.project_id, name=excluded.name, artifact_type=excluded.artifact_type,
      path=excluded.path, uri=excluded.uri, mime_type=excluded.mime_type,
      size_bytes=excluded.size_bytes, hash=excluded.hash,
      source_agent=excluded.source_agent, source_event_id=excluded.source_event_id,
      trust_status=excluded.trust_status, summary=excluded.summary,
      tags_json=excluded.tags_json, updated_at=excluded.updated_at
  `,
    artifact.id, artifact.projectId ?? null, artifact.name, artifact.artifactType,
    artifact.path ?? null, artifact.uri ?? null, artifact.mimeType ?? null,
    artifact.sizeBytes ?? null, artifact.hash ?? null,
    artifact.sourceAgent ?? null, artifact.sourceEventId ?? null,
    artifact.trustStatus, artifact.summary ?? null,
    JSON.stringify(artifact.tags), artifact.createdAt, artifact.updatedAt
  );
}

// ─── Events ──────────────────────────────────────────────

export function getEvent(id: string): AgentEvent | undefined {
  const row = one<any>("SELECT * FROM events WHERE id = ?", id);
  if (!row) return undefined;
  return {
    id: row.id,
    projectId: row.project_id,
    agentId: row.agent_id,
    eventType: row.event_type,
    title: row.title,
    summary: row.summary,
    body: row.body,
    relatedResourceIds: parseJson(row.related_resource_ids_json, []),
    relatedArtifactIds: parseJson(row.related_artifact_ids_json, []),
    createdAt: row.created_at,
  };
}

// ─── Export / Import ─────────────────────────────────────

export interface ExportData {
  agents: Agent[];
  skills: Skill[];
  mcpServers: McpServer[];
  experts: Expert[];
  projects: Project[];
  contextItems: ContextItem[];
  artifacts: Artifact[];
  events: AgentEvent[];
  exportedAt: string;
  version: string;
}

export function exportAll(): ExportData {
  return {
    agents: listAgents(10000, 0),
    skills: listSkills(10000, 0),
    mcpServers: listMcpServers(10000, 0),
    experts: listExperts(10000, 0),
    projects: listProjects(10000, 0),
    contextItems: listContext(10000, 0),
    artifacts: listArtifacts(10000, 0),
    events: listEvents(10000, 0),
    exportedAt: nowISO(),
    version: "0.1.0",
  };
}

export function importAll(data: ExportData): { imported: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const agent of data.agents ?? []) { upsertAgent(agent); counts.agents = (counts.agents ?? 0) + 1; }
  for (const skill of data.skills ?? []) { upsertSkill(skill); counts.skills = (counts.skills ?? 0) + 1; }
  for (const mcp of data.mcpServers ?? []) { upsertMcpServer(mcp); counts.mcpServers = (counts.mcpServers ?? 0) + 1; }
  for (const expert of data.experts ?? []) { upsertExpert(expert); counts.experts = (counts.experts ?? 0) + 1; }
  for (const project of data.projects ?? []) { upsertProject(project); counts.projects = (counts.projects ?? 0) + 1; }
  for (const item of data.contextItems ?? []) { upsertContext(item); counts.contextItems = (counts.contextItems ?? 0) + 1; }
  for (const art of data.artifacts ?? []) { insertArtifact(art); counts.artifacts = (counts.artifacts ?? 0) + 1; }
  for (const event of data.events ?? []) { insertEvent(event); counts.events = (counts.events ?? 0) + 1; }
  return { imported: counts };
}

// ─── Delete operations ────────────────────────────────────

function deleteById(table: string, id: string): boolean {
  const result = getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function deleteAgent(id: string): boolean { return deleteById("agents", id); }
export function deleteSkill(id: string): boolean { return deleteById("skills", id); }
export function deleteMcpServer(id: string): boolean { return deleteById("mcp_servers", id); }
export function deleteExpert(id: string): boolean { return deleteById("experts", id); }
export function deleteProject(id: string): boolean { return deleteById("projects", id); }
export function deleteContext(id: string): boolean { return deleteById("context_items", id); }
export function deleteArtifact(id: string): boolean { return deleteById("artifacts", id); }
export function deleteEvent(id: string): boolean { return deleteById("events", id); }

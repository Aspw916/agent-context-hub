async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface HubOverview {
  webStatus: string;
  mcpStatus: string;
  dbStatus: string;
  lastScanAt: string | null;
  counts: Record<string, number>;
  attentionList: { type: string; entity: string; entityId: string; message: string }[];
  agentMatrix: { agentId: string; agentName: string; skills: number; mcpServers: number; experts: number }[];
  skillDistribution?: Record<string, number>;
}

export interface Agent {
  id: string; name: string; type: string; vendor?: string;
  status: string; lastSeenAt?: string;
  configPaths: string[]; skillRoots: string[]; mcpConfigPaths: string[]; expertRoots: string[];
}

export interface Skill {
  id: string; name: string; description?: string; source?: string;
  rootPath: string; skillFilePath: string;
  tags: string[]; capabilities: string[]; status: string;
  compatibleAgents: string[];
}

export interface McpServer {
  id: string; name: string; transport: string; command?: string;
  args: string[]; envVarNames: string[];
  configOwnerAgents: string[]; healthStatus: string; status: string;
  tools: string[]; resources: string[];
}

export interface Expert {
  id: string; name: string; description?: string; source?: string;
  rootPath: string; capabilities: string[]; compatibleAgents: string[];
  status: string;
}

export interface Project {
  id: string; name: string; rootPath?: string; description?: string;
  techStack: string[]; agents: string[]; status: string;
  lastScannedAt?: string; createdAt: string; updatedAt: string;
}

export interface ContextItem {
  id: string; projectId?: string; type: string; title: string; body: string;
  sourceAgent?: string; sourceEventId?: string;
  confidence?: number; visibility: string; tags: string[];
  createdAt: string; updatedAt: string;
}

export interface Artifact {
  id: string; projectId?: string; name: string; artifactType: string;
  path?: string; uri?: string; mimeType?: string; sizeBytes?: number;
  hash?: string; sourceAgent?: string; sourceEventId?: string;
  trustStatus: string; summary?: string; tags: string[];
  createdAt: string; updatedAt: string;
}

export interface ExportData {
  agents: unknown[]; skills: unknown[]; mcpServers: unknown[];
  experts: unknown[]; projects: unknown[]; contextItems: unknown[];
  artifacts: unknown[]; events: unknown[];
}

export interface ImportResult {
  imported: Record<string, number>;
}

export interface AgentEvent {
  id: string; projectId?: string; agentId?: string;
  eventType: string; title: string; summary?: string; body?: string;
  relatedResourceIds: string[]; relatedArtifactIds: string[];
  createdAt: string;
}

export interface SearchResult {
  entityType: string; entityId: string; title: string; snippet: string;
}

// API functions
export const api = {
  getOverview: () => fetchJSON<HubOverview>("/api/overview"),
  getAgents: (limit = 50, offset = 0) =>
    fetchJSON<PaginatedResponse<Agent>>(`/api/agents?limit=${limit}&offset=${offset}`),
  getSkills: (limit = 50, offset = 0, status?: string) =>
    fetchJSON<PaginatedResponse<Skill>>(`/api/skills?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ""}`),
  getMcpServers: (limit = 50, offset = 0) =>
    fetchJSON<PaginatedResponse<McpServer>>(`/api/mcp-servers?limit=${limit}&offset=${offset}`),
  getExperts: (limit = 50, offset = 0) =>
    fetchJSON<PaginatedResponse<Expert>>(`/api/experts?limit=${limit}&offset=${offset}`),
  search: (q: string, types?: string[]) => {
    const params = new URLSearchParams({ q, limit: "20" });
    if (types?.length) params.set("types", types.join(","));
    return fetchJSON<{ data: SearchResult[] }>(`/api/search?${params}`);
  },
  getEvents: (limit = 50, offset = 0) =>
    fetchJSON<PaginatedResponse<AgentEvent>>(`/api/events?limit=${limit}&offset=${offset}`),
  runScan: () => fetchJSON<unknown>("/api/scan", { method: "POST" }),
  createEvent: (event: Record<string, unknown>) =>
    fetchJSON<unknown>("/api/events", { method: "POST", body: JSON.stringify(event) }),

  // ─── Projects ──────────────────────────────────────
  getProjects: (limit = 50, offset = 0) =>
    fetchJSON<PaginatedResponse<Project>>(`/api/projects?limit=${limit}&offset=${offset}`),
  getProject: (id: string) => fetchJSON<Project>(`/api/projects/${id}`),
  createProject: (data: Record<string, unknown>) =>
    fetchJSON<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, patch: Record<string, unknown>) =>
    fetchJSON<{ success: boolean }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  // ─── Context ───────────────────────────────────────
  getContext: (limit = 50, offset = 0, projectId?: string) => {
    let url = `/api/context?limit=${limit}&offset=${offset}`;
    if (projectId) url += `&projectId=${projectId}`;
    return fetchJSON<PaginatedResponse<ContextItem>>(url);
  },
  getContextItem: (id: string) => fetchJSON<ContextItem>(`/api/context/${id}`),
  createContext: (data: Record<string, unknown>) =>
    fetchJSON<ContextItem>("/api/context", { method: "POST", body: JSON.stringify(data) }),
  updateContext: (id: string, patch: Record<string, unknown>) =>
    fetchJSON<{ success: boolean }>(`/api/context/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  promoteFromEvent: (id: string) =>
    fetchJSON<ContextItem>(`/api/context/${id}/promote-from-event`, { method: "POST" }),

  // ─── Artifacts ─────────────────────────────────────
  getArtifacts: (limit = 50, offset = 0, projectId?: string) => {
    let url = `/api/artifacts?limit=${limit}&offset=${offset}`;
    if (projectId) url += `&projectId=${projectId}`;
    return fetchJSON<PaginatedResponse<Artifact>>(url);
  },
  getArtifact: (id: string) => fetchJSON<Artifact>(`/api/artifacts/${id}`),
  createArtifact: (data: Record<string, unknown>) =>
    fetchJSON<Artifact>("/api/artifacts", { method: "POST", body: JSON.stringify(data) }),
  updateArtifact: (id: string, patch: Record<string, unknown>) =>
    fetchJSON<{ success: boolean }>(`/api/artifacts/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  // ─── Detail endpoints ──────────────────────────────
  getAgent: (id: string) => fetchJSON<Agent>(`/api/agents/${id}`),
  getSkill: (id: string) => fetchJSON<Skill>(`/api/skills/${id}`),
  getMcpServer: (id: string) => fetchJSON<McpServer>(`/api/mcp-servers/${id}`),
  getExpert: (id: string) => fetchJSON<Expert>(`/api/experts/${id}`),
  getEvent: (id: string) => fetchJSON<AgentEvent>(`/api/events/${id}`),

  // ─── Health ────────────────────────────────────────
  healthCheckMcp: (id: string) =>
    fetchJSON<{ healthStatus: string; checkedAt: string; error?: string }>(`/api/mcp-servers/${id}/health-check`, { method: "POST" }),

  // ─── Export / Import ───────────────────────────────
  exportData: () => fetchJSON<ExportData>("/api/export", { method: "POST" }),
  importData: (data: ExportData) =>
    fetchJSON<ImportResult>("/api/import", { method: "POST", body: JSON.stringify(data) }),

  // ─── Delete ────────────────────────────────────────
  deleteAgent: (id: string) => fetchJSON<{ success: boolean }>(`/api/agents/${id}`, { method: "DELETE" }),
  deleteSkill: (id: string) => fetchJSON<{ success: boolean }>(`/api/skills/${id}`, { method: "DELETE" }),
  deleteMcpServer: (id: string) => fetchJSON<{ success: boolean }>(`/api/mcp-servers/${id}`, { method: "DELETE" }),
  deleteExpert: (id: string) => fetchJSON<{ success: boolean }>(`/api/experts/${id}`, { method: "DELETE" }),
  deleteProject: (id: string) => fetchJSON<{ success: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),
  deleteContext: (id: string) => fetchJSON<{ success: boolean }>(`/api/context/${id}`, { method: "DELETE" }),
  deleteArtifact: (id: string) => fetchJSON<{ success: boolean }>(`/api/artifacts/${id}`, { method: "DELETE" }),
  deleteEvent: (id: string) => fetchJSON<{ success: boolean }>(`/api/events/${id}`, { method: "DELETE" }),
};

// SSE connection
export function connectSSE(onEvent: (data: unknown) => void): () => void {
  const es = new EventSource("/api/events/stream");
  es.onmessage = (e) => {
    if (e.data === "ping") return;
    try { onEvent(JSON.parse(e.data)); } catch { /* ignore */ }
  };
  return () => es.close();
}

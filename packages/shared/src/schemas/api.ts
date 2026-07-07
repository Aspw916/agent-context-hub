import { z } from "zod";

// ─── Pagination ──────────────────────────────────────────

export const PaginationParams = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaginationParams = z.infer<typeof PaginationParams>;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ─── Overview ────────────────────────────────────────────

export interface HubOverview {
  webStatus: "running" | "stopped";
  mcpStatus: "running" | "stopped";
  dbStatus: "connected" | "disconnected";
  lastScanAt: string | null;
  counts: {
    agents: number;
    skills: number;
    mcpServers: number;
    experts: number;
    projects: number;
    contextItems: number;
    artifacts: number;
    events: number;
  };
  attentionList: AttentionItem[];
}

export interface AttentionItem {
  type: "warning" | "error";
  entity: string;
  entityId: string;
  message: string;
}

// ─── Agent Asset Matrix ──────────────────────────────────

export interface AgentAssetMatrix {
  agentId: string;
  agentName: string;
  skills: number;
  mcpServers: number;
  experts: number;
}

// ─── SSE Events ──────────────────────────────────────────

export type SseEvent =
  | { type: "scan:progress"; scanner: string; found: number; total: number }
  | { type: "scan:complete"; scanner: string; discovered: number; warnings: number }
  | { type: "health:result"; mcpId: string; status: string; latencyMs: number }
  | { type: "health:error"; mcpId: string; error: string }
  | { type: "db:change"; table: string; action: string; id: string };

// ─── Search ──────────────────────────────────────────────

export const SearchParams = z.object({
  q: z.string().min(1),
  types: z.string().optional(), // comma-separated: "skills,mcp,experts"
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchParams = z.infer<typeof SearchParams>;

export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  snippet: string;
}

// ─── Export/Import ───────────────────────────────────────

export interface ExportManifest {
  exportedAt: string;
  version: string;
  redacted: boolean;
  counts: {
    agents: number;
    skills: number;
    mcpServers: number;
    experts: number;
    projects: number;
    contextItems: number;
    artifacts: number;
    events: number;
  };
}

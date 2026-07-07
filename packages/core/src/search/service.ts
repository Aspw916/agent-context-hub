import { containsCJK } from "@agent-hub/shared";
import type { SearchResult } from "@agent-hub/shared";
import { getDb } from "../storage/db.js";

/** Cross-entity search with CJK-aware fallback */
export function searchAll(query: string, entityTypes?: string[], limit = 20): SearchResult[] {
  const isCJK = containsCJK(query);
  const results: SearchResult[] = [];

  const targets = entityTypes ?? ["agents", "skills", "mcp_servers", "experts", "projects", "context_items"];

  for (const type of targets) {
    const hits = searchEntity(type, query, isCJK, limit);
    results.push(...hits);
  }

  // Sort by relevance: shorter titles first (rough heuristic)
  results.sort((a, b) => a.title.length - b.title.length);
  return results.slice(0, limit);
}

function searchEntity(type: string, query: string, isCJK: boolean, limit: number): SearchResult[] {
  const db = getDb();

  if (isCJK) {
    // LIKE fallback for CJK
    const sqlMap: Record<string, string> = {
      agents: "SELECT id, name, COALESCE(vendor, '') as snippet FROM agents WHERE name LIKE ? OR vendor LIKE ? LIMIT ?",
      skills: "SELECT id, name, COALESCE(description, '') as snippet FROM skills WHERE name LIKE ? OR description LIKE ? LIMIT ?",
      mcp_servers: "SELECT id, name, COALESCE(command, '') as snippet FROM mcp_servers WHERE name LIKE ? OR command LIKE ? LIMIT ?",
      experts: "SELECT id, name, COALESCE(description, '') as snippet FROM experts WHERE name LIKE ? OR description LIKE ? LIMIT ?",
      projects: "SELECT id, name, COALESCE(description, '') as snippet FROM projects WHERE name LIKE ? OR description LIKE ? LIMIT ?",
      context_items: "SELECT id, title as name, COALESCE(body, '') as snippet FROM context_items WHERE title LIKE ? OR body LIKE ? LIMIT ?",
    };

    const sql = sqlMap[type];
    if (!sql) return [];

    const like = `%${query}%`;
    const rows = db.prepare(sql).all(like, like, limit) as any[];
    return rows.map(r => ({
      entityType: type,
      entityId: r.id,
      title: r.name ?? r.title ?? "",
      snippet: (r.snippet ?? "").substring(0, 200),
    }));
  }

  // FTS5 for ASCII
  const ftsMap: Record<string, { table: string; titleCol: string; snippetCol: string }> = {
    agents: { table: "agents_fts", titleCol: "name", snippetCol: "vendor" },
    skills: { table: "skills_fts", titleCol: "name", snippetCol: "description" },
    mcp_servers: { table: "mcp_servers_fts", titleCol: "name", snippetCol: "command" },
    experts: { table: "experts_fts", titleCol: "name", snippetCol: "description" },
    projects: { table: "projects_fts", titleCol: "name", snippetCol: "description" },
    context_items: { table: "context_items_fts", titleCol: "title", snippetCol: "body" },
  };

  const conf = ftsMap[type];
  if (!conf) return [];

  try {
    const rows = db.prepare(
      `SELECT rowid FROM ${conf.table} WHERE ${conf.table} MATCH ? ORDER BY rank LIMIT ?`
    ).all(query, limit) as { rowid: number }[];

    if (rows.length === 0) return [];

    const ids = rows.map(r => r.rowid);
    const entityRows = db.prepare(
      `SELECT id, ${conf.titleCol} as title, COALESCE(${conf.snippetCol}, '') as snippet FROM ${type} WHERE rowid IN (${ids.join(",")})`
    ).all() as any[];

    return entityRows.map(r => ({
      entityType: type,
      entityId: r.id,
      title: r.title ?? "",
      snippet: (r.snippet ?? "").substring(0, 200),
    }));
  } catch {
    // FTS query syntax error, fallback to LIKE
    const like = `%${query}%`;
    const titleCol = conf.titleCol;
    const snippetCol = conf.snippetCol;
    const rows = db.prepare(
      `SELECT id, ${titleCol} as title, COALESCE(${snippetCol}, '') as snippet FROM ${type} WHERE ${titleCol} LIKE ? OR ${snippetCol} LIKE ? LIMIT ?`
    ).all(like, like, limit) as any[];
    return rows.map(r => ({
      entityType: type,
      entityId: r.id,
      title: r.title ?? "",
      snippet: (r.snippet ?? "").substring(0, 200),
    }));
  }
}

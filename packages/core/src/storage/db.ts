import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export function initDb(dataDir: string): Database.Database {
  if (db) return db;

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  }

  db = new Database(`${dataDir}/hub.db`);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}

/** Initialize an in-memory database for testing */
export function initTestDb(): Database.Database {
  closeDb();
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

// ─── Schema ──────────────────────────────────────────────

const MIGRATIONS: string[] = [
  // v1 — Core tables
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    vendor TEXT,
    version TEXT,
    config_paths_json TEXT NOT NULL DEFAULT '[]',
    skill_roots_json TEXT NOT NULL DEFAULT '[]',
    mcp_config_paths_json TEXT NOT NULL DEFAULT '[]',
    expert_roots_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    notes TEXT,
    last_seen_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT,
    root_path TEXT NOT NULL,
    skill_file_path TEXT NOT NULL,
    relative_path TEXT,
    version TEXT,
    risk TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    capabilities_json TEXT NOT NULL DEFAULT '[]',
    dependencies_json TEXT NOT NULL DEFAULT '[]',
    compatible_agents_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    metadata_quality TEXT,
    last_scanned_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    transport TEXT NOT NULL,
    command TEXT,
    url TEXT,
    args_json TEXT NOT NULL DEFAULT '[]',
    env_var_names_json TEXT NOT NULL DEFAULT '[]',
    config_path TEXT,
    config_owner_agents_json TEXT NOT NULL DEFAULT '[]',
    capabilities_json TEXT NOT NULL DEFAULT '[]',
    tools_json TEXT NOT NULL DEFAULT '[]',
    resources_json TEXT NOT NULL DEFAULT '[]',
    prompts_json TEXT NOT NULL DEFAULT '[]',
    health_status TEXT NOT NULL DEFAULT 'unknown',
    last_health_check_at TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS experts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT,
    root_path TEXT NOT NULL,
    definition_file_path TEXT NOT NULL,
    version TEXT,
    capabilities_json TEXT NOT NULL DEFAULT '[]',
    compatible_agents_json TEXT NOT NULL DEFAULT '[]',
    dependencies_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL,
    last_scanned_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT,
    description TEXT,
    tech_stack_json TEXT NOT NULL DEFAULT '[]',
    agents_json TEXT NOT NULL DEFAULT '[]',
    active_context TEXT,
    status TEXT NOT NULL,
    last_scanned_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS context_items (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    source_agent TEXT,
    source_event_id TEXT,
    confidence REAL,
    visibility TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    path TEXT,
    uri TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    hash TEXT,
    source_agent TEXT,
    source_event_id TEXT,
    trust_status TEXT NOT NULL,
    summary TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    agent_id TEXT,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    body TEXT,
    related_resource_ids_json TEXT NOT NULL DEFAULT '[]',
    related_artifact_ids_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS scan_runs (
    id TEXT PRIMARY KEY,
    scanner TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    discovered_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    messages_json TEXT NOT NULL DEFAULT '[]'
  )`,

  // FTS5 tables
  `CREATE VIRTUAL TABLE IF NOT EXISTS agents_fts USING fts5(
    name, type, vendor, content='agents', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
    name, description, tags, content='skills', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS mcp_servers_fts USING fts5(
    name, command, capabilities, tools, content='mcp_servers', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS experts_fts USING fts5(
    name, description, capabilities, content='experts', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
    name, description, active_context, content='projects', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS context_items_fts USING fts5(
    title, body, tags, content='context_items', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(
    name, summary, tags, content='artifacts', content_rowid='rowid'
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
    title, summary, body, content='events', content_rowid='rowid'
  )`,

  // FTS triggers — agents
  `CREATE TRIGGER IF NOT EXISTS agents_fts_insert AFTER INSERT ON agents BEGIN
    INSERT INTO agents_fts(rowid, name, type, vendor)
    VALUES (new.rowid, new.name, new.type, new.vendor);
  END`,
  `CREATE TRIGGER IF NOT EXISTS agents_fts_delete AFTER DELETE ON agents BEGIN
    INSERT INTO agents_fts(agents_fts, rowid, name, type, vendor)
    VALUES ('delete', old.rowid, old.name, old.type, old.vendor);
  END`,
  `CREATE TRIGGER IF NOT EXISTS agents_fts_update AFTER UPDATE ON agents BEGIN
    INSERT INTO agents_fts(agents_fts, rowid, name, type, vendor)
    VALUES ('delete', old.rowid, old.name, old.type, old.vendor);
    INSERT INTO agents_fts(rowid, name, type, vendor)
    VALUES (new.rowid, new.name, new.type, new.vendor);
  END`,

  // FTS triggers — skills
  `CREATE TRIGGER IF NOT EXISTS skills_fts_insert AFTER INSERT ON skills BEGIN
    INSERT INTO skills_fts(rowid, name, description, tags)
    VALUES (new.rowid, new.name, new.description, new.tags_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS skills_fts_delete AFTER DELETE ON skills BEGIN
    INSERT INTO skills_fts(skills_fts, rowid, name, description, tags)
    VALUES ('delete', old.rowid, old.name, old.description, old.tags_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS skills_fts_update AFTER UPDATE ON skills BEGIN
    INSERT INTO skills_fts(skills_fts, rowid, name, description, tags)
    VALUES ('delete', old.rowid, old.name, old.description, old.tags_json);
    INSERT INTO skills_fts(rowid, name, description, tags)
    VALUES (new.rowid, new.name, new.description, new.tags_json);
  END`,

  // FTS triggers — mcp_servers
  `CREATE TRIGGER IF NOT EXISTS mcp_servers_fts_insert AFTER INSERT ON mcp_servers BEGIN
    INSERT INTO mcp_servers_fts(rowid, name, command, capabilities, tools)
    VALUES (new.rowid, new.name, new.command, new.capabilities_json, new.tools_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS mcp_servers_fts_delete AFTER DELETE ON mcp_servers BEGIN
    INSERT INTO mcp_servers_fts(mcp_servers_fts, rowid, name, command, capabilities, tools)
    VALUES ('delete', old.rowid, old.name, old.command, old.capabilities_json, old.tools_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS mcp_servers_fts_update AFTER UPDATE ON mcp_servers BEGIN
    INSERT INTO mcp_servers_fts(mcp_servers_fts, rowid, name, command, capabilities, tools)
    VALUES ('delete', old.rowid, old.name, old.command, old.capabilities_json, old.tools_json);
    INSERT INTO mcp_servers_fts(rowid, name, command, capabilities, tools)
    VALUES (new.rowid, new.name, new.command, new.capabilities_json, new.tools_json);
  END`,

  // FTS triggers — experts
  `CREATE TRIGGER IF NOT EXISTS experts_fts_insert AFTER INSERT ON experts BEGIN
    INSERT INTO experts_fts(rowid, name, description, capabilities)
    VALUES (new.rowid, new.name, new.description, new.capabilities_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS experts_fts_delete AFTER DELETE ON experts BEGIN
    INSERT INTO experts_fts(experts_fts, rowid, name, description, capabilities)
    VALUES ('delete', old.rowid, old.name, old.description, old.capabilities_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS experts_fts_update AFTER UPDATE ON experts BEGIN
    INSERT INTO experts_fts(experts_fts, rowid, name, description, capabilities)
    VALUES ('delete', old.rowid, old.name, old.description, old.capabilities_json);
    INSERT INTO experts_fts(rowid, name, description, capabilities)
    VALUES (new.rowid, new.name, new.description, new.capabilities_json);
  END`,

  // FTS triggers — projects
  `CREATE TRIGGER IF NOT EXISTS projects_fts_insert AFTER INSERT ON projects BEGIN
    INSERT INTO projects_fts(rowid, name, description, active_context)
    VALUES (new.rowid, new.name, new.description, new.active_context);
  END`,
  `CREATE TRIGGER IF NOT EXISTS projects_fts_delete AFTER DELETE ON projects BEGIN
    INSERT INTO projects_fts(projects_fts, rowid, name, description, active_context)
    VALUES ('delete', old.rowid, old.name, old.description, old.active_context);
  END`,
  `CREATE TRIGGER IF NOT EXISTS projects_fts_update AFTER UPDATE ON projects BEGIN
    INSERT INTO projects_fts(projects_fts, rowid, name, description, active_context)
    VALUES ('delete', old.rowid, old.name, old.description, old.active_context);
    INSERT INTO projects_fts(rowid, name, description, active_context)
    VALUES (new.rowid, new.name, new.description, new.active_context);
  END`,

  // FTS triggers — context_items
  `CREATE TRIGGER IF NOT EXISTS context_items_fts_insert AFTER INSERT ON context_items BEGIN
    INSERT INTO context_items_fts(rowid, title, body, tags)
    VALUES (new.rowid, new.title, new.body, new.tags_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS context_items_fts_delete AFTER DELETE ON context_items BEGIN
    INSERT INTO context_items_fts(context_items_fts, rowid, title, body, tags)
    VALUES ('delete', old.rowid, old.title, old.body, old.tags_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS context_items_fts_update AFTER UPDATE ON context_items BEGIN
    INSERT INTO context_items_fts(context_items_fts, rowid, title, body, tags)
    VALUES ('delete', old.rowid, old.title, old.body, old.tags_json);
    INSERT INTO context_items_fts(rowid, title, body, tags)
    VALUES (new.rowid, new.title, new.body, new.tags_json);
  END`,

  // FTS triggers — artifacts
  `CREATE TRIGGER IF NOT EXISTS artifacts_fts_insert AFTER INSERT ON artifacts BEGIN
    INSERT INTO artifacts_fts(rowid, name, summary, tags)
    VALUES (new.rowid, new.name, new.summary, new.tags_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS artifacts_fts_delete AFTER DELETE ON artifacts BEGIN
    INSERT INTO artifacts_fts(artifacts_fts, rowid, name, summary, tags)
    VALUES ('delete', old.rowid, old.name, old.summary, old.tags_json);
  END`,
  `CREATE TRIGGER IF NOT EXISTS artifacts_fts_update AFTER UPDATE ON artifacts BEGIN
    INSERT INTO artifacts_fts(artifacts_fts, rowid, name, summary, tags)
    VALUES ('delete', old.rowid, old.name, old.summary, old.tags_json);
    INSERT INTO artifacts_fts(rowid, name, summary, tags)
    VALUES (new.rowid, new.name, new.summary, new.tags_json);
  END`,

  // FTS triggers — events
  `CREATE TRIGGER IF NOT EXISTS events_fts_insert AFTER INSERT ON events BEGIN
    INSERT INTO events_fts(rowid, title, summary, body)
    VALUES (new.rowid, new.title, new.summary, new.body);
  END`,
  `CREATE TRIGGER IF NOT EXISTS events_fts_delete AFTER DELETE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, summary, body)
    VALUES ('delete', old.rowid, old.title, old.summary, old.body);
  END`,
  `CREATE TRIGGER IF NOT EXISTS events_fts_update AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, summary, body)
    VALUES ('delete', old.rowid, old.title, old.summary, old.body);
    INSERT INTO events_fts(rowid, title, summary, body)
    VALUES (new.rowid, new.title, new.summary, new.body);
  END`,
  // v2 — Add url column for http/sse MCP servers (skip if already in schema)
  `ALTER TABLE mcp_servers ADD COLUMN url TEXT`,
];

function runMigrations(database: Database.Database): void {
  database.exec("CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");

  const currentVersion = database.prepare(
    "SELECT MAX(version) as v FROM _migrations"
  ).get() as { v: number | null };

  const start = (currentVersion?.v ?? -1) + 1;
  for (let i = start; i < MIGRATIONS.length; i++) {
    try {
      database.exec(MIGRATIONS[i]!);
    } catch (err: any) {
      // Skip duplicate-column errors gracefully (e.g., column already exists in CREATE TABLE)
      if (err?.code === "SQLITE_ERROR" && err?.message?.includes("duplicate column")) {
        // Column already exists; no-op
      } else {
        throw err;
      }
    }
    database.prepare("INSERT INTO _migrations (version, applied_at) VALUES (?, ?)").run(
      i, new Date().toISOString()
    );
  }
}

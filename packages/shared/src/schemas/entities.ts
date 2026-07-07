import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────

export const AgentStatus = z.enum([
  "active", "detected", "manual", "missing_config", "disabled", "unknown",
]);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const SkillStatus = z.enum([
  "active", "incomplete_metadata", "unreadable", "duplicate", "disabled", "missing_file",
]);
export type SkillStatus = z.infer<typeof SkillStatus>;

export const McpTransport = z.enum(["stdio", "http", "sse"]);
export type McpTransport = z.infer<typeof McpTransport>;

export const McpHealthStatus = z.enum([
  "unknown", "healthy", "unhealthy", "unreachable", "checking",
]);
export type McpHealthStatus = z.infer<typeof McpHealthStatus>;

export const ExpertStatus = z.enum([
  "active", "incomplete_metadata", "unreadable", "disabled",
]);
export type ExpertStatus = z.infer<typeof ExpertStatus>;

export const ProjectStatus = z.enum(["active", "inactive", "archived"]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const ContextType = z.enum([
  "project_brief", "decision", "constraint", "preference",
  "instruction", "finding", "todo", "handoff",
]);
export type ContextType = z.infer<typeof ContextType>;

export const ContextVisibility = z.enum(["private", "project", "local"]);
export type ContextVisibility = z.infer<typeof ContextVisibility>;

export const TrustStatus = z.enum([
  "draft", "reviewed", "trusted", "deprecated", "invalid",
]);
export type TrustStatus = z.infer<typeof TrustStatus>;

export const EventType = z.enum([
  "scan", "task_started", "task_progress", "task_completed",
  "finding", "decision", "artifact_registered", "handoff_created",
  "manual_note", "error",
]);
export type EventType = z.infer<typeof EventType>;

export const ScanStatus = z.enum(["running", "completed", "failed"]);
export type ScanStatus = z.infer<typeof ScanStatus>;

// ─── Entity Schemas ──────────────────────────────────────

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string().min(1),
  vendor: z.string().optional(),
  version: z.string().optional(),
  configPaths: z.array(z.string()).default([]),
  skillRoots: z.array(z.string()).default([]),
  mcpConfigPaths: z.array(z.string()).default([]),
  expertRoots: z.array(z.string()).default([]),
  status: AgentStatus,
  notes: z.string().optional(),
  lastSeenAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  source: z.string().optional(),
  rootPath: z.string(),
  skillFilePath: z.string(),
  relativePath: z.string().optional(),
  version: z.string().optional(),
  risk: z.string().optional(),
  tags: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  compatibleAgents: z.array(z.string()).default([]),
  status: SkillStatus,
  metadataQuality: z.string().optional(),
  lastScannedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const McpServerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  transport: McpTransport,
  command: z.string().optional(),
  url: z.string().optional(),
  args: z.array(z.string()).default([]),
  envVarNames: z.array(z.string()).default([]),
  configPath: z.string().optional(),
  configOwnerAgents: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
  prompts: z.array(z.string()).default([]),
  healthStatus: McpHealthStatus,
  lastHealthCheckAt: z.string().nullable().optional(),
  status: SkillStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type McpServer = z.infer<typeof McpServerSchema>;

export const ExpertSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  source: z.string().optional(),
  rootPath: z.string(),
  definitionFilePath: z.string(),
  version: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  compatibleAgents: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  status: ExpertStatus,
  lastScannedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Expert = z.infer<typeof ExpertSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  rootPath: z.string().optional(),
  description: z.string().optional(),
  techStack: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  activeContext: z.string().optional(),
  status: ProjectStatus,
  lastScannedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectBriefSchema = z.object({
  goal: z.string().optional(),
  domain: z.string().optional(),
  architectureNotes: z.string().optional(),
  currentTasks: z.string().optional(),
  constraints: z.string().optional(),
  importantPaths: z.string().optional(),
  runCommands: z.string().optional(),
  testCommands: z.string().optional(),
  knownRisks: z.string().optional(),
});
export type ProjectBrief = z.infer<typeof ProjectBriefSchema>;

export const ContextItemSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  type: ContextType,
  title: z.string().min(1),
  body: z.string(),
  sourceAgent: z.string().optional(),
  sourceEventId: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  visibility: ContextVisibility,
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContextItem = z.infer<typeof ContextItemSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  name: z.string().min(1),
  artifactType: z.string().min(1),
  path: z.string().optional(),
  uri: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  hash: z.string().optional(),
  sourceAgent: z.string().optional(),
  sourceEventId: z.string().optional(),
  trustStatus: TrustStatus,
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const EventSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  agentId: z.string().optional(),
  eventType: EventType,
  title: z.string().min(1),
  summary: z.string().optional(),
  body: z.string().optional(),
  relatedResourceIds: z.array(z.string()).default([]),
  relatedArtifactIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type AgentEvent = z.infer<typeof EventSchema>;

export const ScanRunSchema = z.object({
  id: z.string(),
  scanner: z.string().min(1),
  status: ScanStatus,
  startedAt: z.string(),
  finishedAt: z.string().nullable().optional(),
  discoveredCount: z.number().default(0),
  warningCount: z.number().default(0),
  errorCount: z.number().default(0),
  messages: z.array(z.string()).default([]),
});
export type ScanRun = z.infer<typeof ScanRunSchema>;

import type { HubOverview, AgentAssetMatrix } from "@agent-hub/shared";
import * as repo from "../storage/repository.js";

export function getOverview(lastScanAt: string | null): HubOverview {
  return {
    webStatus: "running",
    mcpStatus: "running",
    dbStatus: "connected",
    lastScanAt,
    counts: {
      agents: repo.countAgents(),
      skills: repo.countSkills(),
      mcpServers: repo.countMcpServers(),
      experts: repo.countExperts(),
      projects: repo.countProjects(),
      contextItems: repo.countContext(),
      artifacts: repo.countArtifacts(),
      events: repo.countEvents(),
    },
    attentionList: buildAttentionList(),
  };
}

export function getAgentAssetMatrix(): AgentAssetMatrix[] {
  const agents = repo.listAgents(100, 0);
  return agents.map(a => ({
    agentId: a.id,
    agentName: a.name,
    skills: repo.countSkills(a.name),
    mcpServers: repo.countMcpServers(a.name),
    experts: repo.countExperts(a.name),
  }));
}

/** Group skills by their source field for distribution charts */
export function getSkillDistribution(): Record<string, number> {
  const skills = repo.listSkills(10000, 0);
  const dist: Record<string, number> = {};
  for (const s of skills) {
    const src = s.source ?? "unknown";
    dist[src] = (dist[src] ?? 0) + 1;
  }
  return dist;
}

/** Count skills by metadata quality tier */
export function getSkillQualityTiers() {
  const skills = repo.listSkills(10000, 0);
  return {
    complete: skills.filter(s => s.metadataQuality === "complete").length,
    partial: skills.filter(s => s.metadataQuality === "partial").length,
    low: skills.filter(s => s.metadataQuality === "low").length,
    none: skills.filter(s => !s.metadataQuality).length,
  };
}

function buildAttentionList() {
  const items: HubOverview["attentionList"] = [];
  const skills = repo.listSkills(200, 0);
  for (const s of skills) {
    if (s.status === "missing_file") {
      items.push({ type: "error", entity: "skill", entityId: s.id, message: `Skill file missing: ${s.skillFilePath}` });
    } else if (s.status === "incomplete_metadata") {
      items.push({ type: "warning", entity: "skill", entityId: s.id, message: `Incomplete metadata: ${s.name}` });
    }
  }
  return items;
}

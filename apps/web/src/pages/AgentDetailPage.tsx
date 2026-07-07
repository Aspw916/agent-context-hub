import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Robot, ArrowLeft, Trash, Clock, FolderOpen, PuzzlePiece, Plug, Star } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Agent } from "../api/client";

const SRC_CONFIG: Record<string, { color: string; bg: string }> = {
  WorkBuddy:       { color: "#4263eb", bg: "#eef1ff" },
  Codex:           { color: "#0ca678", bg: "#e6fcf5" },
  Hermes:          { color: "#f76707", bg: "#fff4e6" },
  Cursor:          { color: "#ae3ec9", bg: "#f8f0fc" },
  "Claude Desktop": { color: "#e03131", bg: "#fff5f5" },
  unknown:         { color: "#868e96", bg: "#f8f9fa" },
};

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getAgent(id)
      .then(setAgent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!window.confirm(`Delete agent "${agent?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteAgent(id);
      navigate("/agents");
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
    setDeleting(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;
  if (error) return <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>;
  if (!agent) return <div className="text-slate-400 text-sm">Agent not found</div>;

  const src = (SRC_CONFIG[agent.name] ?? SRC_CONFIG.unknown)!;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/agents" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft weight="regular" className="w-4 h-4" /> Agents
          </Link>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash weight="regular" className="w-4 h-4" />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Title Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: src.bg, color: src.color }}>
            <Robot weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{agent.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] px-2.5 py-0.5 rounded-md font-medium ${
                agent.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}>{agent.status}</span>
              {agent.vendor && <span className="text-[12px] text-slate-400">by {agent.vendor}</span>}
              {agent.type && <span className="text-[12px] text-slate-400">{agent.type}</span>}
            </div>
          </div>
          {agent.lastSeenAt && (
            <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
              <Clock weight="regular" className="w-3.5 h-3.5" />
              {new Date(agent.lastSeenAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Config Paths */}
      {agent.configPaths.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <FolderOpen weight="fill" className="w-4 h-4 text-slate-400" /> Config Paths
          </h2>
          <div className="space-y-1.5">
            {agent.configPaths.map((p, i) => (
              <div key={i} className="text-[12px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">{p}</div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Roots */}
      {agent.skillRoots.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <PuzzlePiece weight="fill" className="w-4 h-4 text-blue-500" /> Skill Roots ({agent.skillRoots.length})
          </h2>
          <div className="space-y-1.5">
            {agent.skillRoots.map((p, i) => (
              <div key={i} className="text-[12px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">{p}</div>
            ))}
          </div>
        </div>
      )}

      {/* MCP Config Paths */}
      {agent.mcpConfigPaths.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Plug weight="fill" className="w-4 h-4 text-indigo-500" /> MCP Config Paths ({agent.mcpConfigPaths.length})
          </h2>
          <div className="space-y-1.5">
            {agent.mcpConfigPaths.map((p, i) => (
              <div key={i} className="text-[12px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">{p}</div>
            ))}
          </div>
        </div>
      )}

      {/* Expert Roots */}
      {agent.expertRoots.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Star weight="fill" className="w-4 h-4 text-amber-500" /> Expert Roots ({agent.expertRoots.length})
          </h2>
          <div className="space-y-1.5">
            {agent.expertRoots.map((p, i) => (
              <div key={i} className="text-[12px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">{p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

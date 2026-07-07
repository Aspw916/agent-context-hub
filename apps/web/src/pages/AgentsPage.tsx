import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Robot, MagnifyingGlass, Funnel, Circle } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Agent } from "../api/client";

const AGENT_COLORS: Record<string, string> = {
  workbuddy: "#4263eb",
  codex: "#0ca678",
  hermes: "#f76707",
  cursor: "#ae3ec9",
  claude: "#e03131",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.getAgents().then((r) => setAgents(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? agents.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : agents;

  if (loading) return <ListSkeleton rows={5} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Robot weight="fill" className="w-5 h-5 text-blue-500" />
            Agents
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {agents.length} agents detected from your system
          </p>
        </div>
        <div className="relative max-w-xs">
          <MagnifyingGlass weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-[13px] bg-white border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* ── Empty State ── */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <Robot weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No agents detected</h3>
          <p className="text-[13px] text-slate-400 mt-1">Run a scan to detect installed agents on your system.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <MagnifyingGlass weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No results</h3>
          <p className="text-[13px] text-slate-400 mt-1">Try a different search term.</p>
        </div>
      ) : (
        /* ── Card Grid ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {filtered.map((a) => {
            const type = a.type?.toLowerCase() ?? "";
            const accent = AGENT_COLORS[type] ?? "#6b7280";
            const isActive = ["WorkBuddy", "Codex", "Hermes"].includes(a.name);

            return (
              <div
                key={a.id}
                onClick={() => navigate(`/agents/${a.id}`)}
                className="group bg-white rounded-xl border border-slate-200/80 p-4
                           hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5
                           cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {a.name}
                      </h3>
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-300"}`}
                            title={isActive ? "Active" : "Idle"} />
                    </div>
                    <p className="text-[12px] text-slate-500 capitalize mt-0.5">{a.type}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    <span className="font-medium text-slate-600">{a.configPaths.length}</span> config paths
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="font-medium text-slate-600">{a.skillRoots.length}</span> skill roots
                  </div>
                </div>

                {/* Tags */}
                {a.skillRoots.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.skillRoots.slice(0, 2).map((r) => (
                      <span key={r} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono truncate max-w-[180px]">
                        {r.replace(/\\/g, "/").split("/").slice(-2).join("/")}
                      </span>
                    ))}
                    {a.skillRoots.length > 2 && (
                      <span className="text-[10px] text-slate-400">+{a.skillRoots.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton ── */
function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-5">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Plug, ArrowLeft, Trash, Lightning, Wrench, ArrowClockwise } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { McpServer } from "../api/client";

const HEALTH_STYLE: Record<string, { bg: string; text: string }> = {
  healthy:   { bg: "bg-emerald-50", text: "text-emerald-700" },
  unhealthy: { bg: "bg-red-50",     text: "text-red-700" },
  unknown:   { bg: "bg-amber-50",   text: "text-amber-700" },
  unreachable: { bg: "bg-red-50", text: "text-red-700" },
};

export default function McpDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [server, setServer] = useState<McpServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<{ healthStatus: string; error?: string } | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.getMcpServer(id).then(setServer).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!window.confirm(`Delete MCP server "${server?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteMcpServer(id);
      navigate("/mcp-servers");
    } catch (e: any) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  const handleHealthCheck = async () => {
    if (!id || checking) return;
    setChecking(true);
    setHealthResult(null);
    try {
      const r = await api.healthCheckMcp(id);
      setHealthResult(r);
      load();
    } catch (e: any) {
      setHealthResult({ healthStatus: "unreachable", error: e.message });
    }
    setChecking(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;
  if (error) return <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>;
  if (!server) return <div className="text-slate-400 text-sm">MCP Server not found</div>;

  const hs = (HEALTH_STYLE[server.healthStatus] ?? HEALTH_STYLE.unknown)!;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/mcp-servers" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft weight="regular" className="w-4 h-4" /> MCP Servers
        </Link>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
          <Trash weight="regular" className="w-4 h-4" />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Title Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Plug weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{server.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] px-2.5 py-0.5 rounded-md font-medium ${hs.bg} ${hs.text}`}>{server.healthStatus}</span>
              <span className="text-[12px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{server.transport}</span>
            </div>
          </div>
          <button onClick={handleHealthCheck} disabled={checking}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">
            <ArrowClockwise weight="regular" className="w-4 h-4" />
            {checking ? "Checking..." : "Health Check"}
          </button>
        </div>
        {healthResult && (
          <div className={`mt-4 text-[13px] p-3 rounded-xl ${healthResult.healthStatus === "healthy" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            Status: {healthResult.healthStatus}
            {healthResult.error && <div className="mt-1 text-[12px]">{healthResult.error}</div>}
          </div>
        )}
      </div>

      {/* Command Details */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <Lightning weight="fill" className="w-4 h-4 text-slate-400" /> Connection Details
        </h2>
        <div className="space-y-2">
          {server.command && <Row label="Command" value={server.command} mono />}
          {server.args.length > 0 && <Row label="Args" value={server.args.join(" ")} mono />}
          {server.envVarNames.length > 0 && (
            <div>
              <span className="text-[13px] text-slate-500">Env Variables</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {server.envVarNames.map((v) => (
                  <span key={v} className="text-[12px] font-mono bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg">{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Owner Agents */}
      {server.configOwnerAgents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Owner Agents</h2>
          <div className="flex gap-1.5 flex-wrap">
            {server.configOwnerAgents.map((a) => (
              <Link key={a} to={`/agents/${a}`} className="text-[12px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors">{a}</Link>
            ))}
          </div>
        </div>
      )}

      {/* Tools */}
      {server.tools.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Wrench weight="fill" className="w-4 h-4 text-blue-500" /> Tools ({server.tools.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {server.tools.map((t) => (
              <span key={t} className="text-[12px] font-mono bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {server.resources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Resources ({server.resources.length})</h2>
          <div className="flex gap-1.5 flex-wrap">
            {server.resources.map((r) => (
              <span key={r} className="text-[12px] font-mono bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg">{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex gap-4 text-[13px]">
      <span className="w-24 text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-700 ${mono ? "font-mono text-[12px] bg-slate-50 px-2 py-0.5 rounded" : ""}`}>{value ?? "-"}</span>
    </div>
  );
}

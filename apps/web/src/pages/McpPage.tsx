import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plug, Circle, Wrench } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { McpServer } from "../api/client";

const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  healthy:     { label: "Healthy", color: "text-emerald-600", bg: "bg-emerald-50" },
  unhealthy:   { label: "Unhealthy", color: "text-red-600", bg: "bg-red-50" },
  unreachable: { label: "Unreachable", color: "text-red-600", bg: "bg-red-50" },
  checking:    { label: "Checking", color: "text-blue-600", bg: "bg-blue-50" },
  unknown:     { label: "Unknown", color: "text-slate-500", bg: "bg-slate-100" },
};

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getMcpServers(200).then((r) => setServers(r.data)).finally(() => setLoading(false));
  }, []);

  const healthy = servers.filter((s) => s.healthStatus === "healthy").length;

  if (loading) return <ListSkeleton rows={4} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Plug weight="fill" className="w-5 h-5 text-orange-500" />
          MCP Servers
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          {servers.length} servers · {healthy} healthy
        </p>
      </div>

      {servers.length === 0 ? (
        <EmptyState icon={Plug} title="No MCP servers" description="Run a scan to detect MCP configurations." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-medium bg-slate-50/80 border-b border-slate-100">
                <th className="pl-5 pr-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium w-20">Transport</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell">Command</th>
                <th className="px-3 py-3 font-medium w-28">Used By</th>
                <th className="px-3 py-3 font-medium w-24">Health</th>
                <th className="px-3 py-3 font-medium w-16 text-center">Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {servers.map((s) => {
                const hc = (HEALTH_CONFIG[s.healthStatus] ?? HEALTH_CONFIG.unknown)!;
                return (
                  <tr key={s.id} onClick={() => navigate(`/mcp-servers/${s.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                    <td className="pl-5 pr-3 py-3">
                      <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                        {s.name}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                        {s.transport}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <code className="text-[12px] text-slate-500 font-mono">{s.command ?? "-"}</code>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12px] text-slate-500">
                        {s.configOwnerAgents.length > 0 ? s.configOwnerAgents.join(", ") : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${hc.bg} ${hc.color}`}>
                        <Circle weight="fill" className="w-1.5 h-1.5" />
                        {hc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[12px]">
                        <Wrench weight="regular" className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-600 tabular-nums">{s.tools.length}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ComponentType<any>;
  title: string; description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
      <Icon weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <p className="text-[13px] text-slate-400 mt-1">{description}</p>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-5">
      <div className="skeleton h-10 w-48 rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-lg" />
      ))}
    </div>
  );
}

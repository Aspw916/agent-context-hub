import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Robot, PuzzlePiece, Plug, Star, FolderOpen,
  Article, ImageSquare, CalendarCheck, Database,
  Circle, Warning, CloudArrowUp, Lightning,
  ArrowRight, Clock
} from "@phosphor-icons/react";
import { api } from "../api/client";
import type { HubOverview } from "../api/client";

/* ── Source color map ── */
const SRC_CONFIG: Record<string, { color: string; bg: string; ring: string }> = {
  WorkBuddy:      { color: "#4263eb", bg: "#eef1ff", ring: "ring-blue-500/20" },
  Codex:           { color: "#0ca678", bg: "#e6fcf5", ring: "ring-emerald-500/20" },
  Hermes:          { color: "#f76707", bg: "#fff4e6", ring: "ring-orange-500/20" },
  Cursor:          { color: "#ae3ec9", bg: "#f8f0fc", ring: "ring-purple-500/20" },
  "Claude Desktop":{ color: "#e03131", bg: "#fff5f5", ring: "ring-red-500/20" },
  unknown:         { color: "#868e96", bg: "#f8f9fa", ring: "ring-slate-500/20" },
};

const AGENT_COLORS = ["#4263eb", "#0ca678", "#f76707", "#ae3ec9", "#e03131"];

export default function OverviewPage() {
  const [data, setData] = useState<HubOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getOverview()
      .then((d: HubOverview) => setData(d))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <PageMessage icon={Warning} text={`Failed to load: ${error}`} tone="danger" />;
  if (!data) return <DashboardSkeleton />;

  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const maxSkillCount = data.skillDistribution
    ? Math.max(...Object.values(data.skillDistribution), 1)
    : 1;

  const statCards = [
    { label: "Agents",       value: data.counts.agents,       icon: Robot,         color: "#4263eb", href: "/agents" },
    { label: "Skills",       value: data.counts.skills,       icon: PuzzlePiece,    color: "#0ca678", href: "/skills" },
    { label: "MCP Servers",  value: data.counts.mcpServers,   icon: Plug,           color: "#f76707", href: "/mcp-servers" },
    { label: "Experts",      value: data.counts.experts,      icon: Star,           color: "#ae3ec9", href: "/experts" },
  ];

  const secondaryStats = [
    { label: "Projects", value: data.counts.projects ?? 0, icon: FolderOpen,     href: "/projects" },
    { label: "Context",  value: data.counts.contextItems ?? 0, icon: Article,  href: "/context" },
    { label: "Artifacts", value: data.counts.artifacts ?? 0, icon: ImageSquare,   href: "/artifacts" },
    { label: "Events",   value: data.counts.events ?? 0,       icon: CalendarCheck,  href: "/events" },
  ];

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Soft glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400/80">
                Dashboard
              </span>
              <span className="w-1 h-1 rounded-full bg-blue-400/30" />
              <span className="text-[11px] text-slate-500">
                {data.lastScanAt ? timeAgo(new Date(data.lastScanAt)) : "never scanned"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Agent Context Hub
            </h1>
            <p className="text-slate-400 mt-1.5 text-sm max-w-lg leading-relaxed">
              {total} total assets managed across {data.counts.agents} agents.
              {(data.counts.skills ?? 0) > 0 && ` ${data.counts.skills} skills ready for reuse.`}
            </p>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusPill label="Web" active={data.webStatus === "running"} icon={CloudArrowUp} />
            <StatusPill label="MCP" active={data.mcpStatus === "running"} icon={Plug} />
            <StatusPill label="DB"  active={data.dbStatus === "connected"} icon={Database} />
          </div>
        </div>
      </div>

      {/* ── Primary Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.href} className="group">
              <div
                className="relative bg-white rounded-xl border border-slate-200/80 p-4
                           transition-all duration-200 hover:shadow-md hover:border-slate-300
                           hover:-translate-y-0.5 cursor-pointer overflow-hidden"
              >
                {/* Accent stripe (not border-left!) */}
                <div
                  className="absolute top-0 left-0 w-full h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: card.color }}
                />
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-[12px] text-slate-500 font-medium">{card.label}</div>
                    <div className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">
                      {card.value}
                    </div>
                  </div>
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200"
                    style={{ backgroundColor: `${card.color}12` }}
                  >
                    <Icon weight="fill" className="w-[18px] h-[18px]" style={{ color: card.color }} />
                  </div>
                </div>
                {/* Subtle hover arrow */}
                <ArrowRight
                  weight="bold"
                  className="absolute bottom-3 right-3 w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: Main content (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Skill Distribution */}
          {data.skillDistribution && Object.keys(data.skillDistribution).length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200/80 p-5 animate-slide-in">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <PuzzlePiece weight="fill" className="w-4 h-4 text-emerald-500" />
                Skill Distribution
              </h2>
              <div className="space-y-3">
                {Object.entries(data.skillDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([src, count]) => {
                    const cfg = (SRC_CONFIG[src] ?? SRC_CONFIG.unknown)!;
                    const pct = Math.round((count / maxSkillCount) * 100);
                    return (
                      <div key={src} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.color }}
                            />
                            <span className="text-[13px] font-medium text-slate-700">{src}</span>
                          </div>
                          <span className="text-[13px] font-semibold text-slate-500 tabular-nums">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: cfg.color,
                              minWidth: pct > 0 ? "4px" : "0",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Agent Asset Matrix */}
          {data.agentMatrix.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200/80 p-5 animate-slide-in">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Robot weight="fill" className="w-4 h-4 text-blue-500" />
                Agent Asset Breakdown
              </h2>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[12px] text-slate-400 font-medium border-b border-slate-100">
                      <th className="pb-2.5 font-medium">Agent</th>
                      <th className="pb-2.5 font-medium text-center w-16">Skills</th>
                      <th className="pb-2.5 font-medium text-center w-16">MCP</th>
                      <th className="pb-2.5 font-medium text-center w-20">Experts</th>
                      <th className="pb-2.5 font-medium text-right w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.agentMatrix.map((a, i) => (
                      <tr
                        key={a.agentId}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        onClick={() => window.location.hash = `#/agents/${a.agentId}`}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }}
                            >
                              {a.agentName.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                              {a.agentName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`tabular-nums text-[13px] font-medium ${a.skills > 0 ? "text-slate-700" : "text-slate-300"}`}>
                            {a.skills}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`tabular-nums text-[13px] font-medium ${a.mcpServers > 0 ? "text-slate-700" : "text-slate-300"}`}>
                            {a.mcpServers}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`tabular-nums text-[13px] font-medium ${a.experts > 0 ? "text-slate-700" : "text-slate-300"}`}>
                            {a.experts}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                              ["WorkBuddy", "Codex", "Hermes"].includes(a.agentName)
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Circle
                              weight="fill"
                              className={`w-1.5 h-1.5 ${
                                ["WorkBuddy", "Codex", "Hermes"].includes(a.agentName)
                                  ? "text-emerald-500"
                                  : "text-slate-400"
                              }`}
                            />
                            {["WorkBuddy", "Codex", "Hermes"].includes(a.agentName) ? "active" : "idle"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* ── Right: Side info (1/3) ── */}
        <div className="space-y-5 animate-slide-in">
          {/* System Info */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Database weight="fill" className="w-4 h-4 text-slate-500" />
              System
            </h2>
            <div className="space-y-3">
              <InfoLine label="Last Scan" value={data.lastScanAt ? timeAgo(new Date(data.lastScanAt)) : "Never"} icon={Clock} />
              <InfoLine label="Total Assets" value={total.toLocaleString()} />
              <InfoLine label="Data Directory" value="~/.agent-context-hub" mono />
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Other Assets</h2>
            <div className="space-y-1">
              {secondaryStats.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.label}
                    to={s.href}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon weight="regular" className="w-4 h-4 text-slate-400" />
                      <span className="text-[13px] text-slate-600">{s.label}</span>
                    </div>
                    <span className={`text-[13px] font-semibold tabular-nums ${s.value > 0 ? "text-slate-800" : "text-slate-300"}`}>
                      {s.value}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Attention list */}
          {data.attentionList.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200/80 p-5">
              <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <Warning weight="fill" className="w-4 h-4" />
                Needs Attention
                <span className="text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium ml-auto">
                  {data.attentionList.length}
                </span>
              </h2>
              <div className="space-y-2">
                {data.attentionList.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className={`text-[12px] p-2.5 rounded-lg border leading-relaxed ${
                      item.type === "error"
                        ? "border-red-200 bg-red-50/60 text-red-700"
                        : "border-amber-200 bg-amber-50/60 text-amber-700"
                    }`}
                  >
                    <span className="font-semibold uppercase text-[10px] tracking-wide opacity-70">{item.entity}</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    {item.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatusPill({ label, active, icon: Icon }: { label: string; active: boolean; icon: React.ComponentType<any> }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
        active
          ? "bg-white/15 text-white backdrop-blur-sm"
          : "bg-red-400/20 text-red-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.4)]" : "bg-red-400"}`} />
      {label}
    </span>
  );
}

function InfoLine({ label, value, icon: Icon, mono }: { label: string; value: string; icon?: React.ComponentType<any>; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {Icon && <Icon weight="regular" className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-[12px] text-slate-500">{label}</span>
      </div>
      <span className={`text-[13px] font-medium text-slate-800 ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function PageMessage({ icon: Icon, text, tone }: { icon: React.ComponentType<any>; text: string; tone: "danger" | "info" }) {
  const styles = tone === "danger"
    ? "bg-red-50 border-red-200 text-red-600"
    : "bg-blue-50 border-blue-200 text-blue-600";
  return (
    <div className={`flex items-center justify-center py-20 ${styles} rounded-xl border`}>
      <div className="text-center space-y-3">
        <Icon weight="regular" className="w-10 h-10 mx-auto opacity-50" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-36 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
        <div className="space-y-5">
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Utility ── */
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

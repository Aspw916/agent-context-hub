import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PuzzlePiece, MagnifyingGlass, CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Skill } from "../api/client";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  incomplete_metadata: { label: "Incomplete", className: "bg-amber-50 text-amber-700 border-amber-200", icon: WarningCircle },
  missing_file: { label: "Missing", className: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  duplicate: { label: "Duplicate", className: "bg-purple-50 text-purple-700 border-purple-200", icon: WarningCircle },
  disabled: { label: "Disabled", className: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle },
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.getSkills(200).then((r) => setSkills(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = skills.filter((s) => {
    if (filter && s.status !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = skills.filter((s) => s.status === "active").length;
  const warningCount = skills.filter((s) => s.status !== "active").length;

  if (loading) return <ListSkeleton rows={8} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <PuzzlePiece weight="fill" className="w-5 h-5 text-emerald-500" />
            Skills
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5 flex items-center gap-3">
            {skills.length} skills total
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 font-medium">{activeCount} active</span>
            {warningCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-amber-600 font-medium">{warningCount} need attention</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-48 h-9 pl-9 pr-3 text-[13px] bg-white border border-slate-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                         placeholder:text-slate-400 transition-all"
            />
          </div>
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="incomplete_metadata">Incomplete</option>
            <option value="missing_file">Missing</option>
            <option value="duplicate">Duplicate</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {skills.length === 0 ? (
        <EmptyState icon={PuzzlePiece} title="No skills found" description="Run a scan to detect installed skills." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MagnifyingGlass} title="No results" description="Try adjusting your search or filter." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-medium bg-slate-50/80 border-b border-slate-100">
                <th className="pl-5 pr-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium w-24">Source</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell">Tags</th>
                <th className="px-3 py-3 font-medium w-28">Status</th>
                <th className="px-3 py-3 font-medium hidden lg:table-cell w-40">Compatible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((s) => {
                const cfg = (STATUS_CONFIG[s.status] ?? STATUS_CONFIG.disabled)!;
                const StatusIcon = cfg.icon;
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/skills/${s.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="pl-5 pr-3 py-3">
                      <div>
                        <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                          {s.name}
                        </span>
                        {s.description && (
                          <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12px] text-slate-500 font-medium">{s.source ?? "local"}</span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {s.tags.length === 0 ? (
                          <span className="text-[12px] text-slate-300">none</span>
                        ) : (
                          s.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                              {t}
                            </span>
                          ))
                        )}
                        {s.tags.length > 3 && (
                          <span className="text-[11px] text-slate-400">+{s.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cfg.className}`}>
                        <StatusIcon weight="fill" className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {s.compatibleAgents.length === 0 ? (
                          <span className="text-[12px] text-slate-300">all</span>
                        ) : (
                          s.compatibleAgents.slice(0, 3).map((a) => (
                            <span key={a} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">
                              {a}
                            </span>
                          ))
                        )}
                      </div>
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

/* ── Helpers ── */

function EmptyState({ icon: Icon, title, description }: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
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
      <div className="bg-white rounded-xl border border-slate-200/80">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-14 mx-3 my-2 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

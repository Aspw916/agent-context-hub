import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PuzzlePiece, ArrowLeft, Trash, Tag, Lightning, Robot } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Skill } from "../api/client";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700",
  deprecated: "bg-amber-50 text-amber-700",
  error:     "bg-red-50 text-red-700",
  unknown:   "bg-slate-100 text-slate-600",
};

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getSkill(id).then(setSkill).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!window.confirm(`Delete skill "${skill?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteSkill(id);
      navigate("/skills");
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    }
    setDeleting(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;
  if (error) return <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>;
  if (!skill) return <div className="text-slate-400 text-sm">Skill not found</div>;

  const statusClass = STATUS_STYLE[skill.status] ?? STATUS_STYLE.unknown;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/skills" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Skills
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
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <PuzzlePiece weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{skill.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] px-2.5 py-0.5 rounded-md font-medium ${statusClass}`}>{skill.status}</span>
              {skill.source && <span className="text-[12px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">from {skill.source}</span>}
            </div>
          </div>
        </div>
        {skill.description && (
          <p className="text-[13px] text-slate-600 mt-4 leading-relaxed">{skill.description}</p>
        )}
      </div>

      {/* Paths */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-3">File Locations</h2>
        <div className="space-y-2">
          <Row label="Root Path" value={skill.rootPath} mono />
          <Row label="Skill File" value={skill.skillFilePath} mono />
        </div>
      </div>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Tag weight="fill" className="w-4 h-4 text-slate-400" /> Tags ({skill.tags.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {skill.tags.map((t) => (
              <span key={t} className="text-[12px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Capabilities */}
      {skill.capabilities.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Lightning weight="fill" className="w-4 h-4 text-amber-500" /> Capabilities ({skill.capabilities.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {skill.capabilities.map((c) => (
              <span key={c} className="text-[12px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Compatible Agents */}
      {skill.compatibleAgents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Robot weight="fill" className="w-4 h-4 text-indigo-500" /> Compatible Agents ({skill.compatibleAgents.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {skill.compatibleAgents.map((a) => (
              <Link key={a} to={`/agents/${a}`} className="text-[12px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors">{a}</Link>
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

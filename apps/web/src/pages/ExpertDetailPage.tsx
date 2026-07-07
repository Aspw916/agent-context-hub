import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, ArrowLeft, Trash, Lightning, Robot } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Expert } from "../api/client";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700",
  disabled:  "bg-red-50 text-red-700",
  unknown:   "bg-slate-100 text-slate-600",
};

export default function ExpertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getExpert(id).then(setExpert).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!window.confirm(`Delete expert "${expert?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteExpert(id);
      navigate("/experts");
    } catch (e: any) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;
  if (error) return <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>;
  if (!expert) return <div className="text-slate-400 text-sm">Expert not found</div>;

  const statusClass = STATUS_STYLE[expert.status] ?? STATUS_STYLE.unknown;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/experts" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Experts
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
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Star weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{expert.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] px-2.5 py-0.5 rounded-md font-medium ${statusClass}`}>{expert.status}</span>
              {expert.source && <span className="text-[12px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">from {expert.source}</span>}
            </div>
          </div>
        </div>
        {expert.description && (
          <p className="text-[13px] text-slate-600 mt-4 leading-relaxed">{expert.description}</p>
        )}
      </div>

      {/* Path */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-3">File Locations</h2>
        <div className="text-[12px] font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600">{expert.rootPath}</div>
      </div>

      {/* Capabilities */}
      {expert.capabilities.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Lightning weight="fill" className="w-4 h-4 text-amber-500" /> Capabilities ({expert.capabilities.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {expert.capabilities.map((c) => (
              <span key={c} className="text-[12px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Compatible Agents */}
      {expert.compatibleAgents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Robot weight="fill" className="w-4 h-4 text-indigo-500" /> Compatible Agents ({expert.compatibleAgents.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {expert.compatibleAgents.map((a) => (
              <Link key={a} to={`/agents/${a}`} className="text-[12px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors">{a}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

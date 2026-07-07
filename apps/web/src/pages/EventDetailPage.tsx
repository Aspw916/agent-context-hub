import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CalendarCheck, ArrowLeft, Trash, Clock, Robot } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { AgentEvent } from "../api/client";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  scan:        { bg: "bg-blue-50",   text: "text-blue-700" },
  task:        { bg: "bg-emerald-50", text: "text-emerald-700" },
  artifact:    { bg: "bg-amber-50",   text: "text-amber-700" },
  handoff:     { bg: "bg-indigo-50",  text: "text-indigo-700" },
  error:       { bg: "bg-red-50",     text: "text-red-700" },
  config:      { bg: "bg-purple-50",  text: "text-purple-700" },
  unknown:     { bg: "bg-slate-100",  text: "text-slate-600" },
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AgentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getEvent(id).then(setEvent).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!window.confirm(`Delete event "${event?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteEvent(id);
      navigate("/events");
    } catch (e: any) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;
  if (error) return <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>;
  if (!event) return <div className="text-slate-400 text-sm">Event not found</div>;

  const tc = (TYPE_COLORS[event.eventType] ?? TYPE_COLORS.unknown)!;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/events" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Events
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
            <CalendarCheck weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] px-2.5 py-0.5 rounded-md font-medium ${tc.bg} ${tc.text}`}>{event.eventType}</span>
              {event.createdAt && (
                <span className="flex items-center gap-1 text-[12px] text-slate-400">
                  <Clock weight="regular" className="w-3.5 h-3.5" />
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Metadata</h2>
        <div className="space-y-2">
          {event.projectId && <Row label="Project" value={event.projectId} />}
          {event.agentId && (
            <div className="flex gap-4 text-[13px]">
              <span className="w-24 text-slate-500 shrink-0 flex items-center gap-1">
                <Robot weight="regular" className="w-3.5 h-3.5" /> Agent
              </span>
              <Link to={`/agents/${event.agentId}`} className="text-[13px] text-indigo-600 hover:underline">{event.agentId}</Link>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {event.summary && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Summary</h2>
          <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{event.summary}</p>
        </div>
      )}

      {/* Body */}
      {event.body && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Body</h2>
          <pre className="text-[12px] text-slate-600 bg-slate-50 p-4 rounded-xl max-h-64 overflow-auto whitespace-pre-wrap font-mono">{event.body}</pre>
        </div>
      )}

      {/* Related */}
      {(event.relatedResourceIds.length > 0 || event.relatedArtifactIds.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Related</h2>
          {event.relatedResourceIds.length > 0 && (
            <div>
              <span className="text-[13px] text-slate-500">Resources ({event.relatedResourceIds.length})</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {event.relatedResourceIds.map((r) => (
                  <code key={r} className="text-[12px] bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg font-mono">{r}</code>
                ))}
              </div>
            </div>
          )}
          {event.relatedArtifactIds.length > 0 && (
            <div className="mt-3">
              <span className="text-[13px] text-slate-500">Artifacts ({event.relatedArtifactIds.length})</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {event.relatedArtifactIds.map((a) => (
                  <Link key={a} to={`/artifacts`} className="text-[12px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors font-mono">{a}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4 text-[13px]">
      <span className="w-24 text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-700">{value ?? "-"}</span>
    </div>
  );
}

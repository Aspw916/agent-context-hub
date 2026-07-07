import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FolderOpen, ArrowLeft, Trash, Code, Robot, Article, ImageSquare } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Project, ContextItem, Artifact } from "../api/client";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getProject(id),
      api.getContext(200, 0, id),
      api.getArtifacts(200, 0, id),
    ])
      .then(([p, ctx, art]) => {
        setProject(p);
        setContextItems(ctx.data);
        setArtifacts(art.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || deleting) return;
    if (!window.confirm(`Delete project "${project?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteProject(id);
      navigate("/projects");
    } catch (e: any) { alert("Delete failed: " + e.message); }
    setDeleting(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>;
  if (error) return <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{error}</div>;
  if (!project) return <div className="text-slate-400 text-sm">Project not found</div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/projects" className="flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Projects
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
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FolderOpen weight="fill" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[12px] px-2.5 py-0.5 rounded-md font-medium ${
                project.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}>{project.status}</span>
              {project.description && <span className="text-[12px] text-slate-400 truncate max-w-[300px]">{project.description}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 mb-3">Project Info</h2>
        <div className="space-y-2">
          {project.rootPath && <Row label="Root Path" value={project.rootPath} mono />}
          <Row label="Created" value={new Date(project.createdAt).toLocaleDateString()} />
          <Row label="Updated" value={new Date(project.updatedAt).toLocaleDateString()} />
        </div>
      </div>

      {/* Tech Stack */}
      {project.techStack.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Code weight="fill" className="w-4 h-4 text-blue-500" /> Tech Stack
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {project.techStack.map((t) => (
              <span key={t} className="text-[12px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Associated Agents */}
      {project.agents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <Robot weight="fill" className="w-4 h-4 text-indigo-500" /> Agents ({project.agents.length})
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {project.agents.map((a) => (
              <Link key={a} to={`/agents/${a}`} className="text-[12px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors">{a}</Link>
            ))}
          </div>
        </div>
      )}

      {/* Context Items */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <Article weight="fill" className="w-4 h-4 text-purple-500" /> Context Items ({contextItems.length})
        </h2>
        {contextItems.length === 0 ? (
          <p className="text-[13px] text-slate-400">No context items for this project.</p>
        ) : (
          <div className="space-y-2 stagger">
            {contextItems.map((c) => (
              <Link key={c.id} to={`/context`} className="block p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-slate-800">{c.title}</span>
                  <span className="text-[12px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md">{c.type}</span>
                </div>
                {c.confidence != null && (
                  <span className="text-[12px] text-slate-400 mt-1">Confidence: {Math.round(c.confidence * 100)}%</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Artifacts */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2 mb-3">
          <ImageSquare weight="fill" className="w-4 h-4 text-amber-500" /> Artifacts ({artifacts.length})
        </h2>
        {artifacts.length === 0 ? (
          <p className="text-[13px] text-slate-400">No artifacts for this project.</p>
        ) : (
          <div className="space-y-2 stagger">
            {artifacts.map((a) => (
              <Link key={a.id} to={`/artifacts`} className="block p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-slate-800">{a.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md">{a.artifactType}</span>
                    {a.sizeBytes && <span className="text-[12px] text-slate-400">{(a.sizeBytes / 1024).toFixed(1)} KB</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
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

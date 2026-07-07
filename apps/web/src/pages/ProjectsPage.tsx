import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Project } from "../api/client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProjects().then((r) => setProjects(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ListSkeleton rows={2} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FolderOpen weight="fill" className="w-5 h-5 text-sky-500" />
          Projects
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{projects.length} projects</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <FolderOpen weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No projects yet</h3>
          <p className="text-[13px] text-slate-400 mt-1">Projects are created when agents are associated with working directories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {projects.map((p) => (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
              className="group bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-200">
              <h3 className="text-[14px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{p.name}</h3>
              {p.description && <p className="text-[12px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
              {p.rootPath && (
                <code className="text-[11px] text-slate-500 font-mono mt-2 block truncate bg-slate-50 px-2 py-1 rounded">{p.rootPath}</code>
              )}
              {p.techStack && p.techStack.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {p.techStack.map((t) => (
                    <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-5">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

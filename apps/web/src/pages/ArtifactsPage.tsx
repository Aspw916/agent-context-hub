import { useEffect, useState } from "react";
import { ImageSquare, File } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Artifact } from "../api/client";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getArtifacts().then((r) => setArtifacts(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ListSkeleton rows={3} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <ImageSquare weight="fill" className="w-5 h-5 text-pink-500" />
          Artifacts
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{artifacts.length} artifacts</p>
      </div>

      {artifacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <ImageSquare weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No artifacts yet</h3>
          <p className="text-[13px] text-slate-400 mt-1">Artifacts are created when agents produce files, images, or documents.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-medium bg-slate-50/80 border-b border-slate-100">
                <th className="pl-5 pr-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium w-20">Type</th>
                <th className="px-3 py-3 font-medium w-24">Size</th>
                <th className="px-3 py-3 font-medium w-24">Trust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {artifacts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80">
                  <td className="pl-5 pr-3 py-3">
                    <div className="flex items-center gap-2">
                      <File weight="regular" className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{a.name}</span>
                    </div>
                    {a.path && <p className="text-[12px] text-slate-400 mt-0.5 font-mono truncate">{a.path}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[12px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      {a.artifactType ?? a.mimeType ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-slate-500 font-mono">{formatBytes(a.sizeBytes ?? null)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      a.trustStatus === "trusted" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : a.trustStatus === "untrusted" ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {a.trustStatus ?? "unknown"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

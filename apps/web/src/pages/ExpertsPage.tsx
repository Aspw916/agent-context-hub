import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { Expert } from "../api/client";

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getExperts().then((r) => setExperts(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ListSkeleton rows={3} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Star weight="fill" className="w-5 h-5 text-purple-500" />
          Experts
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{experts.length} experts available</p>
      </div>

      {experts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <Star weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No experts found</h3>
          <p className="text-[13px] text-slate-400 mt-1">Run a scan or add expert packages manually.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-medium bg-slate-50/80 border-b border-slate-100">
                <th className="pl-5 pr-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium hidden md:table-cell">Capabilities</th>
                <th className="px-3 py-3 font-medium w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {experts.map((e) => (
                <tr key={e.id} onClick={() => navigate(`/experts/${e.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                  <td className="pl-5 pr-3 py-3">
                    <div>
                      <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                        {e.name}
                      </span>
                      {e.description && (
                        <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1">{e.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[12px] text-slate-500">{e.source ?? "local"}</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {e.capabilities.length === 0 ? (
                        <span className="text-[12px] text-slate-300">none</span>
                      ) : (
                        e.capabilities.slice(0, 4).map((c) => (
                          <span key={c} className="text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-medium">{c}</span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      e.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {e.status}
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

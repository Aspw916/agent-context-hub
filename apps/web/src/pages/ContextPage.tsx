import { useEffect, useState } from "react";
import { Article } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { ContextItem } from "../api/client";

export default function ContextPage() {
  const [items, setItems] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContext().then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ListSkeleton rows={3} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Article weight="fill" className="w-5 h-5 text-teal-500" />
          Context
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{items.length} context items</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <Article weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No context items</h3>
          <p className="text-[13px] text-slate-400 mt-1">Context items are generated from scans and agent interactions.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-medium bg-slate-50/80 border-b border-slate-100">
                <th className="pl-5 pr-3 py-3 font-medium">Title</th>
                <th className="px-3 py-3 font-medium w-20">Type</th>
                <th className="px-3 py-3 font-medium w-20">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="pl-5 pr-3 py-3">
                    <span className="font-medium text-slate-800">{item.title}</span>
                    {item.body && <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1">{item.body}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[12px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">{item.type}</span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-slate-500 capitalize">{item.visibility}</td>
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

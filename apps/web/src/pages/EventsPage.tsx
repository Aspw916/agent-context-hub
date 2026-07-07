import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Lightning } from "@phosphor-icons/react";
import { api } from "../api/client";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getEvents().then((r: any) => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ListSkeleton rows={3} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <CalendarCheck weight="fill" className="w-5 h-5 text-amber-500" />
          Events
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{events.length} events logged</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <CalendarCheck weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No events yet</h3>
          <p className="text-[13px] text-slate-400 mt-1">Events are generated when scans, imports, or manual operations occur.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-slate-400 font-medium bg-slate-50/80 border-b border-slate-100">
                <th className="pl-5 pr-3 py-3 font-medium">Title</th>
                <th className="px-3 py-3 font-medium w-24">Type</th>
                <th className="px-3 py-3 font-medium w-32">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.map((e: any) => (
                <tr key={e.id} onClick={() => navigate(`/events/${e.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group">
                  <td className="pl-5 pr-3 py-3">
                    <div className="flex items-center gap-2">
                      <Lightning weight="fill" className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                        {e.title ?? `${e.type} event`}
                      </span>
                    </div>
                    {e.summary && <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1 ml-5.5">{e.summary}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[12px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      {e.type ?? "generic"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-slate-400">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString() : "-"}
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

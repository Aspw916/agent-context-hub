import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "../api/client";
import type { SearchResult } from "../api/client";

const ENTITY_ROUTES: Record<string, string> = {
  agent: "/agents",
  skill: "/skills",
  mcp_server: "/mcp-servers",
  mcpserver: "/mcp-servers",
  expert: "/experts",
  project: "/projects",
  contextitem: "/context",
  context: "/context",
  artifact: "/artifacts",
  event: "/events",
};

const ENTITY_ICONS: Record<string, string> = {
  agent: "Robot",
  skill: "PuzzlePiece",
  mcp_server: "Plug",
  mcpserver: "Plug",
  expert: "Star",
  project: "FolderOpen",
  contextitem: "Article",
  context: "Article",
  artifact: "ImageSquare",
  event: "CalendarCheck",
};

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    api.search(query).then((r) => setResults(r.data)).finally(() => setLoading(false));
  }, [query]);

  const handleSearch = () => {
    if (localQuery.trim()) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", localQuery.trim());
      window.history.pushState({}, "", url.toString());
      setLoading(true);
      api.search(localQuery.trim()).then((r) => setResults(r.data)).finally(() => setLoading(false));
    }
  };

  const getEntityLink = (r: SearchResult) => {
    const routeBase = ENTITY_ROUTES[r.entityType.toLowerCase()] ?? "";
    return `${routeBase}/${r.entityId}`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <MagnifyingGlass weight="fill" className="w-5 h-5 text-slate-500" />
          Search
        </h1>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-lg">
          <MagnifyingGlass weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search across agents, skills, MCP, experts..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-10 pl-9 pr-4 text-[14px] bg-white border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                       placeholder:text-slate-400 transition-all"
          />
        </div>
        <button
          onClick={handleSearch}
          className="h-10 px-5 text-[13px] font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors duration-150"
        >
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : !query ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <MagnifyingGlass weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">Enter a search query</h3>
          <p className="text-[13px] text-slate-400 mt-1">Search across all entities: agents, skills, MCP servers, experts, and projects.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
          <MagnifyingGlass weight="regular" className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No results</h3>
          <p className="text-[13px] text-slate-400 mt-1">No results found for "{query}". Try a different query.</p>
        </div>
      ) : (
        <div>
          <p className="text-[13px] text-slate-500 mb-3">{results.length} results for "{query}"</p>
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden divide-y divide-slate-50 stagger">
            {results.map((r, i) => (
              <Link key={i} to={getEntityLink(r)} className="block p-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium uppercase tracking-wide">
                    {r.entityType}
                  </span>
                  <span className="text-[14px] font-medium text-slate-800">{r.title}</span>
                </div>
                {r.snippet && (
                  <p className="text-[12px] text-slate-400 mt-1 line-clamp-2 ml-[calc(3rem+8px)]">{r.snippet}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

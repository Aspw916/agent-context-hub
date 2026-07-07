// DIRECT IMPORT - no icons.ts middle layer
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { api, connectSSE } from "../api/client";
import { House } from "@phosphor-icons/react";
import { Robot } from "@phosphor-icons/react";
import { PuzzlePiece } from "@phosphor-icons/react";
import { Plug } from "@phosphor-icons/react";
import { Star } from "@phosphor-icons/react";
import { FolderOpen } from "@phosphor-icons/react";
import { Article } from "@phosphor-icons/react";
import { ImageSquare } from "@phosphor-icons/react";
import { CalendarCheck } from "@phosphor-icons/react";
import { Gear } from "@phosphor-icons/react";
import { Lightning } from "@phosphor-icons/react";
import { Circle } from "@phosphor-icons/react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { ArrowRight } from "@phosphor-icons/react";
import { Clock } from "@phosphor-icons/react";
import { Dot } from "@phosphor-icons/react";
import { Spinner } from "@phosphor-icons/react";
import { Question } from "@phosphor-icons/react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { Download } from "@phosphor-icons/react";
import { ArrowUpRight } from "@phosphor-icons/react";

// Fallback aliases for non-existent icons
const Export = Download;
const Import = Download;

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: House },
  { to: "/agents", label: "Agents", icon: Robot },
  { to: "/skills", label: "Skills", icon: PuzzlePiece },
  { to: "/mcp-servers", label: "MCP Servers", icon: Plug },
  { to: "/experts", label: "Experts", icon: Star },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/context", label: "Context", icon: Article },
  { to: "/artifacts", label: "Artifacts", icon: ImageSquare },
  { to: "/events", label: "Events", icon: CalendarCheck },
];

const BOTTOM_NAV = [
  { to: "/settings", label: "Settings", icon: Gear },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const q = searchQuery.trim();
      if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col flex-shrink-0 bg-slate-900 text-slate-400 border-r border-slate-800">
        <div className="h-14 flex items-center px-4 border-b border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <Lightning size={14} weight="fill" className="text-white" />
          </div>
          <div className="ml-2.5">
            <div className="text-white text-[13px] font-semibold leading-tight">Agent Hub</div>
            <div className="text-[10px] text-slate-500 leading-tight">v0.1.0</div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg
                  transition-colors duration-150
                  ${isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }
                `}
              >
                <Icon size={17} weight={isActive ? "fill" : "regular"} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-2.5 py-2 border-t border-slate-800">
          {BOTTOM_NAV.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg
                  transition-colors duration-150
                  ${isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }
                `}
              >
                <Icon size={17} weight={isActive ? "fill" : "regular"} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <StatusBar />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-200 bg-white flex items-center px-5 gap-3 flex-shrink-0">
          <div className="flex-1 max-w-lg relative">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="global-search"
              type="text"
              placeholder="Search agents, skills, MCP servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full h-9 pl-9 pr-[70px] text-[13px] bg-slate-50 border border-slate-200
                rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100
                placeholder:text-slate-400 transition-shadow"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium
              text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              Ctrl+K
            </kbd>
          </div>
          <div className="flex-1" />
          <ScanButton />
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function StatusBar() {
  const [status, setStatus] = useState<"connected" | "error" | "loading">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json().then((d: any) => {
        setStatus(d.status === "ok" ? "connected" : "error");
      }))
      .catch(() => setStatus("error"));

    const close = connectSSE((_data: any) => {});
    return close;
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-slate-500">
      <Dot size={12} weight="fill" className={
        status === "connected" ? "text-emerald-400"
        : status === "loading" ? "text-amber-400 animate-pulse"
        : "text-red-400"
      } />
      <span>{message || (status === "connected" ? "Connected" : status === "loading" ? "Connecting..." : "Disconnected")}</span>
    </div>
  );
}

function ScanButton() {
  const [scanning, setScanning] = useState(false);

  const handleScan = useCallback(async () => {
    setScanning(true);
    try { await api.runScan(); } catch (e) { console.error(e); }
    setScanning(false);
  }, []);

  return (
    <button
      onClick={handleScan}
      disabled={scanning}
      className="flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium bg-slate-900 text-white
        rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors"
    >
      {scanning ? (
        <Spinner size={14} className="animate-spin" />
      ) : (
        <ArrowClockwise size={14} />
      )}
      <span>{scanning ? "Scanning..." : "Scan"}</span>
    </button>
  );
}

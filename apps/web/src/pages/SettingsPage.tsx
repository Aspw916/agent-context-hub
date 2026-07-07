import { useState } from "react";
import { Gear, Download, Upload, Database, FolderOpen, Lightning, Clock } from "@phosphor-icons/react";
import { api } from "../api/client";

const SCAN_ROOTS = [
  "~/.workbuddy/skills/",
  "~/.codex/skills/",
  "~/.cursor/skills/",
  "~/.workbuddy/mcp.json",
  "~/.workbuddy/experts/",
];

const ROADMAP = [
  { title: "Automation", desc: "Cron/rrule task management" },
  { title: "Git Sync", desc: "Multi-device synchronization" },
  { title: "Health Checks", desc: "Batch MCP server connectivity testing" },
];

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agent-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
    setExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.importData(data);
      setImportMsg(`Imported: ${Object.entries(result.imported).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
    } catch (e: any) {
      setImportMsg(`Import failed: ${e.message}`);
    }
    setImporting(false);
    e.target.value = "";
  };

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
        <Gear weight="fill" className="w-5 h-5 text-slate-500" />
        Settings
      </h1>

      {/* ── Data Directory ── */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <Database weight="fill" className="w-4 h-4 text-slate-500" />
          Data Directory
        </h2>
        <code className="text-[12px] bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-mono inline-block">
          ~/.agent-context-hub/
        </code>
        <p className="text-[12px] text-slate-400 mt-2">
          Override with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">AGENT_HUB_HOME</code> environment variable.
        </p>
      </section>

      {/* ── Scan Roots ── */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <Lightning weight="fill" className="w-4 h-4 text-blue-500" />
          Scan Roots
        </h2>
        <p className="text-[13px] text-slate-500 mb-3 leading-relaxed">
          The scanner automatically detects WorkBuddy, Codex, Claude Desktop, Cursor, and Hermes paths.
        </p>
        <div className="space-y-1.5">
          {SCAN_ROOTS.map((root) => (
            <div key={root} className="flex items-center gap-2 text-[13px]">
              <FolderOpen weight="regular" className="w-4 h-4 text-slate-400 shrink-0" />
              <code className="text-slate-600 font-mono text-[12px]">{root}</code>
            </div>
          ))}
        </div>
      </section>

      {/* ── Export / Import ── */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Download weight="fill" className="w-4 h-4 text-slate-500" />
          Export / Import
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="h-9 px-4 text-[13px] font-medium bg-slate-900 text-white rounded-lg
                       hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center gap-2 transition-colors duration-150"
          >
            <Download weight="regular" className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Backup"}
          </button>
          <label className="h-9 px-4 text-[13px] font-medium bg-white border border-slate-200 rounded-lg
                          hover:bg-slate-50 cursor-pointer flex items-center gap-2 transition-colors duration-150 text-slate-700">
            <Upload weight="regular" className="w-4 h-4" />
            {importing ? "Importing..." : "Import Backup"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
        {importMsg && (
          <div className={`mt-3 text-[12px] p-3 rounded-lg border leading-relaxed ${
            importMsg.startsWith("Import failed")
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {importMsg}
          </div>
        )}
      </section>

      {/* ── MCP Health ── */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <Lightning weight="fill" className="w-4 h-4 text-amber-500" />
          MCP Health Check
        </h2>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Navigate to any MCP server detail page to run health checks.
          Available from the <strong>MCP Servers</strong> list: click any server to access its health check panel.
        </p>
      </section>

      {/* ── Roadmap ── */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <Clock weight="fill" className="w-4 h-4 text-purple-500" />
          Coming in V2
        </h2>
        <div className="space-y-2">
          {ROADMAP.map((item) => (
            <div key={item.title} className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-300 shrink-0" />
              <div>
                <div className="text-[13px] font-medium text-slate-700">{item.title}</div>
                <div className="text-[12px] text-slate-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

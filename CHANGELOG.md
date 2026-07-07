# Changelog

## [0.1.0] — 2026-07-02

### Added
- Local-first control panel for managing AI agents and their assets
- Multi-agent scanning: auto-detects WorkBuddy, Claude Desktop, Cursor, Codex, Augment, Copilot, Windsurf
- Skill registry with auto-discovery from SKILL.md files
- MCP server registry from Claude Desktop / WorkBuddy config files
- Expert registry from agent expert directories
- Project auto-detection via .git projects
- Context item and artifact tracking
- Event timeline for debugging agent activity
- Global search across all assets (FTS5-powered)
- REST API with 26+ endpoints
- SSE-based real-time event streaming
- Scan-on-demand for live asset updates
- React + Tailwind CSS web console with responsive design
- CLI tool for scripting and automation
- MCP protocol server for integration with MCP-compatible clients

### Architecture
- 7-package monorepo (apps/server, apps/web, apps/cli, packages/shared, packages/core, packages/scanner, packages/mcp-server)
- TypeScript strict mode across all packages
- SQLite (better-sqlite3) for storage with FTS5 search
- Hono for lightweight HTTP API
- Zod for runtime schema validation
- Vite + React 18 + Tailwind CSS for frontend
- SSE for real-time updates

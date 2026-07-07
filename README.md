# Agent Context Hub

A local-first control panel for your AI agents and their assets. Discover, monitor, and manage all your AI tools, MCP servers, skills, expert packages, and context knowledge from a single dashboard.

## Features

- **Agent Discovery** - Automatically detects installed AI agents (WorkBuddy, Codex, Claude Desktop, Cursor, Hermes) and their configuration
- **Skill Registry** - Browse and search all skill packages across your agents, with metadata quality tracking
- **MCP Server Monitor** - View MCP server configurations, run health checks, track tools and resources
- **Expert Packages** - Manage expert packages and their capabilities across compatible agents
- **Project Workspaces** - Associate projects with agents, tech stacks, and context knowledge
- **Context Knowledge Base** - Track decisions, constraints, preferences, and instructions per project
- **Artifact Tracking** - Register project artifacts with trust status and provenance
- **Event Timeline** - Full activity log of scans, tasks, handoffs, and errors
- **Global Search** - Search across all entities with direct links to detail views
- **Real-time SSE** - Live event stream for instant dashboard updates
- **Export / Import** - Full data portability for backup and migration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Phosphor Icons |
| Backend | Hono + better-sqlite3 + tsx |
| Monorepo | npm workspaces (7 packages) |
| Runtime | Node.js >= 22 |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/agent-context-hub.git
cd agent-context-hub

# Install dependencies
npm install

# Start both API and web dev servers
npm run dev
```

The web console opens at **http://localhost:3737** (API serves the static build) or run them separately:

```bash
# API only (port 3737)
npm run dev -w @agent-hub/server

# Frontend only (port 3738, with Vite proxy to API)
npm run dev -w @agent-hub/web
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_HUB_HOME` | `~/.agent-context-hub` | Data directory for SQLite DB and scan results |
| `PORT` | `3737` | API server port |

## Project Structure

```
agent-context-hub/
├── apps/
│   ├── server/          # Hono API server + SQLite storage
│   ├── web/             # React + Vite + Tailwind frontend
│   └── cli/             # CLI tool for scripting
├── packages/
│   ├── shared/          # Zod schemas & shared types
│   ├── core/            # Business logic, SQLite repository
│   ├── scanner/         # File system scanner for agents/skills/MCP/experts
│   └── mcp-server/      # MCP protocol server for integration
├── fixtures/            # Development seed data
├── LICENSE
├── CONTRIBUTING.md
└── package.json         # Monorepo root
```

Key dependencies: React 18, Vite, Tailwind CSS, Phosphor Icons, Hono, better-sqlite3, Zod, gray-matter

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/overview` | Dashboard summary with counts and matrix |
| POST | `/api/scan` | Run full system scan |
| GET | `/api/agents` | List all agents (paginated) |
| GET | `/api/agents/:id` | Get agent details |
| DELETE | `/api/agents/:id` | Delete an agent |
| GET | `/api/skills` | List all skills (paginated, filterable) |
| GET | `/api/skills/:id` | Get skill details |
| DELETE | `/api/skills/:id` | Delete a skill |
| GET | `/api/mcp-servers` | List MCP servers |
| GET | `/api/mcp-servers/:id` | Get MCP server details |
| POST | `/api/mcp-servers/:id/health-check` | Run health check |
| DELETE | `/api/mcp-servers/:id` | Delete MCP server |
| GET | `/api/experts` | List experts |
| GET/DELETE | `/api/experts/:id` | Expert CRUD |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET/PATCH/DELETE | `/api/projects/:id` | Project CRUD |
| GET | `/api/context` | List context items (filterable) |
| POST | `/api/context` | Create context item |
| POST | `/api/context/:id/promote-from-event` | Promote event to context |
| GET/PATCH/DELETE | `/api/context/:id` | Context CRUD |
| GET | `/api/artifacts` | List artifacts (filterable) |
| POST | `/api/artifacts` | Create artifact |
| GET/PATCH/DELETE | `/api/artifacts/:id` | Artifact CRUD |
| GET | `/api/events` | List events (paginated) |
| POST/DELETE | `/api/events/:id` | Event CRUD |
| GET | `/api/search?q=...` | Global search |
| POST | `/api/export` | Export all data |
| POST | `/api/import` | Import data |
| GET | `/api/events/stream` | SSE real-time event stream |

## Design Philosophy

The UI follows a **Linear-inspired** minimalist design system:

- Slate neutral color palette (not warm gray)
- 12-16px rounded corners, hover lift interactions
- Skeleton loading animations with shimmer effect
- Staggered animation for list items
- No em dashes, no purple gradients, no glass morphism
- System font stack (no AI-default Inter)

## Roadmap

- **v0.2** - Automation (cron/rrule tasks), Git sync, batch MCP health checks
- **v0.3** - Plugin system, custom dashboard widgets, webhook integrations
- **v0.4** - Multi-user support, RBAC, audit logs

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit conventions, and pull request guidelines.

## License

[MIT](LICENSE) - free for personal and commercial use.

# Contributing to Agent Context Hub

Thanks for your interest in contributing!

## Development Setup

```bash
# Prerequisites: Node.js >= 22, npm >= 10

# Clone and install
git clone https://github.com/YOUR_ORG/agent-context-hub.git
cd agent-context-hub
npm install

# Run dev servers
npm run dev
# API server → http://localhost:3737
# Web console → http://localhost:3738
```

## Project Structure

```
agent-context-hub/
├── apps/
│   ├── server/      # Hono API server (port 3737)
│   ├── web/         # React + Vite frontend (port 3738)
│   └── cli/         # CLI tool
├── packages/
│   ├── shared/      # Zod schemas & shared types
│   ├── core/        # Business logic, SQLite storage
│   ├── scanner/     # File system scanner for agents/skills/MCP
│   └── mcp-server/  # MCP protocol server
├── fixtures/        # Test fixtures & sample data
└── docs/            # (future) Detailed documentation
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code refactoring
- `chore:` — maintenance, deps, build
- `test:` — tests

## Development Workflow

1. Fork and create a feature branch: `git checkout -b feat/my-feature`
2. Make changes and verify:
   ```bash
   npm run typecheck   # TypeScript check all packages
   npm run build       # Build all packages
   ```
3. Run the dev servers to test manually:
   ```bash
   npm run dev
   ```
4. Commit with conventional commit message
5. Open a Pull Request against `main`

## Code Style

- TypeScript strict mode enabled
- Use functional components with hooks for React
- Prefer `const` over `let`
- Use explicit return types for public APIs
- Keep files under 300 lines when possible

## Questions?

Open a [GitHub Discussion](https://github.com/YOUR_ORG/agent-context-hub/discussions) or [Issue](https://github.com/YOUR_ORG/agent-context-hub/issues).

# Project Setup Wizard

An interactive CLI that scaffolds modern project environments with Devbox, optional Nx workspaces, AI assistant configs, and Docker setup.

## Features
- Guided prompts for project type, language, tooling, and deployment targets.
- Generates Devbox shell config plus optional Nx workspace scaffolding.
- Optional AI assistant configs (`.gemini.json` or `.claude.json`).
- Optional Dockerfile and `docker-compose.yml` for local dev.

## Requirements
- Node.js `>=22.0.0`

## Quick Start
```bash
npm install
npm start
```

## CLI Usage
```bash
node wizard.js

# Or install locally and use the bin name
npm install -g .
project-wizard
```

## Generated Output (varies by answers)
- `devbox.json` for reproducible tooling.
- `nx.json` and `package.json` for Nx-based setups.
- `Dockerfile`, `docker-compose.yml`, and `.dockerignore` for container workflows.
- `scripts/` with helper commands and AI CLI installers.

## Documentation
- `docs/kiss-project-templates.md`

## Development
- `npm test` is currently a stub and does not run tests.

## License
MIT

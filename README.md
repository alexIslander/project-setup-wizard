# Project Setup Wizard

An interactive CLI that scaffolds modern project environments with Devbox, optional Nx workspaces, AI assistant configs, and Docker setup.

## Features
- Guided prompts for project type, language, tooling, and deployment targets.
- Generates Devbox shell config plus optional Nx workspace scaffolding.
- Optional AI assistant configs (`.gemini.json`, `.claude.json`, or `.codex.json`).
- Optional Dockerfile and `docker-compose.yml` for local dev.

## Requirements
- Node.js `>=22.0.0`

## Quick Start
```bash
pnpm install
pnpm start
```

## CLI Usage
```bash
node wizard.js

# Or install locally and use the bin name
pnpm add -g .
project-wizard
```

### Non-Interactive Defaults
Run the wizard with a preset or project type flag to skip prompts and use defaults:

```bash
node wizard.js --angular
node wizard.js --react
node wizard.js --vue
node wizard.js --node
node wizard.js --typescript
node wizard.js --java
node wizard.js --spring-boot
node wizard.js --quarkus
node wizard.js --dotnet
```

Project type shortcuts:

```bash
node wizard.js --web-app
node wizard.js --cli-tool
node wizard.js --library
node wizard.js --api-service
node wizard.js --mobile-app
node wizard.js --other
```

You can combine one preset with one project type flag (for example, `node wizard.js --react --api-service`).

Extra shortcuts:

```bash
node wizard.js --name my-project
node wizard.js --user my-github-handle
node wizard.js --docker
node wizard.js --no-docker
node wizard.js --db
node wizard.js --no-db
```

Examples:

```bash
node wizard.js --spring-boot --name test-spring-boot-ui --docker
node wizard.js --quarkus --name test-quarkus-ui --docker
```

All flags example:

```bash
node wizard.js --java --spring-boot --api-service --name full-java-example --user my-github-handle --docker --db
```

Common follow-up commands (inside the generated project):

```bash
devbox run build
devbox run dev
docker compose up
docker compose down
```

The default AI assistant is now `None` unless you select a different option interactively.

## Generated Output (varies by answers)
- `devbox.json` for reproducible tooling.
- `nx.json` and `package.json` for Nx-based setups.
- `Dockerfile`, `docker-compose.yml`, and `.dockerignore` for container workflows.
- `scripts/` with helper commands and AI CLI installers.
- `.env` with `GITHUB_USER` when provided.

## Documentation
- [`docs/how-wizard-works.md`](docs/how-wizard-works.md) - Detailed explanation of the wizard's architecture and flow
- [`docs/kiss-project-templates.md`](docs/kiss-project-templates.md) - Project template guidelines

## Development
- `pnpm test` is currently a stub and does not run tests.

## License
MIT

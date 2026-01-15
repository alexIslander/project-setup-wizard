# Testing Plan

This document defines a manual testing plan for the Project Setup Wizard, including a coverage matrix of every prompt and option and a minimal scenario matrix to exercise conditional paths.

## Scope
- CLI prompt flow and default handling
- Conditional branches (Nx, AI assistant, Docker, Git)
- Generated outputs and scripts

## Testing Matrix (Prompt Options)

| Prompt | Options | Default | Notes |
| --- | --- | --- | --- |
| Project Type | Web app; CLI tool; Library; API service; Mobile app; Other | Web app | Accept number or text |
| Language | JavaScript/TypeScript; Java (Spring Boot/Quarkus); Rust; Python; .NET; Other | JavaScript/TypeScript | Accept number or text |
| Project Description | Free text (optional) | A new development project | Empty input uses default |
| Use Nx | yes/no | yes (when recommended), no (otherwise) | Recommendation depends on language/project type |
| Specific Dependencies | Comma-separated text | (empty) | Used for devbox and requirements/package.json |
| Enable Nx Automation | yes/no | yes | Asked only when Use Nx = yes |
| Nx Technology Preset | TypeScript; Angular; React; Vue; Node; Java; .NET | TypeScript | Asked only when Use Nx = yes |
| Coding Assistant | Gemini CLI; Claude Code; Codex CLI; None | Gemini CLI | Single choice |
| Expected Commands | Comma-separated text from list | scaffold,build,test | Any text accepted |
| Generate Helper Scripts | yes/no | yes | Adds devbox scripts |
| Include Sample CLI Docs | yes/no | yes | Currently stored but not used in output |
| Deployment Target | Docker container; Kubernetes; Serverless/cloud platform; Other | Docker container | Accept number or text |
| Create Dockerfile | yes/no | yes | If no, skips Docker outputs |
| Docker Base Image | Alpine; Ubuntu; Debian; Other | Alpine | Asked only when Create Dockerfile = yes |
| Include Database Service | yes/no | no | Asked only when Create Dockerfile = yes and backend preset (Node, Java, .NET) |
| Repository Name | Free text | my-project | Used for directory and README |
| Initialize Git | yes/no | yes | Creates .gitignore and initial commit |
| Generate README | yes/no | yes | Adds README.md |
| Setup Versioning | yes/no | yes | Currently stored but not used in output |

## Scenario Matrix (Minimal Coverage)

Each scenario should confirm prompt flow, generated files, and terminal next-steps.

| ID | Project Type | Language | Nx | Assistant | Docker | Git | README | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Web app | JavaScript/TypeScript | yes | Gemini CLI | yes (Alpine) | yes | yes | Default path with Nx and Docker |
| S2 | API service | Python | no | Claude Code | yes (Debian) | no | yes | Python venv hook + requirements.txt |
| S3 | CLI tool | Rust | no | Codex CLI | no | yes | no | Rust main + build script |
| S4 | Library | Java (Spring Boot/Quarkus) | yes | None | yes (Ubuntu) | yes | yes | Java Nx plugins and Docker |
| S5 | Mobile app | .NET | no | Gemini CLI | no | no | yes | .NET build script |
| S6 | Other | Other | no | None | no | no | no | Free-text inputs, minimal output |
| S7 | API service | JavaScript/TypeScript | yes (Node preset) | None | yes (Alpine, DB on) | yes | yes | Ensure docker-compose includes Postgres only when opted in |

## Assistant-Specific Checks

| Assistant | Config File | Installer Script | Devbox Hook Alias | Notes |
| --- | --- | --- | --- | --- |
| Gemini CLI | .gemini.json | scripts/install-gemini.sh | alias gemini=... | GEMINI_API_KEY guidance |
| Claude Code | .claude.json | scripts/install-claude.sh | alias claude=... | ANTHROPIC_API_KEY guidance |
| Codex CLI | .codex.json | scripts/install-codex.sh | alias codex=... | OPENAI_API_KEY guidance |
| None | (none) | (none) | (none) | AI sections omitted |

## Docker Checks

| Language | Expected Base Image (Alpine default) | Build/Run Notes |
| --- | --- | --- |
| JavaScript/TypeScript | node:22-alpine | pnpm install + pnpm run build |
| Python | python:3.12-alpine | pip install -r requirements.txt |
| Rust | rust:1.70 | cargo build --release |
| Java | eclipse-temurin:25-jdk (multi-stage) | mvn package + java -jar /app/app.jar |
| Other | alpine:latest | Custom commands |

Docker port defaults (Dockerfile `EXPOSE` + docker-compose mapping):
- Angular: 4201
- React: 3001
- Vue: 5174
- Node/TypeScript: 3001
- Java: 8081
- .NET: 5001
- Python: 8001

## Nx Checks
- `nx.json` created with default cache settings
- `package.json` created with Nx scripts
- Plugins align to Nx technology preset
- Preset generator outputs framework-specific app structure when automation is enabled
- Angular preset pins TypeScript to a 5.3.x range compatible with Angular 17

## Non-Nx Checks
- `src/`, `docs/`, `scripts/`, `tests/` created
- `scripts/build.sh` present and executable
- Language-specific main file created when applicable

## Regression Checklist
- Default selection works when pressing Enter
- Numbered selection works (e.g., "1" maps to first option)
- Comma-separated lists parse and trim correctly
- Project directory is created with the repository name
- Docker Compose includes DB service only when opted in for backend presets
- Dockerfile/Compose port matches the framework default + 1
- Docker Compose file omits the deprecated `version` field

## Test Results (Local Manual Run)

Environment notes: tests ran without Devbox; toolchains like `nx`, `cargo`, and `dotnet` were not installed in the shell.

| ID | Project Dir | Wizard Result | Start Validation | Outcome / Notes |
| --- | --- | --- | --- | --- |
| S1 | test-s1-webapp | FAIL (generation) | `pnpm run build` | Wizard crashed creating `scripts/install-gemini.sh` because `scripts/` does not exist in Nx setup; `pnpm run build` fails with `nx: command not found`. |
| S2 | test-s2-api-python | OK | `python3 src/main.py` | OK: starts and prints expected output. `requirements.txt` created with `requests` and `ffmpeg-python`. |
| S3 | test-s3-rust-cli | OK | `cargo run` | FAIL: `cargo` not installed. Also no `Cargo.toml` generated, so Rust project cannot start even with cargo. |
| S4 | test-s4-java-library | OK | `pnpm run build` | FAIL: `nx` not installed. No Java project files (e.g., `pom.xml`) generated, so build has no targets. |
| S5 | test-s5-dotnet-mobile | OK | `./scripts/build.sh` | FAIL: `dotnet` not installed. No .NET project files generated, so build script has nothing to compile. |
| S6 | test-s6-other | OK | `./scripts/build.sh` | OK: script runs and prints customization message. |

## Fix Tasks

- [x] Ensure Nx paths create a `scripts/` directory before writing assistant install scripts; avoid generation failures when Nx is enabled.
- [x] Generate minimal language scaffolding so projects start locally without Devbox:
  - [x] Rust: create `Cargo.toml` with a basic binary crate setup.
  - [x] Java: create `pom.xml` and a minimal `src/main/java` entrypoint.
  - [x] .NET: create a minimal `*.csproj` and `Program.cs`.
- [x] Align Nx scaffolding with official docs for TypeScript/JS (`https://nx.dev/docs/technologies/typescript/introduction`) and generate the corresponding `package.json` scripts so `pnpm run build/test/dev` work locally.
- [x] Ensure Devbox scripts map to actual local commands (e.g., `pnpm run build`, `cargo build`, `mvn test`, `dotnet test`) and that those commands are usable out of the box.
- [x] Verify wizard supports Nx technology presets for:
  - [x] TypeScript: `https://nx.dev/docs/technologies/typescript/introduction`
  - [x] Angular: `https://nx.dev/docs/technologies/angular/introduction`
  - [x] React: `https://nx.dev/docs/technologies/react/introduction`
  - [x] Vue: `https://nx.dev/docs/technologies/vue/introduction`
  - [x] Node: `https://nx.dev/docs/technologies/node/introduction`
  - [x] Java: `https://nx.dev/docs/technologies/java/introduction`
  - [x] .NET: `https://nx.dev/docs/technologies/dotnet/introduction`

Nx preset smoke runs (wizard CLI, no Dockerfile/git/README):

| Preset | Project Dir | Result | Notes |
| --- | --- | --- | --- |
| TypeScript | nx-preset-typescript | OK | `nx.json` + `apps/nx-preset-typescript/project.json` present; `package.json` includes `@nx/js`. |
| Angular | nx-preset-angular | OK | `nx.json` + `apps/nx-preset-angular/project.json` present; `package.json` includes `@nx/angular` + `@nx/js`. |
| React | nx-preset-react | OK | `nx.json` + `apps/nx-preset-react/project.json` present; `package.json` includes `@nx/react` + `@nx/js`. |
| Vue | nx-preset-vue | OK | `nx.json` + `apps/nx-preset-vue/project.json` present; `package.json` includes `@nx/vue` + `@nx/js`. |
| Node | nx-preset-node | OK | `nx.json` + `apps/nx-preset-node/project.json` present; `package.json` includes `@nx/node` + `@nx/js`. |
| Java | nx-preset-java | OK | `nx.json` + `apps/nx-preset-java/project.json` present; `package.json` includes `nx` only (run-commands + Maven). |
| .NET | nx-preset-dotnet | OK | `nx.json` + `apps/nx-preset-dotnet/project.json` present; `package.json` includes `@nx-dotnet/core`. |
  vs
  - [x] TypeScript: https://nx.dev/docs/technologies/typescript/generators
  - [x] Angular: https://nx.dev/docs/technologies/angular/generators
  - [x] React: https://nx.dev/docs/technologies/react/generators
  - [x] Vue: https://nx.dev/docs/technologies/vue/generators
  - [x] Node: https://nx.dev/docs/technologies/node/generators
  - [x] Java: use `nx:run-commands` with Maven (no generator)
  - [x] .NET: https://nx.dev/docs/technologies/dotnet/generators

## Test Results (Post-fix)

Environment notes: devbox `run dev/build/test` executed for S1–S6 with pnpm-based Node installs. Devbox warned about legacy format in `devbox.json` (addressed by adding the schema in the wizard). pnpm reported ignored build scripts for Nx packages unless `pnpm approve-builds` is run (mitigated by `pnpm.onlyBuiltDependencies` in Nx workspaces).

Follow-up checklist:
- [x] Generated `devbox.json` includes the latest schema, so `devbox update` is no longer required for new projects.
- [x] Nx workspaces predefine `pnpm.onlyBuiltDependencies` for Nx packages; run `pnpm approve-builds` only when adding new dependencies with build scripts.

| ID | Project Dir | Wizard Result | Start Validation | Outcome / Notes |
| --- | --- | --- | --- | --- |
| S1 | test-s1-webapp | OK | `devbox run dev/build/test` | OK: Nx build/serve/test all succeed, prints Hello World. |
| S2 | test-s2-api-python | OK | `devbox run dev/build/test` | OK: `dev` runs `src/main.py`; `build` prints “Configure your build command”; `test` prints “No tests configured yet”. |
| S3 | test-s3-rust-cli | OK | `devbox run dev/build/test` | OK: `cargo run`, `cargo build --release`, and `cargo test` succeed. |
| S4 | test-s4-java-library | OK | `devbox run dev/build/test` | OK: Nx run-commands succeed; `serve` prints Hello World. |
| S5 | test-s5-dotnet-mobile | OK | `devbox run dev/build/test` | OK: `dotnet run` and `dotnet build` succeed; `test` prints “No tests configured yet”. |
| S6 | test-s6-other | OK | `devbox run dev/build/test` | OK: dev/build/test scripts run and print “Configure your … command”. |

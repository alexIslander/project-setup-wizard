# Testing Flow Plan (Non-Interactive Wizard)

## Goal
Provide a repeatable testing flow that generates projects in non-interactive mode, validates Devbox commands, and confirms Docker Compose containers stay alive.

## Scope
- Non-interactive generation using preset flags:
  - `--angular`, `--react`, `--vue`, `--node`, `--typescript`, `--java`, `--spring-boot`, `--quarkus`, `--dotnet`
- Validate:
  - `devbox run build`
  - `devbox run dev`
  - `docker compose up` (container alive)
  - `docker compose down` (cleanup)

## Preconditions
- Docker and Devbox installed locally.
- Node.js >= 22 available.
- No conflicting container names or ports in use.

## User Prompt (Reference)
- `node wizard.js --angular --docker --name my-j2-project --user alexIslander`

## Test Matrix
Generate one project per preset using explicit naming and Docker:
- `node wizard.js --angular --docker --name test-angular --user <github>`
- `node wizard.js --react --docker --name test-react --user <github>`
- `node wizard.js --vue --docker --name test-vue --user <github>`
- `node wizard.js --node --docker --name test-node --user <github> --db`
- `node wizard.js --typescript --docker --name test-typescript --user <github>`
- `node wizard.js --java --docker --name test-java --user <github> --db`
- `node wizard.js --spring-boot --docker --name test-spring-boot --user <github> --db`
- `node wizard.js --quarkus --docker --name test-quarkus --user <github> --db`
- `node wizard.js --dotnet --docker --name test-dotnet --user <github> --db`

Optional variants (run selectively):
- Add `--docker`/`--no-docker`, `--db`/`--no-db`, `--name`, `--user` to ensure flags work.

## Flag Matrix
| ID | Flag(s) | Purpose | Notes |
| --- | --- | --- | --- |
| F1 | `--angular`, `--react`, `--vue`, `--node`, `--typescript`, `--java`, `--dotnet` | Select Nx preset (non-interactive). | One preset per run. |
| F1a | `--spring-boot`, `--quarkus` | Select Java framework scaffolds. | Implies Java defaults. |
| F2 | `--web-app`, `--cli-tool`, `--library`, `--api-service`, `--mobile-app`, `--other` | Select project type (non-interactive). | Used for coverage of project type flags. |
| F3 | `--name <slug>` | Set repo/project name. | Required for deterministic test dirs. |
| F4 | `--user <github>` | Write `.env` with `GITHUB_USER`. | Optional; verify file output. |
| F5 | `--docker` | Force Docker output on. | Default is already on. |
| F6 | `--no-docker` | Disable Docker output. | Docker Compose checks are skipped. |
| F7 | `--db` | Include Postgres in docker-compose. | Only applies to backend presets. |
| F8 | `--no-db` | Ensure no Postgres service. | Should remove db service even when Docker is enabled. |

## Use Case Tables

### Nx-Based Testcases
| ID | Preset | Flags (Matrix IDs) | Description |
| --- | --- | --- | --- |
| NX-1 | Angular | F1 + F3 | Frontend preset with default Docker; validates build/dev and container stays alive. |
| NX-2 | React | F1 + F3 | Frontend preset with default Docker; validates build/dev and container stays alive. |
| NX-3 | Vue | F1 + F3 | Frontend preset with default Docker; validates build/dev and container stays alive. |
| NX-4 | Node | F1 + F3 + F7 | Backend preset with DB enabled; validates DB env and app container stays alive. |
| NX-5 | TypeScript | F1 + F3 + F8 | Frontend-ish preset with DB explicitly off; validates compose excludes db. |
| NX-6 | Java | F1 + F3 + F4 + F7 | Backend preset with DB on and `.env` output; validates jar run in container. |
| NX-6a | Spring Boot | F1a + F3 + F7 | Java framework with DB on; validates swagger and actuator endpoints. |
| NX-6b | Quarkus | F1a + F3 + F7 | Java framework with DB on; validates swagger UI and OpenAPI endpoints. |
| NX-7 | .NET | F1 + F3 + F7 | Backend preset with DB on; validates container stays alive. |

### Non-Nx Testcases
| ID | Target | Flags (Matrix IDs) | Description | Notes |
| --- | --- | --- | --- | --- |
| NONNX-1 | Python API service | F2 + F3 + F5 | Non-Nx Python scaffold build/dev + Docker checks. | Requires interactive selection of language Python + `useNx = no` (no CLI flag yet). |
| NONNX-2 | Rust CLI tool | F2 + F3 + F6 | Non-Nx Rust scaffold build/dev; Docker disabled. | Requires interactive selection of language Rust + `useNx = no`. Skip Docker checks. |
| NONNX-3 | Other/Library | F2 + F3 | Non-Nx minimal scaffold build/dev. | Requires interactive selection of language Other + `useNx = no`. |

## Procedure (Per Preset)
1. Generate project:
   - `node wizard.js --<preset> --docker --name test-<preset> --user <github>`
   - For backend presets (`node`, `java`, `.net`), add `--db`.
2. Enter project dir:
   - `cd test-<preset>`
3. Devbox checks:
   - `devbox run build`
   - `devbox run dev` (confirm process starts; stop after verification)
4. Docker Compose checks:
   - `docker compose up -d --build`
   - Validate container is alive:
     - `docker compose ps` shows app as running
     - Optional: `docker compose logs --tail 50 app` to confirm no crash loop
   - `docker compose down`
5. Cleanup:
   - Remove generated project directory after validation (optional).

## Reporting
- Save one report per preset at `docs/<MMDD>/testing-result-YYYY-MM-DD-<preset>.md`.
- Include: command used, build/dev outcome, Docker compose outcome, and any warnings.

## Pass/Fail Criteria
- Build succeeds: `devbox run build` exits 0.
- Dev command starts and stays running long enough to confirm (manual stop OK).
- Docker Compose app container remains running (not exited) when Docker is enabled.
- Compose down removes containers/networks without error.

## Notes
- If any preset fails, record error logs and Dockerfile/compose output.
- For Java/.NET, verify port mapping and jar/app entrypoint matches generated scaffold.

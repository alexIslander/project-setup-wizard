# Repository Guidelines

## Project Structure & Module Organization
- `wizard.js` is the CLI entry point and contains all wizard logic (prompt flow, file generation).
- `package.json` defines the CLI bin names (`project-wizard`, `setup-project`) and npm scripts.
- `docs/` holds supporting documentation (see `docs/kiss-project-templates.md`).
- This repo does not include a `tests/` directory yet.

## Build, Test, and Development Commands
- `npm install` installs dependencies (none beyond Node core, but keeps lockfile in sync).
- `npm start` runs the wizard via `node wizard.js`.
- `node wizard.js` runs the CLI directly if you do not want npm.
- `npm test` is a placeholder that currently exits successfully without running tests.

## Coding Style & Naming Conventions
- JavaScript (Node.js, CommonJS) with 2-space indentation.
- Prefer single quotes for strings and include semicolons.
- Keep CLI prompts and generator logic in `wizard.js`; avoid splitting into new files unless it materially improves readability.
- File and directory names use lowercase with hyphens for docs (e.g., `docs/kiss-project-templates.md`).

## Testing Guidelines
- No test framework is configured yet; `npm test` is a stub.
- If you add tests, place them in `tests/` and use a clear naming pattern such as `tests/<feature>.test.js`.
- Update `package.json` to run the chosen test runner (e.g., `node --test` or a framework) and note it in this document.

## Commit & Pull Request Guidelines
- There is no established commit history, so use clear, imperative messages (e.g., "Add Dockerfile defaults").
- PRs should include a short summary, the rationale for the change, and any user-facing impacts on generated project output.
- If you add new prompts or outputs, include a before/after example or a short walkthrough in the PR description.

## Configuration & Runtime Notes
- Requires Node.js `>=22.0.0` (see `package.json` engines).
- The CLI is designed to be installed globally or invoked locally (`npm start`).

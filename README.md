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
node wizard.js --cloudflare-token $CLOUDFLARE_API_TOKEN
node wizard.js --cloudflare-account-id $CLOUDFLARE_ACCOUNT_ID
node wizard.js --gh-actions
node wizard.js --cloudflare-app web-app
node wizard.js --cloudflare-dist dist/apps/web-app
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

**Backend example:**
```bash
node wizard.js --java --spring-boot --api-service --name full-java-example --user my-github-handle --cloudflare-token "$CLOUDFLARE_API_TOKEN" --cloudflare-account-id "$CLOUDFLARE_ACCOUNT_ID" --docker --db
```

**Frontend example:**
```bash
node wizard.js --angular --web-app --name full-angular-example --user my-github-handle --cloudflare-token "$CLOUDFLARE_API_TOKEN" --cloudflare-account-id "$CLOUDFLARE_ACCOUNT_ID" --docker --gh-actions
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

## Publish a Generated Project to GitHub
1. Remove any stale CLI auth and re-authenticate with the GitHub account that should own the repo:
   ```bash
   gh auth logout -h github.com -u <old-user>
   gh auth login -h github.com -p https -w
   ```
   When prompted, select GitHub.com, choose HTTPS, paste the desired account's PAT, and make it the default.
2. Load the `.env` file so the wizard-provided `GITHUB_USER` value is in your environment:
   ```bash
   set -a
   source .env
   set +a
   ```
3. Create the remote repo (named after `GITHUB_USER`) and push your local `main` branch in one command:
   ```bash
   gh repo create "${GITHUB_USER}/full-angular-example" --private --source . --remote origin && git push -u origin main
   ```
   Replace `full-angular-example` with your actual project folder name if different.

## Cloudflare Pages Setup
1. Create a Cloudflare Pages API token and copy your account ID by following the detailed checklist in `docs/cloudflare-deploy.md`.
2. Export both secrets locally (or answer the wizard prompts so they are written to `.env`):
   ```bash
   export CLOUDFLARE_API_TOKEN="<token>"
   export CLOUDFLARE_ACCOUNT_ID="<account-id>"
   ```
   You can persist them for the current shell with:
   ```bash
   set -a
   source .env
   set +a
   ```
3. Add the same values as GitHub repository secrets (CLI example shown; the web UI works too):
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN" --repo ${GITHUB_USER}/<repo>
   gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo ${GITHUB_USER}/<repo>
   ```
4. Create the remote repository if it does not exist yet, pointing it at your local folder:
   ```bash
   gh repo create ${GITHUB_USER}/<repo> --private --source . --remote origin --push || true
   ```
   (If the repo already exists, `gh` will exit with an error you can ignore.)
5. Run the verification helper from the Codex skill to confirm your account and secrets are ready:
   ```bash
   ~/.codex-dev/skills/cloudflare-deploy/scripts/check_cloudflare.sh ${GITHUB_USER}/<repo>
   ```
   Successful output means the GitHub Actions workflows can deploy to Cloudflare Pages without further manual setup.
6. Answer “yes” to the wizard’s CI/CD prompt (or pass `--gh-actions`) so `.github/workflows/ci.yml`, `common_deploy.yaml`, and `common_deploy_feature.yaml` are generated. After pushing to GitHub, production deploys run on `main` and preview deploys run on every feature branch automatically.

## License
MIT


------

# CF setup example

```bash
(devbox) ➜  full-angular-example git:(main) ✗ gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN" --repo alexislander/full-angular-example
✓ Set Actions secret CLOUDFLARE_API_TOKEN for alexislander/full-angular-example
(devbox) ➜  full-angular-example git:(main) ✗ gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo alexislander/full-angular-example
✓ Set Actions secret CLOUDFLARE_ACCOUNT_ID for alexislander/full-angular-example
(devbox) ➜  full-angular-example git:(main) ✗ ~/.codex-dev/skills/cloudflare-deploy/scripts/check_cloudflare.sh alexislander/full-angular-example
✅ Required environment variables are present.
→ Checking Cloudflare account via wrangler whoami

 ⛅️ wrangler 4.63.0 (update available 4.67.0)
─────────────────────────────────────────────
Getting User settings...
👋 You are logged in with an Account API Token, associated with the account Sandor.csete.professional@gmail.com's Account.
ℹ️  The API Token is read from the CLOUDFLARE_API_TOKEN environment variable.
┌───────────────────────────────────────────────┬──────────────────────────────────┐
│ Account Name                                  │ Account ID                       │
├───────────────────────────────────────────────┼──────────────────────────────────┤
│ Sandor.csete.professional@gmail.com's Account │ xxx │
└───────────────────────────────────────────────┴──────────────────────────────────┘
🔓 To see token permissions visit https://dash.cloudflare.com/Xxx/api-tokens.
✅ Wrangler can access the target account.
→ Verifying GitHub secrets in GITHUB_USER/full-angular-example
   • CLOUDFLARE_API_TOKEN secret exists
   • CLOUDFLARE_ACCOUNT_ID secret exists
✅ GitHub secrets are present.
All Cloudflare prerequisites satisfied.
```

## End-to-end example
• Here’s the end-to-end command sequence to regenerate full-angular-example, push it, and let the new workflows
  deploy to Cloudflare:

  1. Start fresh from the repo root:

     cd /Users/scsete/workspace/2025/project-setup-wizard
     rm -rf full-angular-example
  2. Ensure your Cloudflare secrets are in the environment (reuse the same values already saved as GitHub
     secrets):

     export CLOUDFLARE_API_TOKEN="<your-token>"
     export CLOUDFLARE_ACCOUNT_ID="<your-account-id>"
  3. Rerun the wizard with CI/CD enabled so workflows + .env are generated automatically:

     node wizard.js --angular --web-app --name full-angular-example --user alexislander --cloudflare-token
  "$CLOUDFLARE_API_TOKEN" --cloudflare-account-id "$CLOUDFLARE_ACCOUNT_ID" --gh-actions --cloudflare-app web-app
  --cloudflare-dist dist/apps/web-app --docker
  4. Load the new .env (this keeps GITHUB_USER + Cloudflare values in your shell for later commands):

     cd full-angular-example
     set -a
     source .env
     set +a
5. Create remote repo
```bash
   gh repo create "${GITHUB_USER}/full-angular-example" --private --source . --remote origin
   ```
  6. Verify the Cloudflare prerequisites still pass (optional but recommended before pushing):
```bash
~/.codex-dev/skills/cloudflare-deploy/scripts/check_cloudflare.sh ${GITHUB_USER}/full-angular-example
```
  7. Create Cf resource
```bash
pnpm dlx wrangler pages project create full-angular-example --production-branch main
```
  8. Connect the local repo to the existing GitHub remote (skip if origin already exists):

     git remote add origin https://github.com/${GITHUB_USER}/full-angular-example.git
  9. Push the regenerated project to main and trigger the workflows:
     git push -f origin main

  Once that push completes, GitHub Actions will run ci.yml, then common_deploy.yaml will deploy the Angular
  build to Cloudflare Pages using the secrets you already stored.

## CF cleanup
Cloudflare cleanup when a project is retired:

  1. Delete the Pages project resources so deployments stop:

     pnpm dlx wrangler pages project delete <project-name>
  2. Remove any GitHub repository secrets that referenced that project:

     gh secret delete CLOUDFLARE_API_TOKEN --repo ${GITHUB_USER}/<repo>
     gh secret delete CLOUDFLARE_ACCOUNT_ID --repo ${GITHUB_USER}/<repo>
  3. Optionally rotate/revoke the Cloudflare API token if nothing else relies on it.
  4. Remove the project folder or archive the repo as needed.
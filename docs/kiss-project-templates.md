# KISS Project Templates for Frontend + Backend

This doc proposes two minimal, repeatable setups for new projects. Both assume a devbox-based environment, GitHub Actions for CI/CD, GH CLI for repo + secret management, and Cloudflare for frontend deploys.

## Goals

- Create a new repo from a template with one command.
- Deploy frontend to Cloudflare Pages/Workers on every push to `main`.
- Build a multi-platform backend container image and push to GHCR on every push to `main`.
- Keep everything reproducible with `devbox.json`.

## Required Credentials

- GitHub PAT for `gh` CLI (scopes: `repo`, `workflow`, `write:packages`).
- Cloudflare API token (scope: Pages/Workers deploy) + account ID.
- Render API key (only if you deploy backend to Render).

Store as GitHub repo secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `RENDER_API_KEY` (optional)
- `RENDER_SERVICE_ID` (optional, for deploy trigger)
- Optional: `GHCR_USERNAME` (if you do not use `GITHUB_TOKEN`)

Cloudflare project/worker names are derived from the repository name, so no extra config is required.

## Devbox Base (Shared)

Use the same base in both setups so local tooling is consistent.

```json
{
  "$schema": "https://raw.githubusercontent.com/jetpack-io/devbox/main/.schema/devbox.schema.json",
  "packages": [
    "git",
    "gh",
    "nodejs_20",
    "pnpm",
    "docker",
    "docker-compose",
    "jq"
  ],
  "env": {
    "PROJECT_ROOT": "${PROJECT_ROOT:-$(pwd)}"
  },
  "shell": {
    "init_hook": [
      "if [ -f .env ]; then export $(cat .env | grep -v '^#' | xargs); fi"
    ]
  }
}
```

## Setup A: Single Template Repo (Frontend + Backend)

Best when you want one repo per product with both layers.

### Template Structure

```
.
├── backend/
│   ├── Dockerfile
│   └── ...
├── frontend/
│   └── ...
├── .github/
│   └── workflows/
│       ├── backend-image.yml
│       └── frontend-cloudflare.yml
└── devbox.json
```

### Backend Image (GHCR, multi-platform)

`.github/workflows/backend-image.yml`

```yaml
name: Backend Image
on:
  push:
    branches: ["main"]
    paths: ["backend/**", ".github/workflows/backend-image.yml"]

permissions:
  contents: read
  packages: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: true
          platforms: linux/amd64,linux/arm64
          tags: ghcr.io/${{ github.repository }}/backend:latest
```

### Frontend Deploy (Cloudflare Pages, auto-create)

`.github/workflows/frontend-cloudflare.yml`

```yaml
name: Frontend Deploy
on:
  push:
    branches: ["main"]
    paths: ["frontend/**", ".github/workflows/frontend-cloudflare.yml"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
        working-directory: frontend
      - run: pnpm build
        working-directory: frontend
      - run: pnpm dlx wrangler pages project create "${CF_PROJECT_NAME}" --production-branch main || true
        working-directory: frontend
        env:
          CF_PROJECT_NAME: ${{ github.event.repository.name }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: pnpm dlx wrangler pages deploy dist --project-name "${CF_PROJECT_NAME}"
        working-directory: frontend
        env:
          CF_PROJECT_NAME: ${{ github.event.repository.name }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Frontend Deploy (Cloudflare Workers, auto-create)

If the project is a Worker instead of a static site, replace the Pages deploy with:

```yaml
      - run: pnpm dlx wrangler deploy --name "${CF_WORKER_NAME}"
        working-directory: frontend
        env:
          CF_WORKER_NAME: ${{ github.event.repository.name }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Bootstrap Steps

```bash
# 1) Authenticate GH CLI
gh auth login

# 2) Create repo from template
gh repo create my-app --template <org>/<template-repo> --public

# 3) Set Cloudflare secrets
gh secret set CLOUDFLARE_API_TOKEN --repo <org>/my-app
gh secret set CLOUDFLARE_ACCOUNT_ID --repo <org>/my-app

# 4) (Optional) Set Render secrets
gh secret set RENDER_API_KEY --repo <org>/my-app
gh secret set RENDER_SERVICE_ID --repo <org>/my-app
```

## Setup B: Two Template Repos (Frontend + Backend)

Best when you want very small repos with no coupling.

### Frontend Template Repo

- Vite/Next/Remix project
- `.github/workflows/frontend-cloudflare.yml` only
- `devbox.json` with `nodejs_20`, `pnpm`, `gh` (use `pnpm dlx wrangler`)

### Backend Template Repo

- Dockerfile + minimal service scaffold
- `.github/workflows/backend-image.yml` only
- `devbox.json` with `docker`, `gh`

### Bootstrap Steps

```bash
gh auth login

# frontend
gh repo create my-frontend --template <org>/<frontend-template> --public

# backend
gh repo create my-backend --template <org>/<backend-template> --public
```

## Backend Deploy (Render, optional)

Render needs a one-time service creation. After that, you can trigger deploys from GitHub Actions using the API. This keeps the only config to secrets.

Add to the backend workflow after the image push:

```yaml
      - name: Trigger Render deploy
        if: ${{ secrets.RENDER_API_KEY != '' && secrets.RENDER_SERVICE_ID != '' }}
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
          RENDER_SERVICE_ID: ${{ secrets.RENDER_SERVICE_ID }}
        run: |
          curl -sS -X POST \"https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys\" \\
            -H \"Authorization: Bearer ${RENDER_API_KEY}\" \\
            -H \"Content-Type: application/json\" \\
            -d '{}'
```

If you use Render MCP to create the service, store the resulting service ID as `RENDER_SERVICE_ID`.

## Free Deployment Options for Backend

KISS options that fit GHCR images. Check current free tier limits before committing.

- Fly.io (small free allowance, requires card)
- Render (free web services, sleeps on idle)
- Railway (monthly free credit)
- Google Cloud Run (free tier, requires billing account)

## Render MCP Profile (Optional)

If you want Render MCP available in the IDE profile:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_API_KEY>"
      }
    }
  }
}
```

## IDE Profile (Optional)

If you want MCP servers pre-configured in VSCode/Cursor, include a project profile in the template repo (for example, `.vscode/settings.json` or `.cursor/`) and list Context7 + sequential-thinking there. Keep it minimal so it does not fight per-user global settings.

# Cloudflare Pages Setup Guide

This guide prepares a wizard-generated project to deploy through the bundled GitHub Actions workflows.

## Prerequisites
- Cloudflare account with Pages access and 2FA enabled.
- Installed `gh` CLI authenticated to GitHub.
- Node.js 22+ with `corepack enable` so `pnpm` is available.
- `wrangler` CLI (installed globally or via `pnpm dlx`).

## 1. Create a Cloudflare API Token
1. Visit [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) and create a custom token.
2. Assign the **Cloudflare Pages** template or manually grant:
   - Account: `Cloudflare Workers Scripts` = Read
   - Account: `Cloudflare Pages` = Edit
3. Restrict the token to the target account for safety.
4. Copy the generated token; you cannot view it again.

## 2. Capture the Account ID
1. From the Cloudflare dashboard home page, select the correct account.
2. Copy the **Account ID** from the right sidebar. This string identifies your Pages workspace.

## 3. Export Local Environment Variables (optional)
```bash
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="<account-id>"
```
These exports let you run the verification script before pushing secrets to GitHub. Unset them after testing if you do not want them persisted in your shell history.

## 4. Store Secrets in GitHub
Use either the CLI or the web UI.

### Using `gh secret set`
```bash
gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN" --repo <org>/<repo>
gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo <org>/<repo>
```
Repeat for every repository that will deploy with the wizard workflows.

### Using the GitHub Web UI
1. Navigate to **Settings → Secrets and variables → Actions**.
2. Add repository secrets named exactly `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## 5. Verify Credentials
After secrets exist locally (via exports) run:
```bash
pnpm dlx wrangler whoami
```
or use the helper script included with the Codex skill. Successful output should show the target account name/ID. Failure indicates an invalid token or account mismatch.

## 6. Naming and Branch Strategy
- The GitHub workflows assume the Cloudflare project name matches the GitHub repository name (e.g., `my-app`).
- Production deployments track `main` and use `common_deploy.yaml`; preview/feature deployments trigger from feature branches via `common_deploy_feature.yaml` against the same Pages project.

## 7. Compliance Checklist
- Ensure Cloudflare account enforces 2FA for every team member with dashboard access.
- Record token issuance in your org’s secrets inventory (token name, owner, purpose, expiry policy).
- Rotate the API token regularly (quarterly recommended) and repeat Steps 1–5 each time.
- Audit Cloudflare access logs after initial setup to confirm only expected automation is using the token.

Once these steps are complete, the wizard-generated GitHub Actions pipelines can deploy automatically without further manual intervention.

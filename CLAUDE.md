# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A URL redirector service built on Cloudflare Workers using Hono framework. The application is structured as a **pnpm workspace monorepo** with two packages:

- **packages/worker/**: Hono API (Cloudflare Workers)
  - Public redirect functionality (`/:id` → stored destination URL)
  - Admin API for managing redirects (protected by Clerk authentication)
  - Organization-based authorization (only specific Clerk organization IDs can access admin features)

- **packages/dashboard/**: React SPA (Admin UI)
  - Dashboard for managing redirects
  - Clerk authentication integration
  - Built with Vite and deployed as static assets via Workers Static Assets

## Development Commands

```bash
# Install dependencies (from root)
pnpm install

# Run both packages in development mode (parallel)
pnpm dev

# Run individual packages
pnpm dev:worker     # Worker dev server
pnpm dev:dashboard  # Dashboard dev server (Vite)

# Build all packages
pnpm build

# Build individual packages
pnpm build:worker
pnpm build:dashboard

# Deploy to Cloudflare Workers (builds and deploys)
pnpm deploy

# Generate TypeScript types for Cloudflare bindings
cd packages/worker && pnpm cf-typegen
```

## Architecture

### Tech Stack

- **Monorepo**: pnpm workspace
- **Backend Runtime**: Cloudflare Workers
- **Backend Framework**: Hono
- **Frontend**: React + Vite
- **Build Tool**: Vite with `@cloudflare/vite-plugin`
- **Authentication**: Clerk (`@hono/clerk-auth` for backend, `@clerk/clerk-react` for frontend)
- **Storage**: Cloudflare KV (Workers KV namespace binding)
- **Static Assets**: Cloudflare Workers Static Assets

### Monorepo Structure

```
redirector/
├── packages/
│   ├── worker/          # Hono API (Cloudflare Workers)
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── wrangler.jsonc
│   │   └── package.json
│   └── dashboard/       # React SPA
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   └── pages/
│       ├── index.html
│       └── package.json
├── dist/                # Dashboard build output (referenced by worker assets)
├── pnpm-workspace.yaml
└── package.json
```

### Worker Package (`packages/worker/`)

The worker logic is in `packages/worker/src/index.ts`. It defines a Hono app with:

1. **Bindings** (environment variables/resources):
   - `REDIRECTS`: KV namespace for storing redirect mappings
   - `CLERK_PUBLISHABLE_KEY`: Clerk public key
   - `CLERK_SECRET_KEY`: Clerk secret key
   - `ALLOWED_EMAILS`: Comma-separated list of email addresses allowed to access admin features (e.g., "<user1@example.com>,<user2@example.com>")
   - `ASSETS`: Fetcher binding for static assets (Dashboard build output)

2. **Route Order** (important for correct behavior):
   - `/` → redirects to `/admin/`
   - `/r/:id` → redirect lookup in KV
   - `/api/*` → authenticated admin API endpoints
   - Other routes → delegated to static assets (React SPA)

3. **Workers Static Assets Configuration** (`packages/worker/wrangler.jsonc`):
   - `assets.directory`: `../../dist` (Dashboard build output)
   - `assets.run_worker_first`: `["/", "/api/*", "/r/*"]` - Worker processes these routes before serving static assets
   - `assets.not_found_handling`: `"single-page-application"` - SPA routing support

4. **Authentication Flow**:
   - Clerk middleware applied globally via `app.use('*', clerkMiddleware())`
   - `requireAuth` middleware enforces email-based access control
   - Allowed email addresses are specified via `ALLOWED_EMAILS` environment variable (comma-separated)

5. **Admin API Endpoints** (all require authentication):
   - `GET /api/redirects` - List all redirects
   - `PUT /api/redirects/:id` - Create/update redirect (validates ID format: `^[a-zA-Z0-9_-]+$`)
   - `DELETE /api/redirects/:id` - Delete redirect

### Dashboard Package (`packages/dashboard/`)

React SPA for managing redirects:

1. **Routing** (React Router with `/admin` basename):
   - `/admin/` → Dashboard page (requires Clerk authentication)

2. **Authentication**:
   - Uses `@clerk/clerk-react` (`ClerkProvider`, `SignedIn`, `SignedOut`, `RedirectToSignIn`)
   - Publishable key from `VITE_CLERK_PUBLISHABLE_KEY` environment variable

3. **API Communication**:
   - Fetches from `/api/*` endpoints (same origin as Worker)
   - No CORS configuration needed (deployed together)

4. **Build Output**:
   - Built to `../../dist` (root dist directory)
   - Worker's `assets.directory` points to this location

### Key Implementation Details

- **URL Validation**: Only `http:` and `https:` protocols are accepted for destination URLs
- **ID Constraints**: Redirect IDs must match `/^[a-zA-Z0-9_-]+$/` pattern
- **Static Assets Delegation**: Routes not matching `/`, `/r/*`, or `/api/*` are served by static assets (React SPA)

### Cloudflare Workers Configuration

- Entry point: `packages/worker/src/index.ts`
- Compatibility date: `2025-08-03`
- Configuration file: `packages/worker/wrangler.jsonc`

### Environment Variables Management

#### Required Environment Variables

The Worker requires the following environment variables:

- `CLERK_PUBLISHABLE_KEY`: Clerk publishable key (public, can be in vars)
- `CLERK_SECRET_KEY`: Clerk secret key (sensitive, managed as secret)
- `ALLOWED_EMAILS`: Comma-separated list of allowed email addresses (e.g., "<user1@example.com>,<user2@example.com>")

#### Local Development Setup

1. Copy the example environment file:

   ```bash
   cp packages/worker/.env.local.example packages/worker/.env.local
   ```

2. Edit `packages/worker/.env.local` with your actual values:

   ```bash
   CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ALLOWED_EMAILS=admin@example.com,another@example.com
   ```

3. For the Dashboard, create `packages/dashboard/.env.local`:

   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

**Note**: `.env.local` is gitignored and should never be committed.

#### Production Deployment (GitHub Actions)

Environment variables for production are managed through **GitHub Secrets** to prevent them from being overwritten during CI/CD deployments.

**Why GitHub Secrets?**
When deploying via `wrangler deploy`, any environment variables not defined in `wrangler.jsonc` or passed via the deployment process will be **removed** from the Worker. This means manually setting variables in the Cloudflare dashboard will result in them being deleted on the next deployment.

**Setup GitHub Secrets:**

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `CLERK_PUBLISHABLE_KEY`: Your production Clerk publishable key
   - `CLERK_SECRET_KEY`: Your production Clerk secret key
   - `ALLOWED_EMAILS`: Comma-separated list of allowed emails
   - `VITE_CLERK_PUBLISHABLE_KEY`: Same as CLERK_PUBLISHABLE_KEY (for Dashboard build)
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

- Sets `CLERK_PUBLISHABLE_KEY` as a var
- Sets `CLERK_SECRET_KEY` and `ALLOWED_EMAILS` as encrypted secrets

**Manual Secret Management** (if needed):

To manually update secrets in production:

```bash
cd packages/worker

# Update individual secrets
echo "sk_live_xxxxx" | wrangler secret put CLERK_SECRET_KEY
echo "admin@example.com,user@example.com" | wrangler secret put ALLOWED_EMAILS
```

To modify which users can access admin features, update the `ALLOWED_EMAILS` GitHub Secret or use the manual method above.

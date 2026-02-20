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
   - `ALLOWED_EMAILS`: Comma-separated list of email addresses allowed to access admin features (e.g., "user1@example.com,user2@example.com")
   - `ASSETS`: Fetcher binding for static assets (Dashboard build output)

2. **Route Order** (important for correct behavior):
   - `/` → redirects to `/admin/`
   - `/:id` → redirect lookup with special handling:
     - If `id === 'admin'`: delegates to static assets via `c.env.ASSETS.fetch(c.req.raw)`
     - Otherwise: performs redirect lookup in KV
   - `/api/*` → authenticated admin API endpoints

3. **Workers Static Assets Configuration** (`packages/worker/wrangler.jsonc`):
   - `assets.directory`: `../../dist` (Dashboard build output)
   - `assets.run_worker_first`: `["/api/*", "/:id"]` - Worker handles API and redirects first
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

- **URL Validation**: Only `http:` and `https:` protocols are accepted for destination URLs (see `isValidUrl()` at packages/worker/src/index.ts:106)
- **ID Constraints**: Redirect IDs must match `/^[a-zA-Z0-9_-]+$/` pattern
- **Static Assets Delegation**: The route `/:id` delegates to `c.env.ASSETS.fetch()` when `id === 'admin'` to serve the React SPA
- **Environment Variables**:
  - Worker: `packages/worker/.dev.vars` (CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
  - Dashboard: `packages/dashboard/.env.local` (VITE_CLERK_PUBLISHABLE_KEY)

### Cloudflare Workers Configuration

- Entry point: `packages/worker/src/index.ts`
- Compatibility date: `2025-08-03`
- Configuration file: `packages/worker/wrangler.jsonc`

### Authorization Configuration

To modify which users can access admin features, update the `ALLOWED_EMAILS` environment variable:

**Development** (`packages/worker/.dev.vars`):
```
ALLOWED_EMAILS=admin@example.com,another@example.com
```

**Production**:
```bash
cd packages/worker
wrangler secret put ALLOWED_EMAILS
# Enter comma-separated email addresses when prompted
```

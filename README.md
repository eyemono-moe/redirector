# Redirector

URL redirector service built on Cloudflare Workers.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and edit it:

```bash
cp packages/worker/.dev.vars.example packages/worker/.dev.vars
```

Edit `packages/worker/.dev.vars`:

```
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
ALLOWED_EMAILS=your-email@example.com
```

For Dashboard (if needed):

```bash
# packages/dashboard/.env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

### 3. Development

```bash
# Run both worker and dashboard
pnpm dev

# Or run individually
pnpm dev:worker     # http://localhost:8787
pnpm dev:dashboard  # http://localhost:5173
```

### 4. Deploy

```bash
# Build and deploy
pnpm deploy

# Set production secrets
cd packages/worker
wrangler secret put CLERK_SECRET_KEY
wrangler secret put ALLOWED_EMAILS
```

## Architecture

- **Worker**: Hono API on Cloudflare Workers
- **Dashboard**: React SPA with UnoCSS
- **Validation**: Valibot (shared between frontend and backend)
- **State Management**: TanStack Query
- **Forms**: TanStack Form
- **Auth**: Clerk (email-based access control)

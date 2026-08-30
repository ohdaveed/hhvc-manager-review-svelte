# syntax=docker/dockerfile:1

# Stage 1: Build the SvelteKit app
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies first (optimizes Docker layer caching)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# The two public Supabase values are read through `$env/static/public`, which
# Vite inlines into the bundle at build time. They are therefore build args, not
# runtime environment: setting them on `docker run` or in Compose's
# `environment:` changes nothing, because the values are already baked in.
# Changing either one means rebuilding (`docker compose up --build`).
#
# `.dockerignore` still excludes `.env*` and that stays correct -- Compose
# interpolates these host-side and passes them in as args, so no env file is
# ever copied into the build context.
ARG SVELTE_PUBLIC_SUPABASE_URL
ARG SVELTE_PUBLIC_SUPABASE_ANON_KEY
ARG CONTEXT=production
ENV SVELTE_PUBLIC_SUPABASE_URL=$SVELTE_PUBLIC_SUPABASE_URL
ENV SVELTE_PUBLIC_SUPABASE_ANON_KEY=$SVELTE_PUBLIC_SUPABASE_ANON_KEY

# Build the application. ADAPTER=node selects adapter-node in vite.config.ts,
# whose entrypoint is the build/index.js this image runs; the default is
# adapter-netlify, which produces no such file.
#
# This is a production build, so `ensureDevSession()` compiles to a no-op and
# the seeded local credentials are dropped from the bundle. The app has no login
# route, so the container is signed out: the static mockup corpus renders, and
# every RLS-protected read (queue, decisions, notes, checks) comes back empty.
# That is the same posture as the deployed site, not a Docker-specific gap.
ENV ADAPTER=node
RUN bun run build

# Stage 2: Serve the app in a minimal image
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy built assets and node_modules from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

# adapter-node creates an entrypoint at build/index.js
CMD ["bun", "run", "build/index.js"]

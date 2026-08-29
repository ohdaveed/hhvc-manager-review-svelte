# syntax=docker/dockerfile:1

# Stage 1: Build the SvelteKit app
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies first (optimizes Docker layer caching)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application. ADAPTER=node selects adapter-node in vite.config.ts,
# whose entrypoint is the build/index.js this image runs; the default is
# adapter-netlify, which produces no such file.
ARG SVELTE_PUBLIC_SUPABASE_URL
ARG SVELTE_PUBLIC_SUPABASE_ANON_KEY
ENV ADAPTER=node
ENV SVELTE_PUBLIC_SUPABASE_URL=$SVELTE_PUBLIC_SUPABASE_URL
ENV SVELTE_PUBLIC_SUPABASE_ANON_KEY=$SVELTE_PUBLIC_SUPABASE_ANON_KEY
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

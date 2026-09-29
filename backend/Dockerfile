# syntax=docker/dockerfile:1

# =========================================================
# Stage 1: dependencies
# ---------------------------------------------------------
# Build tooling lives here only. bcrypt is a native module;
# if a prebuilt binary is unavailable for the target platform
# it is compiled inside this stage and never ships in the
# final image.
# =========================================================
FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Lock files are copied before the source tree so that the
# dependency layer is only rebuilt when dependencies change.
COPY package.json package-lock.json ./

RUN npm ci --omit=dev


# =========================================================
# Stage 2: production runtime
# =========================================================
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Run as an unprivileged user instead of root.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs appuser

COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --chown=appuser:nodejs package.json ./
# `src` includes the SQL migrations and the seed script, which
# are executed by the dedicated `migrate` compose service.
COPY --chown=appuser:nodejs src ./src

USER appuser

EXPOSE 5000

# `node` is PID 1 and handles SIGTERM/SIGINT in src/server.js,
# so no init shim is required for graceful shutdown.
CMD ["node", "src/server.js"]

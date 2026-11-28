# Self-hosted storefront origin (#2636). One image runs on both hosts:
# AWS (primary) and fly.io (standby), behind the Vercel router.
#
#   docker build --platform linux/arm64 --build-arg GIT_SHA=$(git rev-parse HEAD) -t storefront .
#
# Runtime env (not baked in): MEDUSA_BACKEND_URL, ORIGIN_PROXY_SECRET,
# REVALIDATE_SECRET, and any server-only keys.

FROM node:22-alpine AS deps
WORKDIR /app
# Build stages only: IPv4-first DNS. Under QEMU (an amd64 build on an arm64
# Mac, for the Cloudflare standby) node's fetch times out on dual-stack
# lookups, so corepack/pnpm cannot download anything. Harmless elsewhere.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_MULTI_TENANT=true
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://v3.jaalyantra.com
ARG NEXT_PUBLIC_DEFAULT_REGION
ARG NEXT_PUBLIC_MARKETPLACE_URL
ARG NEXT_PUBLIC_STRIPE_KEY
ARG NEXT_PUBLIC_ANALYTICS_SCRIPT_URL
ARG NEXT_PUBLIC_PRODUCT_DELIVERY_CHECK
ARG NEXT_PUBLIC_BASE_URL
# JS/CSS are fetched from the origin's own address (see next.config.js).
ARG ORIGIN_ASSET_PREFIX=https://sf-origin.jaalyantra.com
# Image host allowed by next/image (read in next.config at build time).
ARG MEDUSA_CLOUD_S3_HOSTNAME
ARG MEDUSA_CLOUD_S3_PATHNAME
ENV NEXT_PUBLIC_MULTI_TENANT=$NEXT_PUBLIC_MULTI_TENANT \
    NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION \
    NEXT_PUBLIC_MARKETPLACE_URL=$NEXT_PUBLIC_MARKETPLACE_URL \
    NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY \
    NEXT_PUBLIC_ANALYTICS_SCRIPT_URL=$NEXT_PUBLIC_ANALYTICS_SCRIPT_URL \
    NEXT_PUBLIC_PRODUCT_DELIVERY_CHECK=$NEXT_PUBLIC_PRODUCT_DELIVERY_CHECK \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    ORIGIN_ASSET_PREFIX=$ORIGIN_ASSET_PREFIX \
    MEDUSA_CLOUD_S3_HOSTNAME=$MEDUSA_CLOUD_S3_HOSTNAME \
    MEDUSA_CLOUD_S3_PATHNAME=$MEDUSA_CLOUD_S3_PATHNAME \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8000 \
    HOSTNAME=0.0.0.0
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]

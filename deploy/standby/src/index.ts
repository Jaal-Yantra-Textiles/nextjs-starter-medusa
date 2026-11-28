/**
 * Standby storefront origin on Cloudflare Containers (jyt#2636).
 *
 * The same Next.js image as the AWS primary (repo-root Dockerfile), built for
 * linux/amd64 with its own ORIGIN_ASSET_PREFIX so the pages it renders load
 * JS/CSS from this host, not the primary's. Reached at
 * https://sf-standby.jaalyantra.com; the Vercel router points here only when
 * the primary is down.
 *
 * One named instance serves everything: a standby is idle almost always, so
 * it sleeps after 30 minutes and pays a few seconds of cold start on the first
 * request after a failover. The container's own ORIGIN_PROXY_SECRET lock still
 * applies: page requests without the router's secret get a 403.
 */
import { Container, getContainer } from "@cloudflare/containers"

type Env = {
  STOREFRONT: DurableObjectNamespace<Storefront>
  // Worker secrets (wrangler secret put …), passed into the container.
  ORIGIN_PROXY_SECRET: string
  REVALIDATE_SECRET: string
  STOREFRONT_REVALIDATE_SECRET: string
  MEDUSA_BACKEND_URL: string
}

export class Storefront extends Container<Env> {
  defaultPort = 8000
  sleepAfter = "30m"
  enableInternet = true
  pingEndpoint = "/api/health"

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.envVars = {
      MEDUSA_BACKEND_URL: env.MEDUSA_BACKEND_URL,
      ORIGIN_PROXY_SECRET: env.ORIGIN_PROXY_SECRET,
      REVALIDATE_SECRET: env.REVALIDATE_SECRET,
      STOREFRONT_REVALIDATE_SECRET: env.STOREFRONT_REVALIDATE_SECRET,
      NEXT_PUBLIC_MULTI_TENANT: "true",
      PORT: "8000",
      HOSTNAME: "0.0.0.0",
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return getContainer(env.STOREFRONT, "standby").fetch(request)
  },
}

import { NextResponse } from "next/server"

/**
 * Liveness for the self-hosted origin (#2636): the Vercel router's failover
 * check and the box's deploy script probe this. It answers without touching
 * the backend, so "unhealthy" means this server is down, not Medusa.
 *
 * Outside `proxy.ts`'s matcher (`/api` is excluded), so it is reachable on the
 * origin's own address without the proxy secret, and reveals nothing but the
 * build it is running.
 */
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      commit: process.env.GIT_SHA || null,
      uptime_s: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "no-store" } }
  )
}

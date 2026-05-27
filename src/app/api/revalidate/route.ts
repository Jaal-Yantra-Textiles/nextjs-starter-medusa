import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/revalidate
 *
 * Webhook the backend calls after a partner mutates their website
 * (theme update, page publish, blocks reorder, etc.) so the
 * storefront's `force-cache` data layer doesn't keep serving the
 * pre-edit HTML.
 *
 * Body:
 *   { tags?: string[], paths?: string[] }
 *
 * - `tags`  → each is passed to `revalidateTag(...)`
 * - `paths` → each is passed to `revalidatePath(p, 'layout')` so
 *   nested routes that depend on the changed data also refresh
 * - If neither is provided, defaults to `revalidatePath('/', 'layout')`
 *   which flushes the whole app's data cache (heavy hammer, right
 *   choice for theme edits that touch every page).
 *
 * Auth: shared secret in `x-revalidate-secret` header, matched
 * against `REVALIDATE_SECRET` env. Without the env set the route is
 * disabled (returns 503) so a forgotten secret can't be silently
 * exploited as a cache-bust DoS vector.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "revalidate disabled — REVALIDATE_SECRET not set" },
      { status: 503 }
    )
  }

  const provided = req.headers.get("x-revalidate-secret")
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { tags?: unknown; paths?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // empty/invalid body — fall through to defaults below
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && t.length > 0)
    : []
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === "string" && p.length > 0)
    : []

  for (const t of tags) {
    revalidateTag(t)
  }
  for (const p of paths) {
    revalidatePath(p, "layout")
  }

  // Default: nothing specified → flush the entire app's data cache.
  // Theme edits affect every page (layout-level branding, footer,
  // navigation, etc.) so a path-scoped revalidation isn't enough.
  if (tags.length === 0 && paths.length === 0) {
    revalidatePath("/", "layout")
  }

  return NextResponse.json({
    ok: true,
    revalidated: { tags, paths, defaultedToRoot: tags.length === 0 && paths.length === 0 },
  })
}

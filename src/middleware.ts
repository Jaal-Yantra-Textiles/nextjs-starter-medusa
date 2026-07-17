import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import {
  ENV_PUBLISHABLE_KEY,
  IS_MULTI_TENANT,
  TENANT_PUBKEY_COOKIE,
  TENANT_PUBKEY_HEADER,
} from "@lib/util/get-request-pubkey"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

// Region maps are cached PER TENANT (keyed by publishable key). A shared
// multi-tenant Worker serves many stores from one isolate, so a single global
// region map would leak one tenant's regions to another. Single-tenant deploys
// simply have a one-entry map keyed by the env key — identical behaviour.
const regionMapCache = new Map<
  string,
  { regionMap: Map<string, HttpTypes.StoreRegion>; updated: number }
>()

type Tenant = { publishableKey: string }

// Host → tenant, keyed by host. A short in-isolate cache sits on top of the
// edge fetch cache so a warm isolate doesn't re-resolve on every request.
const tenantCache = new Map<
  string,
  { tenant: Tenant | null; updated: number }
>()

function getHost(request: NextRequest): string {
  return (request.headers.get("host") || "").toLowerCase().split(":")[0].trim()
}

// Geo country from either platform: Vercel (`x-vercel-ip-country`) or
// Cloudflare Workers (`cf-ipcountry`).
function geoCountry(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    undefined
  )?.toLowerCase()
}

/**
 * Resolve the incoming Host to its tenant (publishable key) via the backend
 * resolver. Only used in multi-tenant mode; single-tenant deploys use the env
 * key directly and never call this.
 */
async function resolveTenant(host: string): Promise<Tenant | null> {
  const cached = tenantCache.get(host)
  if (cached && cached.updated > Date.now() - 60 * 1000) {
    return cached.tenant
  }

  let tenant: Tenant | null = null
  try {
    const res = await fetch(
      `${BACKEND_URL}/web/storefront/resolve?host=${encodeURIComponent(host)}`,
      {
        // Keyed by host in the URL, so no cross-tenant collision.
        next: { revalidate: 300, tags: [`tenant-${host}`] },
        cache: "force-cache",
      }
    )
    if (res.ok) {
      const json = await res.json()
      if (json?.publishable_key) {
        tenant = { publishableKey: json.publishable_key }
      }
    }
  } catch {
    // Backend unreachable — treat as unresolved; caller returns 404.
  }

  tenantCache.set(host, { tenant, updated: Date.now() })
  return tenant
}

/**
 * Fetch the region map for a given tenant publishable key. `cacheScope` keys
 * the Next data-cache tag; in multi-tenant mode we also vary the fetch URL by
 * key so two tenants never share the same `/store/regions` cache entry.
 */
async function getRegionMap(pubkey: string, cacheScope: string) {
  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
    )
  }

  const entry = regionMapCache.get(pubkey) ?? {
    regionMap: new Map<string, HttpTypes.StoreRegion>(),
    updated: 0,
  }

  if (
    !entry.regionMap.keys().next().value ||
    entry.updated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because
    // middleware runs on the Edge and the client needs a Node environment.
    const regionsUrl = IS_MULTI_TENANT
      ? `${BACKEND_URL}/store/regions?_pk=${encodeURIComponent(pubkey)}`
      : `${BACKEND_URL}/store/regions`

    const { regions } = await fetch(regionsUrl, {
      headers: {
        "x-publishable-api-key": pubkey,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheScope}`],
      },
      cache: "force-cache",
    }).then(async (response) => {
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.message)
      }

      return json
    })

    if (!regions?.length) {
      throw new Error(
        "No regions found. Please set up regions in your Medusa Admin."
      )
    }

    const regionMap = new Map<string, HttpTypes.StoreRegion>()
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMap.set(c.iso_2 ?? "", region)
      })
    })

    entry.regionMap = regionMap
    entry.updated = Date.now()
    regionMapCache.set(pubkey, entry)
  }

  return entry.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = geoCountry(request)

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Middleware.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
      )
    }
  }
}

/**
 * Middleware to handle region selection and (multi-tenant) Host resolution.
 */
export async function middleware(request: NextRequest) {
  // Skip redirect loop for visual/theme editor iframes (cross-origin cookie issue)
  const isEditorMode =
    request.nextUrl.searchParams.get("visual_editor") === "true" ||
    request.nextUrl.searchParams.get("theme_editor") === "true"

  // Resolve the publishable key for this request. Single-tenant: the baked-in
  // env key. Multi-tenant (shared Worker): resolve the Host → tenant key; an
  // unknown host is not one of our storefronts → 404.
  let pubkey = ENV_PUBLISHABLE_KEY
  let cacheScope: string | undefined
  const host = getHost(request)

  if (IS_MULTI_TENANT) {
    const tenant = await resolveTenant(host)
    if (!tenant) {
      return new NextResponse("Storefront not found for this domain.", {
        status: 404,
      })
    }
    pubkey = tenant.publishableKey
    cacheScope = pubkey
  }

  let redirectUrl = request.nextUrl.href

  let response = NextResponse.redirect(redirectUrl, 307)

  let cacheIdCookie = request.cookies.get("_medusa_cache_id")

  let cacheId = cacheIdCookie?.value || crypto.randomUUID()

  // Single-tenant keeps the original per-visitor cache scope; multi-tenant
  // scopes by tenant key (set above).
  cacheScope ??= cacheId

  const regionMap = await getRegionMap(pubkey!, cacheScope)

  const countryCode = regionMap && (await getCountryCode(request, regionMap))

  // Detect visitors whose real (geo-IP) country isn't covered by ANY of the
  // store's regions. getCountryCode() silently coerces them into a fallback
  // region so the site still works, which erases the fact that we don't
  // actually ship there. We persist that fact in a cookie so product pages
  // can show a "we don't ship here yet" message (CASE A) instead of the
  // "prices coming soon" message used when a served region simply has no
  // price yet (CASE B). When the visitor IS served, the cookie is cleared.
  const geoCountryCode = geoCountry(request)
  const geoUnserved =
    geoCountryCode && !regionMap.has(geoCountryCode) ? geoCountryCode : ""

  // In multi-tenant mode, expose the resolved key to browser code (one client
  // component talks to the Store API directly) via a non-httpOnly cookie.
  const applyTenantCookie = (res: NextResponse) => {
    if (IS_MULTI_TENANT && pubkey) {
      res.cookies.set(TENANT_PUBKEY_COOKIE, pubkey, {
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      })
    }
    return res
  }

  const applyGeoCookie = (res: NextResponse) => {
    if (geoUnserved) {
      res.cookies.set("_medusa_geo_unserved", geoUnserved, {
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      })
    } else if (geoCountryCode) {
      // We know the visitor's country and it IS served — drop any stale flag.
      res.cookies.set("_medusa_geo_unserved", "", { maxAge: 0 })
    }
    return applyTenantCookie(res)
  }

  const urlHasCountryCode =
    countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode)

  // If the URL already has a valid country code, serve the page directly.
  // Set the cache-id cookie on the SAME response (via NextResponse.next) —
  // never redirect to the same URL, or clients without persistent cookies
  // (social preview bots, monitoring agents, some crawlers) get stuck in a
  // 307 loop. The existing editor-mode branch already did this; we now
  // apply the same behaviour universally.
  // `isEditorMode` is kept for call-site symmetry; both branches behave
  // the same now.
  void isEditorMode
  if (urlHasCountryCode) {
    // Forward the unserved flag onto the request cookies too, so the RSC that
    // renders THIS request (via getGeoUnservedCountry) sees it immediately —
    // a cookie set only on the response wouldn't be readable until the next
    // request, flashing the wrong message on a direct deep-link.
    const requestHeaders = new Headers(request.headers)
    // Multi-tenant: propagate the resolved key to RSC/server actions via a
    // request header (read in src/lib/config.ts through next/headers).
    if (IS_MULTI_TENANT && pubkey) {
      requestHeaders.set(TENANT_PUBKEY_HEADER, pubkey)
    }
    if (geoUnserved && !/(^|;\s*)_medusa_geo_unserved=/.test(requestHeaders.get("cookie") || "")) {
      const existing = requestHeaders.get("cookie")
      requestHeaders.set(
        "cookie",
        `${existing ? existing + "; " : ""}_medusa_geo_unserved=${geoUnserved}`
      )
    }
    const nextResponse = NextResponse.next({ request: { headers: requestHeaders } })
    if (!cacheIdCookie) {
      nextResponse.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
    }
    return applyGeoCookie(nextResponse)
  }

  // check if the url is a static asset
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  // If no country code is set, we redirect to the relevant region.
  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  } else if (!urlHasCountryCode && !countryCode) {
    // Handle case where no valid country code exists (empty regions)
    return new NextResponse(
      "No valid regions configured. Please set up regions with countries in your Medusa Admin.",
      { status: 500 }
    )
  }

  return applyGeoCookie(response)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}

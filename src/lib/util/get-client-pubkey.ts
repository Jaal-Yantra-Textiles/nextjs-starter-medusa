/**
 * Client-side publishable-key resolution. Mirrors get-request-pubkey.ts but
 * for browser code — it must NOT import `next/headers`. Single-tenant deploys
 * inline `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` at build; the multi-tenant Worker
 * exposes the Host-resolved key via the non-httpOnly `_medusa_pk` cookie the
 * edge middleware set.
 */
export function getClientPublishableKey(): string {
  // In multi-tenant mode the env key (if any leaked into the build) belongs to
  // no single tenant — always prefer the Host-resolved cookie. Mirror the
  // server-side IS_MULTI_TENANT precedence in get-request-pubkey.ts.
  const isMultiTenant = process.env.NEXT_PUBLIC_MULTI_TENANT === "true"
  if (!isMultiTenant) {
    const envKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    if (envKey) {
      return envKey
    }
  }
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)_medusa_pk=([^;]+)/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  }
  return ""
}

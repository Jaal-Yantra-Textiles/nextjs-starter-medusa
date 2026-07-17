/**
 * Client-side publishable-key resolution. Mirrors get-request-pubkey.ts but
 * for browser code — it must NOT import `next/headers`. Single-tenant deploys
 * inline `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` at build; the multi-tenant Worker
 * exposes the Host-resolved key via the non-httpOnly `_medusa_pk` cookie the
 * edge middleware set.
 */
export function getClientPublishableKey(): string {
  const envKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (envKey) {
    return envKey
  }
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)_medusa_pk=([^;]+)/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  }
  return ""
}

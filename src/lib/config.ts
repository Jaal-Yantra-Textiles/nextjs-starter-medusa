import { getLocaleHeader } from "@lib/util/get-locale-header"
import {
  ENV_PUBLISHABLE_KEY,
  IS_MULTI_TENANT,
  getRequestPublishableKey,
} from "@lib/util/get-request-pubkey"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

// Single-tenant: `publishableKey` is baked in and the SDK sends it on every
// request. Multi-tenant (shared Worker, no env key): left undefined here and
// attached per-request in the fetch wrapper below from the Host-resolved key.
export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  // Multi-tenant: never bake a key into the SDK (it would set a default header
  // the per-request wrapper below couldn't override). Single-tenant: use env.
  publishableKey: IS_MULTI_TENANT ? undefined : ENV_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  // Multi-tenant: the SDK has no baked-in key, so attach the Host-resolved
  // publishable key for this request. No-op on single-tenant deploys.
  if (IS_MULTI_TENANT) {
    try {
      const pk = await getRequestPublishableKey()
      if (pk) {
        headers["x-publishable-api-key"] ??= pk
      }
    } catch {}
  }

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}

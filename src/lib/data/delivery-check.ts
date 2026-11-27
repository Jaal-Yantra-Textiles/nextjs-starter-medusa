"use server"

import { sdk } from "@lib/config"
import type { DeliveryCheckResult } from "@lib/util/delivery-check"

/**
 * Ask the backend whether we deliver to a pin / postcode. The store (and its
 * ship-from location) is resolved from the request's publishable key, so a
 * partner storefront gets its own answer.
 *
 * Never throws: a network error comes back as "couldn't tell" so the box
 * simply says so and checkout carries on.
 */
export const checkDelivery = async (input: {
  countryCode: string
  postalCode: string
  variantId?: string
  cartId?: string
}): Promise<DeliveryCheckResult> => {
  const query: Record<string, string> = {
    country_code: input.countryCode.toLowerCase(),
    postal_code: input.postalCode.trim(),
  }
  if (input.cartId) query.cart_id = input.cartId
  else if (input.variantId) query.variant_id = input.variantId

  return sdk.client
    .fetch<DeliveryCheckResult>("/store/delivery-check", {
      query,
      cache: "no-store",
    })
    .catch(() => ({
      serviceable: null,
      cod_available: null,
      eta_days: null,
      message: "We couldn't check delivery right now. You can still place your order.",
      source: [],
      country_code: query.country_code,
      postal_code: query.postal_code,
    }))
}

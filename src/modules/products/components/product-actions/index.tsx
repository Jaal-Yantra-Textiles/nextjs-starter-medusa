"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button, Text } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import PriceComingSoon from "../price-coming-soon"
import RegionNotServedFallback from "../region-not-served-fallback"
import MadeToOrderNotice from "../artisan-detail/made-to-order-notice"
import { getArtisanDetail } from "../artisan-detail"
import MobileActions from "./mobile-actions"
import SpecChoices from "../production-spec/spec-choices"
import {
  blockedGroups,
  hasAnySpecChoice,
  initialSpecChoices,
  leadTimePhrase,
  needsSecondStep,
  summariseChoices,
  type SpecChoiceState,
} from "../production-spec/spec-choices-util"
import {
  addMadeToSpecToCart,
  type StoreProductSpec,
} from "@lib/data/product-spec"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  // #1365 — the partner's made-to-order spec, fetched server-side by the
  // wrapper. Absent (or not accepting custom orders) leaves every line below
  // inert, so an ordinary product's buying column is byte-for-byte unchanged.
  spec?: StoreProductSpec | null
  ctaText?: string
  // Visitor's real (geo-IP) country when it isn't served by any region —
  // set by middleware, threaded in from ProductActionsWrapper. Drives the
  // CASE A vs CASE B choice when a product has no price.
  unservedCountry?: string
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  spec = null,
  ctaText,
  unservedCountry,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // #1365 — made-to-order selection lives HERE, beside the variant options,
  // because one button now decides between an ordinary purchase and a woven-to
  // -order one by reading it.
  const [specChoices, setSpecChoices] = useState<SpecChoiceState>(() =>
    initialSpecChoices(spec)
  )
  const [specError, setSpecError] = useState<string | null>(null)

  const offersChoices = !!spec?.accepting_custom_orders
  const secondStep = needsSecondStep(spec)
  const madeToOrder = hasAnySpecChoice(spec, specChoices)
  const specBlocked = blockedGroups(spec)
  const leadTime = leadTimePhrase(spec)

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // A multi-variant product where the shopper hasn't picked a valid variant
  // yet. Until they do we can't resolve a variant-specific price or stock, so
  // we prompt them to choose rather than flashing a misleading "Out of stock".
  const needsVariantSelection =
    (product.variants?.length ?? 0) > 1 && !isValidVariant

  // #859 S3 (#862): artisan made-to-order / min-order-qty detail.
  const artisanDetail = useMemo(() => getArtisanDetail(product), [product])
  const minOrderQuantity = useMemo(() => {
    const min = artisanDetail?.min_order_quantity
    return min && min > 1 ? min : 1
  }, [artisanDetail])

  // True when at least one variant has a calculated_price for the visitor's
  // region. When false we can't show a price or add-to-cart, so we swap the
  // commerce block for a fallback: "we don't ship here yet" if the visitor's
  // real country isn't served (CASE A), otherwise "prices coming soon" for a
  // served region whose price simply hasn't been finalised (CASE B).
  const hasAnyPrice = useMemo(() => {
    return (product.variants ?? []).some(
      (v: any) => v?.calculated_price?.calculated_amount != null
    )
  }, [product.variants])

  // add the selected variant to the cart
  //
  // #1365 — ONE button. Which purchase it makes is decided by whether the
  // customer expressed a made-to-order intent, not by which of two buttons they
  // found. `hasAnySpecChoice` is the whole hinge, which is why it lives in a
  // tested pure function rather than inline here.
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)
    setSpecError(null)

    try {
      if (madeToOrder) {
        await addMadeToSpecToCart({
          variantId: selectedVariant.id,
          quantity: minOrderQuantity,
          color: specChoices.color,
          note: specChoices.note,
          options: specChoices.options,
          countryCode,
        })
      } else {
        await addToCart({
          variantId: selectedVariant.id,
          quantity: minOrderQuantity,
          countryCode,
        })
      }
    } catch (e: any) {
      // The backend's rejection names the colours that ARE available. Showing
      // our own generic message instead would throw that away.
      setSpecError(e?.message || "We couldn't add this to your cart.")
    } finally {
      setIsAdding(false)
    }
  }

  if (!hasAnyPrice) {
    return (
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        {unservedCountry ? (
          // CASE A — the visitor's real country isn't covered by any region.
          <RegionNotServedFallback
            product={product}
            countryCode={unservedCountry}
          />
        ) : (
          // CASE B — region is served, price just isn't finalised yet.
          <PriceComingSoon />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        {/* #1365 — between the variant selector and the price. A made-to-order
            choice is part of deciding WHAT you are buying, so it belongs above
            the number, not below the button. */}
        {offersChoices && !secondStep && (
          <div className="flex flex-col gap-y-4 pb-2">
            <SpecChoices
              spec={spec!}
              value={specChoices}
              onChange={setSpecChoices}
              disabled={!!disabled || isAdding}
            />
          </div>
        )}

        {/* Too many choices for a 300px column. A summary of what is on offer
            and a real link — never a disclosure that reflows the whole page. */}
        {offersChoices && secondStep && (
          <div
            className="flex flex-col gap-y-1 pb-2"
            data-testid="customise-summary"
          >
            <Text size="small" className="text-ui-fg-subtle">
              Made to order — {summariseChoices(spec)}
            </Text>
            <LocalizedClientLink
              href={`/products/${product.handle}/customise`}
              className="text-ui-fg-base underline underline-offset-4 txt-compact-small-plus"
              data-testid="customise-link"
            >
              Customise this piece &rarr;
            </LocalizedClientLink>
          </div>
        )}

        <ProductPrice product={product} variant={selectedVariant} />

        <MadeToOrderNotice detail={artisanDetail} />

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant ||
            (madeToOrder && !!specBlocked.length)
          }
          variant="primary"
          className="w-full h-10"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {needsVariantSelection ? (
            "Select a variant"
          ) : !inStock || !isValidVariant ? (
            "Out of stock"
          ) : (
            /* Only the call-to-action branch is theme-editable, so only it
               carries the marker. "Select a variant" / "Out of stock" are
               states, not copy — the editor's live preview must not overwrite
               them with the partner's CTA text. */
            <span data-theme-el="product-cta">{ctaText || "Add to cart"}</span>
          )}
        </Button>
        {needsVariantSelection && (
          <Text
            className="text-ui-fg-subtle text-center"
            size="small"
            data-testid="select-variant-hint"
          >
            Select an option above to see price and availability.
          </Text>
        )}
        {/* #1365 — #1349 split the two buttons precisely so the wait could not
            hide until checkout. Folding them back into one is only honest with
            this line present: it appears the moment the selection turns the
            purchase into a made-to-order one. */}
        {madeToOrder && leadTime && (
          <Text
            size="small"
            className="text-ui-fg-subtle text-center"
            data-testid="made-to-order-lead-time"
          >
            {leadTime}
          </Text>
        )}
        {specError && (
          <Text
            size="small"
            className="text-ui-fg-error"
            data-testid="spec-error"
          >
            {specError}
          </Text>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}

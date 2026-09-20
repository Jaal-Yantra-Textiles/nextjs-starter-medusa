"use client"

import { Badge, Heading, Input, Label, Text } from "@medusajs/ui"
import React from "react"

import { applyPromotions } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isBusy, setIsBusy] = React.useState(false)

  const { promotions = [] } = cart

  /**
   * 🔑 This file deliberately does NOT carry the `router.refresh()` that its
   * `apps/storefront` twin needs.
   *
   * There, the handlers POST to a route handler, so `revalidateTag` invalidates
   * the server cache and nothing pushes a new render to the client — the panel
   * kept showing the pre-mutation total, off by the whole discount, in both
   * directions (#2194). Here the form submits through a SERVER ACTION and
   * `applyPromotions` is called directly, so the revalidation re-renders the
   * route on its own. Adding a refresh would be cargo-cult.
   *
   * What this file DID share with it: a rejected code was wiped from the field,
   * nothing was disabled mid-request, and a failed REMOVE threw unhandled.
   */
  const removePromotionCode = async (code: string) => {
    const validPromotions = promotions.filter(
      (promotion) => promotion.code !== code
    )

    setErrorMessage("")
    setIsBusy(true)
    try {
      await applyPromotions(
        validPromotions.filter((p) => p.code !== undefined).map((p) => p.code!)
      )
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to remove the promotion code")
    } finally {
      setIsBusy(false)
    }
  }

  const addPromotionCode = async (formData: FormData) => {
    setErrorMessage("")
    if (isBusy) {
      return
    }

    const code = formData.get("code")
    if (!code) {
      return
    }
    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code !== undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    setIsBusy(true)
    try {
      await applyPromotions(codes)
      /**
       * Only on SUCCESS. Clearing unconditionally wiped a REJECTED code and
       * left the error with nothing beside it, so a refusal looked the same
       * as an acceptance.
       */
      if (input) {
        input.value = ""
      }
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to apply the promotion code")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="w-full flex flex-col rounded-rounded border border-ui-border-base bg-white p-4">
      <div className="txt-medium">
        <form action={(a) => addPromotionCode(a)} className="w-full mb-5">
          <Label className="flex gap-x-1 my-2 items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="txt-medium text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="add-discount-button"
            >
              Add Promotion Code(s)
            </button>

            {/* <Tooltip content="You can add multiple promotion codes">
              <InformationCircleSolid color="var(--fg-muted)" />
            </Tooltip> */}
          </Label>

          {isOpen && (
            <>
              <div className="flex w-full gap-x-2">
                <Input
                  className="size-full"
                  id="promotion-input"
                  name="code"
                  type="text"
                  autoFocus={false}
                  disabled={isBusy}
                  data-testid="discount-input"
                />
                <SubmitButton
                  variant="secondary"
                  data-testid="discount-apply-button"
                >
                  Apply
                </SubmitButton>
              </div>

              <ErrorMessage
                error={errorMessage}
                data-testid="discount-error-message"
              />
            </>
          )}
        </form>

        {promotions.length > 0 && (
          <div className="w-full flex items-center">
            <div className="flex flex-col w-full">
              <Heading className="txt-medium mb-2">
                Promotion(s) applied:
              </Heading>

              {promotions.map((promotion) => {
                return (
                  <div
                    key={promotion.id}
                    className="flex items-center justify-between w-full max-w-full mb-2"
                    data-testid="discount-row"
                  >
                    <Text className="flex gap-x-1 items-baseline txt-small-plus w-4/5 pr-1">
                      <span className="truncate" data-testid="discount-code">
                        <Badge
                          color={promotion.is_automatic ? "green" : "grey"}
                          size="small"
                        >
                          {promotion.code}
                        </Badge>{" "}
                        (
                        {promotion.application_method?.value !== undefined &&
                          promotion.application_method.currency_code !==
                            undefined && (
                            <>
                              {promotion.application_method.type ===
                              "percentage"
                                ? `${promotion.application_method.value}%`
                                : convertToLocale({
                                    amount: +promotion.application_method.value,
                                    currency_code:
                                      promotion.application_method
                                        .currency_code,
                                  })}
                            </>
                          )}
                        )
                        {/* {promotion.is_automatic && (
                          <Tooltip content="This promotion is automatically applied">
                            <InformationCircleSolid className="inline text-zinc-400" />
                          </Tooltip>
                        )} */}
                      </span>
                    </Text>
                    {!promotion.is_automatic && (
                      <button
                        className="flex items-center"
                        onClick={() => {
                          if (!promotion.code) {
                            return
                          }

                          removePromotionCode(promotion.code)
                        }}
                        disabled={isBusy}
                        data-testid="remove-discount-button"
                      >
                        <Trash size={14} />
                        <span className="sr-only">
                          Remove discount code from order
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiscountCode

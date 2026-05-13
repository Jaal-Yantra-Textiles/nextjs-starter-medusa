import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type FreeShippingBarProps = {
  cart: HttpTypes.StoreCart
  // String from the theme editor — could be "5000", "$50", or "₹2,000".
  // Anything numeric we can extract counts; if we can't parse, we render
  // nothing so the partner's typo doesn't paint a broken bar.
  threshold: string
}

const parseThreshold = (raw: string): number | null => {
  const cleaned = raw.replace(/[^0-9.]/g, "")
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

const FreeShippingBar = ({ cart, threshold }: FreeShippingBarProps) => {
  const target = parseThreshold(threshold)
  if (target === null || target <= 0) return null

  const current = cart.item_total ?? 0
  const reached = current >= target
  const remaining = Math.max(0, target - current)
  const percent = Math.min(100, Math.round((current / target) * 100))

  const currency = cart.region?.currency_code || "USD"
  const remainingLabel = convertToLocale({
    amount: remaining,
    currency_code: currency,
  })
  const targetLabel = convertToLocale({
    amount: target,
    currency_code: currency,
  })

  return (
    <div
      className="flex flex-col gap-y-2 bg-ui-bg-subtle p-3 rounded-base"
      data-testid="free-shipping-bar"
    >
      <Text className="txt-compact-small text-ui-fg-subtle">
        {reached
          ? "You qualify for free shipping."
          : `Add ${remainingLabel} more for free shipping (${targetLabel}).`}
      </Text>
      <div
        className="h-1.5 w-full rounded-full bg-ui-bg-base overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Free shipping progress"
      >
        <div
          className="h-full bg-ui-tag-green-bg transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default FreeShippingBar

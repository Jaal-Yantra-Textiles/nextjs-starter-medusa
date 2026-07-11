import { Text, clx } from "@medusajs/ui"
import { ArtisanDetail, formatLeadTime } from "./index"

/**
 * Inline made-to-order reassurance shown in the buy box (#859 S3 / #862).
 *
 * Rendered only when the partner marked the product made-to-order. Explains
 * that the item is produced on demand and, when available, roughly how long
 * preparation takes ("~3 weeks") plus any minimum order quantity.
 */
export default function MadeToOrderNotice({
  detail,
  className,
}: {
  detail: ArtisanDetail | null
  className?: string
}) {
  if (!detail?.made_to_order) return null

  const leadTime = formatLeadTime(detail)
  const minQty =
    detail.min_order_quantity && detail.min_order_quantity > 1
      ? detail.min_order_quantity
      : null

  return (
    <div
      data-testid="made-to-order-notice"
      className={clx(
        "border border-ui-border-base rounded-rounded p-3 flex flex-col gap-y-1",
        className
      )}
    >
      <Text size="small" weight="plus" className="text-ui-fg-base">
        Made to order
      </Text>
      <Text size="small" className="text-ui-fg-subtle">
        This piece is crafted for you once you order
        {leadTime ? ` — ${leadTime}.` : "."}
      </Text>
      {minQty && (
        <Text size="small" className="text-ui-fg-subtle">
          Minimum order: {minQty}
        </Text>
      )}
    </div>
  )
}

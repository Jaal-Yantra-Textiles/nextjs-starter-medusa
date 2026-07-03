import { Text } from "@medusajs/ui"

// Rendered when the visitor's region IS served but the product has no
// finalised price in that region's currency yet — e.g. the partner added
// the product but hasn't priced it, or FX fanout hasn't produced a price
// in this currency. Unlike RegionNotServedFallback ("we don't ship here"),
// this reassures the shopper that pricing is on the way rather than that we
// can't ship to them.
export default function PriceComingSoon() {
  return (
    <div
      data-testid="price-coming-soon"
      className="border border-ui-border-base rounded-rounded p-6 flex flex-col gap-y-2"
    >
      <Text size="large" weight="plus">
        Prices coming soon
      </Text>
      <Text className="text-ui-fg-subtle" size="small">
        We haven&apos;t finalised the prices for these products yet — it&apos;s
        in progress. Please check back soon.
      </Text>
    </div>
  )
}

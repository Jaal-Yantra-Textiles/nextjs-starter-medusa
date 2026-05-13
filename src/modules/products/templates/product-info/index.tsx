import { HttpTypes } from "@medusajs/types"
import { Badge, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  showSku?: boolean
  showStockStatus?: boolean
}

// A product is "in stock" if any variant either ignores inventory or has
// stock above zero. Variants without an inventory_quantity field are
// treated as available (mirrors the cart logic).
const deriveStockStatus = (product: HttpTypes.StoreProduct) => {
  const variants = product.variants || []
  if (variants.length === 0) return { inStock: false, total: 0 }
  let total = 0
  let inStock = false
  for (const v of variants) {
    if (!v.manage_inventory || v.allow_backorder) {
      inStock = true
      continue
    }
    const qty = (v as any).inventory_quantity ?? 0
    total += qty
    if (qty > 0) inStock = true
  }
  return { inStock, total }
}

const ProductInfo = ({ product, showSku, showStockStatus }: ProductInfoProps) => {
  const primarySku = product.variants?.[0]?.sku
  const stock = showStockStatus ? deriveStockStatus(product) : null

  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4 lg:max-w-[500px] mx-auto">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-medium text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        <Heading
          level="h2"
          className="text-3xl leading-10 text-ui-fg-base"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        {(showSku || stock) && (
          <div className="flex items-center gap-x-2 text-ui-fg-muted txt-compact-small">
            {showSku && primarySku && (
              <span data-testid="product-sku">SKU: {primarySku}</span>
            )}
            {showSku && primarySku && stock && <span aria-hidden>·</span>}
            {stock && (
              <Badge color={stock.inStock ? "green" : "red"} size="2xsmall">
                {stock.inStock ? "In stock" : "Out of stock"}
              </Badge>
            )}
          </div>
        )}

        <Text
          className="text-medium text-ui-fg-subtle whitespace-pre-line"
          data-testid="product-description"
        >
          {product.description}
        </Text>
      </div>
    </div>
  )
}

export default ProductInfo

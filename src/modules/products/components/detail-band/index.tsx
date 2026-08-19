import { Heading, Text } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

import { getProductSpec } from "@lib/data/product-spec"
import { WebsiteTheme } from "@lib/data/website"
import { getArtisanDetail } from "@modules/products/components/artisan-detail"

import BandShell from "./band-shell"
import { resolveDetailBand, type ResolvedDetailBlock } from "./resolve"
import SpecIcon from "@modules/products/components/production-spec/spec-icon"

/**
 * #1364 — the full-width band below the gallery.
 *
 * A server component, so every block's content is fetched and cached with the
 * page rather than after it paints, and so the availability check that decides
 * what renders happens before any markup exists. A client-side "hide if empty"
 * would still ship the headings and then remove them.
 *
 * Renders nothing when the theme has no band, when the band is off, or when
 * this particular product cannot fill a single one of its blocks.
 */

type Props = {
  product: HttpTypes.StoreProduct
  theme?: WebsiteTheme | null
}

const attributeRows = (product: HttpTypes.StoreProduct) =>
  [
    { label: "Material", value: product.material },
    { label: "Country of origin", value: product.origin_country },
    { label: "Type", value: product.type?.value },
    { label: "Weight", value: product.weight ? `${product.weight} g` : null },
    {
      label: "Dimensions",
      value:
        product.length && product.width && product.height
          ? `${product.length}L x ${product.width}W x ${product.height}H`
          : null,
    },
  ].filter((r) => !!r.value) as Array<{ label: string; value: string }>

const ProductDetailBand = async ({ product, theme }: Props) => {
  const band = theme?.product_page?.detail_band
  // Cheap exit before any fetch: an absent or disabled band must not cost the
  // page a spec lookup.
  if (!band?.enabled) {
    return null
  }

  const { spec, technique } = await getProductSpec(product.id)
  // Synchronous — it reads a field already on the product, no fetch.
  const artisan = getArtisanDetail(product)

  const specRows = [
    ...(spec?.weave_label || technique?.label
      ? [
          {
            key: "weave",
            label: "Weave",
            value: spec?.weave_label || technique?.label || "",
            icon: "weave",
          },
        ]
      : []),
    ...Object.entries(spec?.params ?? {}).map(([key, value]) => {
      const def = technique?.params.find((p) => p.key === key)
      return {
        key,
        label: def?.label ?? key,
        value: def?.unit ? `${value} ${def.unit}` : `${value}`,
        icon: def?.icon,
      }
    }),
    ...(spec?.finishes?.length
      ? [
          {
            key: "finishes",
            label: "Finishing & care",
            value: spec.finishes.join(", "),
            icon: "finish",
          },
        ]
      : []),
  ]

  const fieldRows = (spec?.fields ?? [])
    .filter((f) => (f.value ?? "").trim())
    .map((f) => ({
      key: f.key,
      label: (f.label ?? f.key).trim(),
      value: (f.value ?? "").trim(),
      icon: "note",
    }))

  const attributes = attributeRows(product)

  // What this product can actually fill. Computed here, where the fetches are,
  // and handed to the pure rule — which stays free of them so it can be tested.
  const resolved = resolveDetailBand(band, {
    spec: specRows.length > 0,
    spec_fields: fieldRows.length > 0,
    attributes: attributes.length > 0,
    maker: !!artisan?.maker_story?.trim(),
  })

  if (!resolved) {
    return null
  }

  const renderBlock = (block: ResolvedDetailBlock) => {
    switch (block.source) {
      case "spec":
        return <IconRows rows={specRows} />
      case "spec_fields":
        return <IconRows rows={fieldRows} />
      case "attributes":
        return (
          <IconRows
            rows={attributes.map((a) => ({ ...a, key: a.label, icon: "note" }))}
          />
        )
      case "maker":
        return (
          <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
            {artisan?.maker_story?.trim()}
          </Text>
        )
      default:
        return (
          <Text size="small" className="text-ui-fg-subtle whitespace-pre-line">
            {block.body}
          </Text>
        )
    }
  }

  return (
    <div
      className="content-container my-16 small:my-24"
      data-testid="product-detail-band"
      data-band-layout={resolved.layout}
    >
      {resolved.heading && (
        <Heading level="h2" className="text-xl-semi mb-6">
          {resolved.heading}
        </Heading>
      )}
      <BandShell layout={resolved.layout} blocks={resolved.blocks}>
        {resolved.blocks.map(renderBlock)}
      </BandShell>
    </div>
  )
}

const IconRows = ({
  rows,
}: {
  rows: Array<{ key: string; label: string; value: string; icon?: string }>
}) => (
  <dl className="flex flex-col">
    {rows.map((row) => (
      <div
        key={row.key}
        className="flex items-baseline justify-between gap-x-4 border-b border-ui-border-base py-2"
      >
        <dt className="text-ui-fg-subtle text-sm flex items-center gap-x-2">
          <SpecIcon name={row.icon} className="shrink-0 opacity-60" />
          {row.label}
        </dt>
        <dd className="text-ui-fg-base text-sm text-right">{row.value}</dd>
      </div>
    ))}
  </dl>
)

export default ProductDetailBand

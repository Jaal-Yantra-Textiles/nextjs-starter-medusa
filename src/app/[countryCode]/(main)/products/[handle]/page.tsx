import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getWebsite } from "@lib/data/website"
import { buildLocalizedAlternates, cleanMetaDescription } from "@lib/util/seo"
import ProductTemplate from "@modules/products/templates"
import ThemeEditorBridge from "@modules/layout/components/theme-editor-bridge"

import { HttpTypes } from "@medusajs/types"


// Force dynamic rendering to avoid DYNAMIC_SERVER_USAGE errors
// caused by cookies() calls in getRegion/getCacheOptions during ISR
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string; theme_editor?: string }>
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
): HttpTypes.StoreProductImage[] {
  const productImages = product.images ?? []

  if (!selectedVariantId || !product.variants) {
    return productImages
  }

  const variant = product.variants.find((v) => v.id === selectedVariantId)
  const variantImages = variant?.images ?? []
  if (!variant || variantImages.length === 0) {
    return productImages
  }

  const imageIdsMap = new Map(variantImages.map((i) => [i.id, true]))
  return productImages.filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const description = product.description
    ? cleanMetaDescription(product.description)
    : `Shop ${product.title} online.`

  const alternates = await buildLocalizedAlternates(
    params.countryCode,
    `products/${params.handle}`
  )

  return {
    title: product.title,
    description,
    alternates,
    openGraph: {
      title: product.title,
      description,
      type: "website",
      images: product.thumbnail
        ? [{ url: product.thumbnail, alt: product.title }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id
  const isThemeEditor = searchParams.theme_editor === "true"

  if (!region) {
    notFound()
  }

  const [pricedProduct, website] = await Promise.all([
    listProducts({
      countryCode: params.countryCode,
      queryParams: { handle: params.handle },
    }).then(({ response }) => response.products[0]),
    getWebsite(undefined, { noCache: isThemeEditor }).catch(() => null),
  ])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <>
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images}
        theme={website?.theme}
      />
      {isThemeEditor && <ThemeEditorBridge />}
    </>
  )
}

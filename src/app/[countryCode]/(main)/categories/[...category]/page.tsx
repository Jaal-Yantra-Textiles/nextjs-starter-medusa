import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import {
  buildLocalizedAlternates,
  cleanMetaDescription,
  getFirstProductImageFor,
} from "@lib/util/seo"
import CategoryTemplate from "@modules/categories/templates"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export const runtime = "edge"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)

    const title = productCategory.name

    const description = productCategory.description
      ? cleanMetaDescription(productCategory.description)
      : `Shop ${title} at our store.`

    const categoryPath = `categories/${params.category.join("/")}`
    const alternates = await buildLocalizedAlternates(
      params.countryCode,
      categoryPath
    )

    const metaOgImage = (productCategory as any).metadata?.og_image
    const firstProductImage =
      metaOgImage ||
      productCategory.products?.[0]?.thumbnail ||
      (await getFirstProductImageFor({
        countryCode: params.countryCode,
        categoryId: productCategory.id,
      })) ||
      undefined

    const ogImages = firstProductImage
      ? [{ url: firstProductImage, alt: title }]
      : undefined

    return {
      title,
      description,
      alternates,
      openGraph: {
        title,
        description,
        type: "website",
        ...(ogImages ? { images: ogImages } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(firstProductImage ? { images: [firstProductImage] } : {}),
      },
    }
  } catch (error) {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
    />
  )
}

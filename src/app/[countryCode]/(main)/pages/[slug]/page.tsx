import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getWebsitePage } from "@lib/data/website"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import TipTapViewer from "@modules/website/components/tiptap-viewer"
import { buildBlockStyle, bentoSpanClass } from "@modules/website/components/block-style-helpers"

import VisualEditorBridge from "@modules/website/components/visual-editor-bridge"


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const page = await getWebsitePage(undefined, slug)
    return { title: page?.title || "Page" }
  } catch {
    return { title: "Page" }
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const search = await searchParams
  const isVisualEditor = search.visual_editor === "true"

  let page: Awaited<ReturnType<typeof getWebsitePage>> | null = null
  try {
    page = await getWebsitePage(undefined, slug)
  } catch {
    notFound()
  }
  if (!page) {
    notFound()
  }

  const renderHero = (
    blockId: string | undefined,
    title?: string,
    subtitle?: string,
    align: "left" | "center" = "center"
  ) => (
    <section className="relative mb-8 md:mb-12">
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw] bg-gradient-to-b from-ui-bg-base to-transparent">
        <div
          className={`content-container py-10 md:py-16 ${align === "left" ? "text-left" : "text-center"}`}
        >
          {title && (
            <h1
              className="mb-3 text-2xl md:text-4xl font-semibold tracking-tight"
              {...(isVisualEditor ? { "data-field": "title" } : {})}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              className={`${align === "left" ? "max-w-xl" : "max-w-xl mx-auto"} text-ui-fg-subtle text-sm md:text-base`}
              {...(isVisualEditor ? { "data-field": "subtitle" } : {})}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  )

  const renderMain = (
    body?: unknown,
    sectionTitle?: string,
    blockId?: string
  ) => {
    const fieldProps = isVisualEditor
      ? { "data-field": "body" as const }
      : {}
    const titleProps = isVisualEditor
      ? { "data-field": "title" as const }
      : {}
    if (body && typeof body === "object") {
      return (
        <section className="prose prose-neutral max-w-none">
          {sectionTitle && (
            <h2 className="mt-0 mb-6" {...titleProps}>{sectionTitle}</h2>
          )}
          <div {...fieldProps}>
            <TipTapViewer doc={body} className="tiptap-content" />
          </div>
        </section>
      )
    }

    const text = typeof body === "string" ? body : ""
    return (
      <section className="prose prose-neutral max-w-none prose-p:mb-4 prose-headings:mb-6 prose-ul:mb-4 prose-ol:mb-4">
        {sectionTitle && (
          <h2 className="mt-0 mb-6" {...titleProps}>{sectionTitle}</h2>
        )}
        {text ? (
          <div {...fieldProps}>
            <p className="text-base md:text-lg">{text}</p>
          </div>
        ) : (
          <p className="text-ui-fg-subtle">No content</p>
        )}
      </section>
    )
  }

  const renderHeader = (content: any) => {
    const links: Array<{ label?: string; href?: string }> =
      content?.links || []
    return (
      <nav className="w-full border-b border-ui-border-base py-4">
        <div className="content-container flex items-center justify-between">
          <span
            className="font-semibold text-lg"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content?.title || ""}
          </span>
          <ul className="flex items-center gap-x-6">
            {links.map((link, i) => (
              <li key={i}>
                <a
                  href={link.href || "#"}
                  className="text-sm text-ui-fg-subtle hover:text-ui-fg-base"
                  {...(isVisualEditor ? { "data-field": `links.${i}.label` } : {})}
                >
                  {link.label || "Link"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    )
  }

  const renderFooter = (content: any) => {
    const links: Array<{ label?: string; href?: string }> =
      content?.links || []
    return (
      <footer className="w-full border-t border-ui-border-base py-6 mt-8">
        <div className="content-container text-center">
          {content?.text && (
            <p
              className="text-sm text-ui-fg-subtle mb-4"
              {...(isVisualEditor ? { "data-field": "text" } : {})}
            >
              {content.text}
            </p>
          )}
          {links.length > 0 && (
            <ul className="flex items-center justify-center gap-x-6">
              {links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href || "#"}
                    className="text-xs text-ui-fg-muted hover:text-ui-fg-base"
                    {...(isVisualEditor ? { "data-field": `links.${i}.label` } : {})}
                  >
                    {link.label || "Link"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </footer>
    )
  }

  const renderGallery = (content: any) => {
    const images: Array<{ url?: string; alt?: string }> =
      content?.images || []
    return (
      <section>
        {content?.title && (
          <h2
            className="text-xl md:text-2xl font-semibold mb-4"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h2>
        )}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-field="images">
            {images.map((img, i) => (
              <div key={i} className="rounded-lg overflow-hidden bg-ui-bg-subtle">
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.alt || ""}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-ui-fg-muted text-sm">
                    No image
                  </div>
                )}
                {img.alt && (
                  <p className="text-xs text-ui-fg-muted p-2 text-center">{img.alt}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 text-ui-fg-muted text-sm border-2 border-dashed border-ui-border-base rounded-lg"
            data-field="images"
          >
            No images in gallery
          </div>
        )}
      </section>
    )
  }

  const renderFeature = (content: any) => {
    const features: Array<{
      title?: string
      description?: string
      icon?: string
    }> = content?.features || []
    const single = features.length === 0 && (content?.title || content?.description)
    if (single) {
      return (
        <section className="rounded-lg border border-ui-border-base p-6">
          {content.title && (
            <h3
              className="text-lg font-semibold mb-2"
              {...(isVisualEditor ? { "data-field": "title" } : {})}
            >
              {content.title}
            </h3>
          )}
          {content.description && (
            <p
              className="text-sm text-ui-fg-subtle"
              {...(isVisualEditor ? { "data-field": "description" } : {})}
            >
              {content.description}
            </p>
          )}
        </section>
      )
    }
    return (
      <section>
        {content?.title && (
          <h2
            className="text-xl md:text-2xl font-semibold mb-4"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h2>
        )}
        {features.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="rounded-lg border border-ui-border-base p-5">
                {f.icon && (
                  <div className="text-2xl mb-2" data-field={`features.${i}.icon`}>
                    {f.icon}
                  </div>
                )}
                <h3
                  className="font-semibold mb-1"
                  {...(isVisualEditor ? { "data-field": `features.${i}.title` } : {})}
                >
                  {f.title || ""}
                </h3>
                <p
                  className="text-sm text-ui-fg-subtle"
                  {...(isVisualEditor ? { "data-field": `features.${i}.description` } : {})}
                >
                  {f.description || ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  }

  const renderTestimonial = (content: any) => {
    const testimonials: Array<{
      quote?: string
      author?: string
      role?: string
      avatar_url?: string
    }> = content?.testimonials || []
    const single =
      testimonials.length === 0 && (content?.quote || content?.author)
    if (single) {
      return (
        <blockquote className="rounded-lg border-l-4 border-ui-border-strong pl-6 py-4">
          {content.quote && (
            <p
              className="text-lg italic text-ui-fg-base mb-2"
              {...(isVisualEditor ? { "data-field": "quote" } : {})}
            >
              "{content.quote}"
            </p>
          )}
          {content.author && (
            <footer className="text-sm text-ui-fg-muted">
              <span data-field={isVisualEditor ? "author" : undefined}>
                — {content.author}
              </span>
              {content.role && (
                <span className="text-ui-fg-muted">, {content.role}</span>
              )}
            </footer>
          )}
        </blockquote>
      )
    }
    return (
      <section>
        {content?.title && (
          <h2
            className="text-xl md:text-2xl font-semibold mb-4"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h2>
        )}
        {testimonials.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <blockquote
                key={i}
                className="rounded-lg border-l-4 border-ui-border-strong pl-6 py-4"
              >
                {t.quote && (
                  <p className="text-lg italic text-ui-fg-base mb-2">
                    "{t.quote}"
                  </p>
                )}
                <footer className="text-sm text-ui-fg-muted">
                  {t.avatar_url && (
                    <img
                      src={t.avatar_url}
                      alt={t.author || ""}
                      className="w-10 h-10 rounded-full inline-block mr-2 object-cover"
                    />
                  )}
                  — {t.author || ""}
                  {t.role && <span className="text-ui-fg-muted">, {t.role}</span>}
                </footer>
              </blockquote>
            ))}
          </div>
        )}
      </section>
    )
  }

  const renderProduct = (content: any) => {
    return (
      <section className="rounded-lg border border-ui-border-base p-6">
        {content?.title && (
          <h3
            className="text-lg font-semibold mb-2"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h3>
        )}
        {content?.description && (
          <p
            className="text-sm text-ui-fg-subtle mb-3"
            {...(isVisualEditor ? { "data-field": "description" } : {})}
          >
            {content.description}
          </p>
        )}
        {content?.product_handle && (
          <LocalizedClientLink
            href={`/products/${content.product_handle}`}
            className="text-sm text-ui-fg-base underline"
          >
            View Product
          </LocalizedClientLink>
        )}
        {content?.product_id && !content?.product_handle && (
          <p className="text-xs text-ui-fg-muted" data-field="product_id">
            Product ID: {content.product_id}
          </p>
        )}
        {!content?.product_handle && !content?.product_id && (
          <p className="text-xs text-ui-fg-muted" data-field="product_id">
            No product linked
          </p>
        )}
      </section>
    )
  }

  const renderContactForm = (content: any) => {
    const fields: Array<{
      name?: string
      label?: string
      type?: string
      required?: boolean
    }> = content?.fields || []
    return (
      <section className="max-w-md">
        {content?.title && (
          <h2
            className="text-xl md:text-2xl font-semibold mb-2"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p
            className="text-sm text-ui-fg-subtle mb-4"
            {...(isVisualEditor ? { "data-field": "description" } : {})}
          >
            {content.description}
          </p>
        )}
        <form className="space-y-4">
          {fields.length > 0 ? (
            fields.map((field, i) => (
              <div key={i}>
                <label
                  className="block text-sm font-medium mb-1"
                  data-field={isVisualEditor ? `fields.${i}.label` : undefined}
                >
                  {field.label || field.name || "Field"}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type={field.type || "text"}
                  name={field.name || field.label || ""}
                  required={field.required}
                  disabled={isVisualEditor}
                  className="w-full rounded-md border border-ui-border-base px-3 py-2 text-sm"
                />
              </div>
            ))
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  disabled={isVisualEditor}
                  className="w-full rounded-md border border-ui-border-base px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  disabled={isVisualEditor}
                  className="w-full rounded-md border border-ui-border-base px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  disabled={isVisualEditor}
                  className="w-full rounded-md border border-ui-border-base px-3 py-2 text-sm min-h-[100px]"
                />
              </div>
            </>
          )}
          <button
            type="button"
            disabled={isVisualEditor}
            className="rounded-md bg-ui-bg-base px-4 py-2 text-sm font-medium"
          >
            Send Message
          </button>
        </form>
      </section>
    )
  }

  const renderHeroWithImage = (content: any, isVisualEditor: boolean) => {
    const layout = content?.layout || "image-right"
    const imageUrl = content?.image_url || content?.image || ""
    const buttons: Array<{ label?: string; href?: string; variant?: string }> = content?.buttons || []

    const textSide = (
      <div className="flex flex-col justify-center py-8 md:py-12">
        {content?.eyebrow && (
          <p
            className="text-sm font-semibold text-ui-fg-muted uppercase tracking-wider mb-2"
            {...(isVisualEditor ? { "data-field": "eyebrow" } : {})}
          >
            {content.eyebrow}
          </p>
        )}
        {content?.title && (
          <h1
            className="text-3xl md:text-5xl font-semibold tracking-tight mb-4"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h1>
        )}
        {content?.subtitle && (
          <p
            className="text-base md:text-lg text-ui-fg-subtle mb-6 max-w-lg"
            {...(isVisualEditor ? { "data-field": "subtitle" } : {})}
          >
            {content.subtitle}
          </p>
        )}
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {buttons.map((btn, i) => (
              <a
                key={i}
                href={btn.href || "#"}
                className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors ${
                  btn.variant === "secondary"
                    ? "border border-ui-border-strong text-ui-fg-base hover:bg-ui-bg-subtle"
                    : "bg-ui-fg-base text-ui-bg-base hover:bg-ui-fg-subtle"
                }`}
                {...(isVisualEditor ? { "data-field": `buttons.${i}.label` } : {})}
              >
                {btn.label || "Button"}
              </a>
            ))}
          </div>
        )}
      </div>
    )

    const imageSide = imageUrl ? (
      <div className="flex-1 relative">
        <img
          src={imageUrl}
          alt={content?.image_alt || ""}
          className="w-full h-full object-cover rounded-lg"
          {...(isVisualEditor ? { "data-field": "image_url" } : {})}
        />
      </div>
    ) : (
      <div
        className="flex-1 rounded-lg bg-ui-bg-subtle border border-ui-border-base min-h-[300px] flex items-center justify-center"
        {...(isVisualEditor ? { "data-field": "image_url" } : {})}
      >
        <span className="text-ui-fg-muted text-sm">No image</span>
      </div>
    )

    return (
      <section className="w-full">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch`}>
          {layout === "image-left" ? (
            <>
              {imageSide}
              {textSide}
            </>
          ) : (
            <>
              {textSide}
              {imageSide}
            </>
          )}
        </div>
      </section>
    )
  }

  const renderBentoGrid = (content: any, isVisualEditor: boolean) => {
    const cards: Array<{
      eyebrow?: string
      title?: string
      description?: string
      image_url?: string
      col_span?: string
      row_span?: string
      bg_color?: string
      text_color?: string
    }> = content?.cards || []
    const columns = content?.columns || "3"

    return (
      <section>
        {content?.title && (
          <h2
            className="text-xl md:text-2xl font-semibold mb-4"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p
            className="text-sm text-ui-fg-subtle mb-6"
            {...(isVisualEditor ? { "data-field": "subtitle" } : {})}
          >
            {content.subtitle}
          </p>
        )}
        {cards.length > 0 ? (
          <div
            className={`grid gap-4 ${columns === "4" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : columns === "2" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
            style={{ gridAutoRows: "minmax(160px, auto)" }}
          >
            {cards.map((card, i) => (
              <div
                key={i}
                className={`rounded-xl border border-ui-border-base p-5 flex flex-col gap-2 ${bentoSpanClass(card.col_span, card.row_span)}`}
                style={{
                  ...(card.bg_color ? { backgroundColor: card.bg_color } : {}),
                  ...(card.text_color ? { color: card.text_color } : {}),
                }}
                {...(isVisualEditor ? { "data-field": `cards.${i}.title` } : {})}
              >
                {card.image_url && (
                  <img
                    src={card.image_url}
                    alt={card.title || ""}
                    className="w-full h-32 object-cover rounded-md mb-2"
                  />
                )}
                {card.eyebrow && (
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    {card.eyebrow}
                  </p>
                )}
                {card.title && (
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                )}
                {card.description && (
                  <p className="text-sm opacity-80 flex-1">{card.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 text-ui-fg-muted text-sm border-2 border-dashed border-ui-border-base rounded-lg"
            data-field="cards"
          >
            No cards in bento grid
          </div>
        )}
      </section>
    )
  }

  const renderButtonBlock = (content: any, isVisualEditor: boolean) => {
    const buttons: Array<{
      label?: string
      href?: string
      variant?: string
      size?: string
    }> = content?.buttons || []
    const alignment = content?.align || "left"

    return (
      <section className={`flex flex-wrap gap-3 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : "justify-start"}`}>
        {buttons.length > 0 ? (
          buttons.map((btn, i) => (
            <a
              key={i}
              href={btn.href || "#"}
              className={`inline-flex items-center justify-center rounded-md font-medium transition-colors ${
                btn.size === "large"
                  ? "px-8 py-4 text-base"
                  : btn.size === "small"
                    ? "px-4 py-2 text-xs"
                    : "px-6 py-3 text-sm"
              } ${
                btn.variant === "secondary"
                  ? "border border-ui-border-strong text-ui-fg-base hover:bg-ui-bg-subtle"
                  : btn.variant === "ghost"
                    ? "text-ui-fg-base hover:bg-ui-bg-subtle"
                    : "bg-ui-fg-base text-ui-bg-base hover:bg-ui-fg-subtle"
              }`}
              {...(isVisualEditor ? { "data-field": `buttons.${i}.label` } : {})}
            >
              {btn.label || "Button"}
            </a>
          ))
        ) : (
          <p className="text-ui-fg-muted text-sm">No buttons added</p>
        )}
      </section>
    )
  }

  const renderSection = (content: any) => {
    return (
      <section className="rounded-lg border border-ui-border-base p-6">
        {content?.title && (
          <h2
            className="text-xl font-semibold mb-4"
            {...(isVisualEditor ? { "data-field": "title" } : {})}
          >
            {content.title}
          </h2>
        )}
        {content?.body && typeof content.body === "object" ? (
          <div {...(isVisualEditor ? { "data-field": "body" } : {})}>
            <TipTapViewer doc={content.body} className="tiptap-content" />
          </div>
        ) : content?.body && typeof content.body === "string" ? (
          <p
            className="text-sm text-ui-fg-subtle"
            {...(isVisualEditor ? { "data-field": "body" } : {})}
          >
            {content.body}
          </p>
        ) : null}
      </section>
    )
  }

  const blocks = Array.isArray(page.blocks)
    ? page.blocks
        .slice()
        .sort((a: any, b: any) => {
          const ao = Number(a?.order ?? 0)
          const bo = Number(b?.order ?? 0)
          if (ao !== bo) return ao - bo
          const an = String(a?.name || "")
          const bn = String(b?.name || "")
          return an.localeCompare(bn)
        })
        .map((b: any, idx: number) => ({
          ...b,
          order: Number(b?.order ?? idx),
        }))
    : []

  return (
    <article className="content-container py-6 md:py-10">
      {blocks.some((b) => b.type === "Hero") ? null : (
        <h1 className="mb-6 text-2xl md:text-3xl font-semibold">
          {page.title}
        </h1>
      )}

      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-ui-fg-subtle text-sm">
          <li>
            <LocalizedClientLink href="/" className="hover:text-ui-fg-base">
              Home
            </LocalizedClientLink>
          </li>
          <li aria-hidden className="text-ui-fg-muted">
            /
          </li>
          <li>
            <span className="text-ui-fg-muted">Pages</span>
          </li>
          <li aria-hidden className="text-ui-fg-muted">
            /
          </li>
          <li>
            <span className="text-ui-fg-base">{page.title}</span>
          </li>
        </ol>
      </nav>

      <div className="space-y-8">
        {blocks.length > 0 ? (
          blocks.map((block, idx) => {
            const type = (block.type as string) || ""
            const rawContent = (block as any).content ?? {}
            const rawSettings = (block as any).settings

            const blockStyle = buildBlockStyle(rawSettings)

            const blockAttrs =
              isVisualEditor && block.id
                ? {
                    "data-block-id": block.id as string,
                    "data-block-type": type,
                    "data-block-name": (block.name as string) || type,
                  }
                : {}

            const key = `${type}-${idx}`

            switch (type) {
              case "Hero": {
                const content = rawContent as {
                  title?: string
                  subtitle?: string
                  align?: "left" | "center"
                }
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderHero(
                      block.id,
                      content?.title ?? page.title,
                      content?.subtitle,
                      content?.align || "center"
                    )}
                  </div>
                )
              }
              case "HeroWithImage": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderHeroWithImage(rawContent, isVisualEditor)}
                  </div>
                )
              }
              case "BentoGrid": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderBentoGrid(rawContent, isVisualEditor)}
                  </div>
                )
              }
              case "Button": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderButtonBlock(rawContent, isVisualEditor)}
                  </div>
                )
              }
              case "MainContent": {
                const content = rawContent as {
                  body?: unknown
                  title?: string
                }
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderMain(content?.body, content?.title, block.id)}
                  </div>
                )
              }
              case "Header": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderHeader(rawContent)}
                  </div>
                )
              }
              case "Footer": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderFooter(rawContent)}
                  </div>
                )
              }
              case "Gallery": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderGallery(rawContent)}
                  </div>
                )
              }
              case "Feature": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderFeature(rawContent)}
                  </div>
                )
              }
              case "Testimonial": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderTestimonial(rawContent)}
                  </div>
                )
              }
              case "Product": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderProduct(rawContent)}
                  </div>
                )
              }
              case "ContactForm": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderContactForm(rawContent)}
                  </div>
                )
              }
              case "Section": {
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderSection(rawContent)}
                  </div>
                )
              }
              case "Custom": {
                const content = rawContent as {
                  title?: string
                  body?: unknown
                }
                return (
                  <div key={key} {...blockAttrs} style={blockStyle}>
                    {renderMain(content?.body, content?.title, block.id)}
                  </div>
                )
              }
              default: {
                const c = rawContent as { title?: string; body?: unknown }
                if (
                  typeof c?.title === "string" ||
                  typeof c?.body !== "undefined"
                ) {
                  return (
                    <div key={key} {...blockAttrs} style={blockStyle}>
                      {renderMain(c.body, c.title, block.id)}
                    </div>
                  )
                }
                return (
                  <section
                    key={key}
                    className="p-4"
                    {...blockAttrs}
                    style={blockStyle}
                  >
                    <h2 className="m-0">{block.name || block.type}</h2>
                    <pre className="text-sm text-ui-fg-subtle overflow-auto bg-ui-bg-subtle p-3 rounded mt-2">
                      {JSON.stringify(block, null, 2)}
                    </pre>
                  </section>
                )
              }
            }
          })
        ) : (
          <p className="text-ui-fg-subtle">
            No content available for this page.
          </p>
        )}
      </div>

      {isVisualEditor && <VisualEditorBridge blocks={blocks} />}
    </article>
  )
}

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { STORE_NAME } from "@lib/constants"
import { WebsiteTheme } from "@lib/data/website"
import { Text, clx } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Pages seeded by seedDefaultPagesWorkflow on the backend. Rendering them
// here keeps a working "Legal" column out of the box even if the partner
// never edits the footer.
const DEFAULT_LEGAL_LINKS: Array<{ label: string; slug: string }> = [
  { label: "Terms & Conditions", slug: "terms-and-conditions" },
  { label: "Privacy Policy", slug: "privacy-policy" },
  { label: "Contact", slug: "contact-us" },
]

export default async function Footer({ theme }: { theme?: WebsiteTheme | null }) {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  const storeName = theme?.branding?.store_name || STORE_NAME
  const footerText = theme?.footer?.text
  const socialLinks = theme?.footer?.social_links

  return (
    <footer className="border-t border-ui-border-base w-full" data-theme-section="footer">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
            >
              {storeName}
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-4">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Categories
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {productCategories?.slice(0, 6).map((c) => {
                    if (c.parent_category) {
                      return
                    }

                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null

                    return (
                      <li
                        className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                        key={c.id}
                      >
                        <LocalizedClientLink
                          className={clx(
                            "hover:text-ui-fg-base",
                            children && "txt-small-plus"
                          )}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && (
                          <ul className="grid grid-cols-1 ml-3 gap-2">
                            {children &&
                              children.map((child) => (
                                <li key={child.id}>
                                  <LocalizedClientLink
                                    className="hover:text-ui-fg-base"
                                    href={`/categories/${child.handle}`}
                                    data-testid="category-link"
                                  >
                                    {child.name}
                                  </LocalizedClientLink>
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Collections
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    }
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {socialLinks && socialLinks.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">Social</span>
                <ul className="grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small">
                  {socialLinks.map((sl) => (
                    <li key={sl.platform}>
                      <a
                        href={sl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-ui-fg-base"
                      >
                        {sl.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">Legal</span>
              <ul className="grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small">
                {DEFAULT_LEGAL_LINKS.map((link) => (
                  <li key={link.slug}>
                    <LocalizedClientLink
                      className="hover:text-ui-fg-base"
                      href={`/pages/${link.slug}`}
                    >
                      {link.label}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
          <Text className="txt-compact-small" data-theme-section="footer-text">
            &copy; {new Date().getFullYear()} {storeName}.{" "}
            {footerText || "All rights reserved."}
          </Text>
        </div>
      </div>
    </footer>
  )
}

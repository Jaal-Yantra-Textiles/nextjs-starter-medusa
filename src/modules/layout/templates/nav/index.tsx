import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreRegion } from "@medusajs/types"
import { STORE_NAME } from "@lib/constants"
import { WebsiteTheme } from "@lib/data/website"
import { MagnifyingGlass } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav({ theme }: { theme?: WebsiteTheme | null }) {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  const storeName = theme?.branding?.store_name || STORE_NAME
  const logoUrl = theme?.branding?.logo_url
  const nav = theme?.navigation
  const sticky = nav?.sticky ?? true
  const navStyle = nav?.style ?? "bordered"
  const showAccountLink = nav?.show_account_link ?? true
  const showCartIcon = nav?.show_cart_icon ?? true
  const showSearch = nav?.show_search ?? false

  // Search and cart wrappers are always rendered so the bridge can toggle
  // them with a simple `hidden` class swap — no client-side reconstruction.

  return (
    <div
      className={clx("group", sticky && "sticky top-0 inset-x-0 z-50")}
      data-theme-section="nav"
      data-nav-sticky={sticky ? "true" : "false"}
      data-nav-style={navStyle}
    >
      <header
        className={clx(
          "relative h-16 mx-auto duration-200",
          navStyle === "transparent" ? "" : "bg-white",
          navStyle === "bordered" && "border-b border-ui-border-base"
        )}
      >
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
                theme={theme}
              />
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase"
              data-testid="nav-store-link"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-8 object-contain"
                />
              ) : (
                storeName
              )}
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              {showAccountLink && (
                <LocalizedClientLink
                  className="hover:text-ui-fg-base"
                  href="/account"
                  data-testid="nav-account-link"
                >
                  Account
                </LocalizedClientLink>
              )}
              <LocalizedClientLink
                href="/store"
                className={clx(
                  "hover:text-ui-fg-base items-center",
                  showSearch ? "flex" : "hidden"
                )}
                data-nav-search=""
                aria-label="Search"
              >
                <MagnifyingGlass />
              </LocalizedClientLink>
            </div>
            <div
              className={clx("flex items-center", !showCartIcon && "hidden")}
              data-nav-cart-wrapper=""
            >
              <Suspense
                fallback={
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base flex gap-2"
                    href="/cart"
                    data-testid="nav-cart-link"
                  >
                    Cart (0)
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}

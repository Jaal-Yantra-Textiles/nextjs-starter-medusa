import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import { WebsiteTheme } from "@lib/data/website"

const EmptyCartMessage = ({ theme }: { theme?: WebsiteTheme | null }) => {
  const cartTheme = theme?.cart
  const heading = cartTheme?.heading || "Cart"
  const message =
    cartTheme?.empty_message ||
    "You don't have anything in your cart. Let's change that, use the link below to start browsing our products."
  const ctaText = cartTheme?.empty_cta_text || "Explore products"
  const ctaLink = cartTheme?.empty_cta_link || "/store"

  return (
    <div
      className="py-48 px-2 flex flex-col justify-center items-start"
      data-testid="empty-cart-message"
    >
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        {heading}
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        {message}
      </Text>
      <div>
        <InteractiveLink href={ctaLink}>{ctaText}</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage

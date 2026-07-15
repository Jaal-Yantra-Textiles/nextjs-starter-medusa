import { Metadata } from "next"
import { getUnsubscribeInfo } from "@lib/data/website"

import UnsubscribeForm from "@modules/website/components/unsubscribe-form"

export const runtime = "edge"

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
}

/**
 * Public unsubscribe landing page. The newsletter/blog email footer links here
 * with `?id=<person|customer|lead id>&email=<email>`. We resolve a masked email
 * for display (non-mutating) and let the recipient confirm the opt-out.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const search = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const id = first(search.id)
  const email = first(search.email)

  let maskedEmail: string | null = null
  if (id || email) {
    try {
      const info = await getUnsubscribeInfo({ id, email })
      maskedEmail = info.found ? info.email : null
    } catch {
      // Fall through — the form can still POST by id/email even if the
      // preview lookup fails.
      maskedEmail = null
    }
  }

  return (
    <div className="content-container flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-xl border border-ui-border-base bg-ui-bg-base p-8 shadow-elevation-card-rest">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ui-fg-base">
            Unsubscribe
          </h1>
        </div>

        {id || email ? (
          <UnsubscribeForm id={id} email={email} maskedEmail={maskedEmail} />
        ) : (
          <p className="text-center text-ui-fg-subtle">
            This unsubscribe link is missing its details. Please use the link from
            the email you received.
          </p>
        )}
      </div>
    </div>
  )
}

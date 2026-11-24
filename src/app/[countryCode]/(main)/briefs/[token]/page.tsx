import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveBrief } from "@lib/data/briefs"
import BriefTemplate from "@modules/briefs/templates"

type Props = {
  // 🔴 A promise on this Next version, as on the quote page.
  params: Promise<{ countryCode: string; token: string }>
}

/** The token is the credential: never indexed. */
export const metadata: Metadata = {
  title: "Your brief",
  description: "Tell us what you'd like made, see who would make it and what it may cost.",
  robots: { index: false, follow: false },
}

/** Per request: answers, picks and updates change, and views are counted. */
export const dynamic = "force-dynamic"

export default async function BriefPage({ params }: Props) {
  const { token, countryCode } = await params
  const brief = await retrieveBrief(token, countryCode)
  if (!brief) notFound()
  return <BriefTemplate brief={brief} token={token} countryCode={countryCode} />
}

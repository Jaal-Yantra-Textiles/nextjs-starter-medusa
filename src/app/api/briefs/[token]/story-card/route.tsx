import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

import { retrieveBrief } from "@lib/data/briefs"

/**
 * A story card the buyer can use with HER customers (#2608): one style's
 * story, the crafts and who makes them, and a few photos of their work.
 * Deliberately no prices — this is for her shelf, not her purchasing.
 * Everything on it comes from the brief view (true statements only).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const optionId = req.nextUrl.searchParams.get("option") ?? ""
  const country = req.nextUrl.searchParams.get("country") ?? ""
  const brief = await retrieveBrief(token, country)
  const option = brief?.options.find((o) => o.id === optionId)
  if (!brief || !option) return new Response("Not found", { status: 404 })

  const makers = Array.from(
    new Set(option.steps.flatMap((s) => {
      const pick = s.choices.find((c) => c.id === s.selected_choice_id)
      return (pick ? [pick] : s.choices).map((c) => c.partner.name)
    }))
  )
  const photos = Array.from(
    new Set(option.steps.flatMap((s) => s.choices.flatMap((c) => [...c.samples.flatMap((x) => x.photos), ...(c.partner.photos ?? [])])))
  ).slice(0, 3)

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f7f3ec", padding: 72, fontFamily: "serif", color: "#2b2621" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#8a7f72" }}>Made by hand</div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>{option.title}</div>
        {option.story.headline ? (
          <div style={{ display: "flex", fontSize: 34, fontStyle: "italic", marginTop: 28, lineHeight: 1.35, color: "#3d362f" }}>
            “{option.story.headline}”
          </div>
        ) : null}
        {photos.length ? (
          <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={p} width={330} height={330} style={{ objectFit: "cover", borderRadius: 12 }} alt="" />
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 44 }}>
          {option.story.points.map((pt) => (
            <div key={pt.label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{pt.label}</div>
              <div style={{ display: "flex", fontSize: 27, lineHeight: 1.35, color: "#3d362f" }}>{pt.text}</div>
              {pt.by?.length ? (
                <div style={{ display: "flex", fontSize: 24, color: "#8a7f72", marginTop: 4 }}>By {pt.by.join(" or ")}</div>
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", paddingTop: 36, borderTop: "2px solid #d9cfc2", fontSize: 24, color: "#8a7f72" }}>
          {makers.length ? `Made with ${makers.join(", ")}` : ""}
          {brief.lead.name ? ` · ${brief.lead.name}` : ""}
        </div>
      </div>
    ),
    { width: 1200, height: 1500 }
  )
}

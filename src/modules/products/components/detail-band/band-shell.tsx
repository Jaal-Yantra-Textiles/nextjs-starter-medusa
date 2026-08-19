"use client"

import { useState } from "react"
import { Heading, Tabs, clx } from "@medusajs/ui"

import Accordion from "@modules/products/components/product-tabs/accordion"
import type { ResolvedDetailBlock } from "./resolve"

/**
 * #1364 — the arrangement half of the detail band.
 *
 * Split from the band itself because the two halves have different natures: the
 * band is a SERVER component (it fetches the spec and the maker, and decides
 * what a product can fill before any markup exists), while tabs and the
 * accordion need state. Rendering the blocks server-side and passing them in as
 * `children` keeps the fetches on the server and gives the client only the
 * interaction — so a `rows` or `grid` band ships no handler at all.
 *
 * `blocks` carries the labels in the same order as `children`; the pair is
 * produced together by the resolver, and a block is never rendered without its
 * heading.
 */

type Props = {
  layout: "grid-2" | "grid-3" | "rows" | "tabs" | "accordion"
  blocks: ResolvedDetailBlock[]
  children: React.ReactNode
}

const BandShell = ({ layout, blocks, children }: Props) => {
  const panels = Array.isArray(children) ? children : [children]
  const [open, setOpen] = useState<string>(blocks[0]?.label ?? "")

  if (layout === "tabs") {
    return (
      <Tabs value={open} onValueChange={setOpen}>
        <Tabs.List>
          {blocks.map((b) => (
            <Tabs.Trigger key={b.label} value={b.label}>
              {b.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {blocks.map((b, i) => (
          <Tabs.Content key={b.label} value={b.label} className="pt-6">
            {panels[i]}
          </Tabs.Content>
        ))}
      </Tabs>
    )
  }

  if (layout === "accordion") {
    return (
      // Multiple, not single: a customer comparing the weave against the care
      // instructions should not have the first close when they open the second.
      <Accordion type="multiple" defaultValue={[blocks[0]?.label ?? ""]}>
        {blocks.map((b, i) => (
          <Accordion.Item
            key={b.label}
            title={b.label}
            headingSize="medium"
            value={b.label}
          >
            {panels[i]}
          </Accordion.Item>
        ))}
      </Accordion>
    )
  }

  return (
    <div
      className={clx(
        "grid gap-x-10 gap-y-10",
        // One column on small screens for every layout. A 3-up grid on a phone
        // is three unreadable columns, and the partner picked "three across"
        // about a desktop they were looking at.
        layout === "grid-2" && "grid-cols-1 small:grid-cols-2",
        layout === "grid-3" && "grid-cols-1 small:grid-cols-3",
        layout === "rows" && "grid-cols-1"
      )}
    >
      {blocks.map((b, i) => (
        <section key={b.label}>
          <Heading level="h3" className="txt-large mb-3">
            {b.label}
          </Heading>
          {panels[i]}
        </section>
      ))}
    </div>
  )
}

export default BandShell

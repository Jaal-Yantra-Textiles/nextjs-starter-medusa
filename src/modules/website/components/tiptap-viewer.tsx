"use client"

import React from "react"

type TipTapViewerProps = {
  doc: any
  className?: string
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function textWithMarks(textNode: any): string {
  const txt = escapeHtml(textNode.text || "")
  const marks = textNode.marks || []
  return marks.reduce((acc: string, m: any) => {
    switch (m.type) {
      case "bold":
        return `<strong>${acc}</strong>`
      case "italic":
        return `<em>${acc}</em>`
      case "strike":
        return `<s>${acc}</s>`
      case "code":
        return `<code>${acc}</code>`
      case "underline":
        return `<u>${acc}</u>`
      case "link": {
        const href = escapeHtml(m.attrs?.href || "")
        const target = m.attrs?.target
          ? ` target="${escapeHtml(m.attrs.target)}"`
          : ""
        const rel = ` rel="noopener noreferrer"`
        return `<a href="${href}"${target}${rel}>${acc}</a>`
      }
      default:
        return acc
    }
  }, txt)
}

function textAlignClass(attrs?: any): string {
  const align = attrs?.textAlign
  if (align === "center") return " text-center"
  if (align === "right") return " text-right"
  if (align === "left") return " text-left"
  return ""
}

/**
 * A provider URL in whatever shape it was written, as an EMBEDDABLE url.
 *
 * The editor's "Insert Video" flow already stores `youtube.com/embed/<id>`, so
 * most documents arrive ready. This exists for the ones that do not: a partner
 * who pastes a watch link into the text gets a link mark on a text node, and a
 * link is all the viewer could ever have made of it.
 *
 * 🔑 `youtube-nocookie.com` rather than `youtube.com`. Same player, but it is
 * the host content blockers and strict-privacy browser modes leave alone — an
 * embed that renders for the author and is a blank 16:9 hole for a third of
 * their visitors is worse than one that fails for everybody, because nobody
 * reports it.
 */
export function toEmbedUrl(raw: string): string | null {
  const trimmed = (raw || "").trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, "")

  if (host === "youtube-nocookie.com" || host === "youtube.com") {
    const id = parsed.pathname.startsWith("/embed/")
      ? parsed.pathname.slice("/embed/".length)
      : parsed.searchParams.get("v")
    if (!id) return null
    return `https://www.youtube-nocookie.com/embed/${id}`
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1)
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }
  if (host === "player.vimeo.com") return trimmed
  if (host === "vimeo.com") {
    const id = parsed.pathname.split("/").filter(Boolean).pop()
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  return null
}

function renderEmbed(rawSrc: string): string {
  const src = toEmbedUrl(rawSrc) ?? rawSrc
  if (!src) return ""
  return `<div class="tiptap-video-wrapper relative my-4" style="padding-bottom: 56.25%; height: 0; overflow: hidden;"><iframe src="${escapeHtml(src)}" title="Embedded video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`
}

/**
 * A paragraph that is NOTHING BUT a video link is a video the author meant to
 * embed. Anything else — a link inside a sentence, two links in a row — stays
 * a link, because promoting those would silently eat prose the author wrote.
 */
function paragraphAsEmbed(node: any): string | null {
  const content = (node.content || []).filter(
    (n: any) => !(n.type === "text" && !String(n.text || "").trim())
  )
  if (content.length !== 1) return null
  const only = content[0]
  if (only.type !== "text") return null
  const href =
    (only.marks || []).find((m: any) => m.type === "link")?.attrs?.href ||
    String(only.text || "").trim()
  const embed = toEmbedUrl(href)
  return embed ? renderEmbed(embed) : null
}

function renderNode(node: any): string {
  if (!node) return ""
  if (node.type === "text") {
    return textWithMarks(node)
  }
  const children = (node.content || []).map(renderNode).join("")
  switch (node.type) {
    case "heading": {
      const level = Math.min(Math.max(node.attrs?.level || 2, 1), 6)
      return `<h${level} class="mb-6 mt-8${textAlignClass(node.attrs)}">${children}</h${level}>`
    }
    case "paragraph":
      return (
        paragraphAsEmbed(node) ??
        (children ? `<p class="mb-4${textAlignClass(node.attrs)}">${children}</p>` : "<p></p>")
      )
    case "bulletList":
      return `<ul class="mb-4 ml-6 list-disc">${children}</ul>`
    case "orderedList":
      return `<ol class="mb-4 ml-6 list-decimal">${children}</ol>`
    case "listItem":
      return `<li class="mb-2">${children}</li>`
    case "blockquote":
      return `<blockquote class="border-l-4 border-ui-border-strong pl-4 italic my-4${textAlignClass(node.attrs)}">${children}</blockquote>`
    case "codeBlock": {
      const text = (node.content || [])
        .filter((n: any) => n.type === "text")
        .map((n: any) => escapeHtml(n.text || ""))
        .join("")
      return `<pre class="bg-ui-bg-subtle rounded-md p-4 overflow-x-auto"><code>${text}</code></pre>`
    }
    case "hardBreak":
      return "<br/>"
    case "image": {
      const src = escapeHtml(node.attrs?.src || "")
      const alt = escapeHtml(node.attrs?.alt || "")
      const cls = "tiptap-image max-w-full h-auto rounded-md"
      return src
        ? `<img src="${src}" alt="${alt}" class="${cls}" />`
        : ""
    }
    case "youtube":
    case "vimeo":
    case "embed":
      return renderEmbed(node.attrs?.src || "")
    case "video": {
      const src = escapeHtml(node.attrs?.src || "")
      if (!src) return ""
      return `<video controls class="w-full rounded-md my-4"><source src="${src}" /></video>`
    }
    default:
      return children
  }
}

export function renderTipTapBody(doc: any): string {
  try {
    return (doc?.content || []).map(renderNode).join("")
  } catch {
    return ""
  }
}

export default function TipTapViewer({ doc, className }: TipTapViewerProps) {
  const html = React.useMemo(() => renderTipTapBody(doc), [doc])
  if (!html) return null
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  )
}

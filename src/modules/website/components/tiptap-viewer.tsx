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
      return children ? `<p class="mb-4${textAlignClass(node.attrs)}">${children}</p>` : "<p></p>"
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
    case "embed": {
      const src = escapeHtml(node.attrs?.src || "")
      if (!src) return ""
      return `<div class="tiptap-video-wrapper relative my-4" style="padding-bottom: 56.25%; height: 0; overflow: hidden;"><iframe src="${src}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`
    }
    case "video": {
      const src = escapeHtml(node.attrs?.src || "")
      if (!src) return ""
      return `<video controls class="w-full rounded-md my-4"><source src="${src}" /></video>`
    }
    default:
      return children
  }
}

function renderTipTapBody(doc: any): string {
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

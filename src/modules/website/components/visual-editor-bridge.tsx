"use client"

import { useEffect, useCallback, useRef } from "react"

type BlockInfo = {
  id: string
  type: string
  name: string
  rect?: { top: number; left: number; width: number; height: number }
}

type AdminToIframeMessage =
  | { type: "VISUAL_EDITOR_INIT"; editMode: true }
  | { type: "SELECT_BLOCK"; blockId: string }
  | { type: "HIGHLIGHT_BLOCK"; blockId: string | null }
  | {
      type: "UPDATE_BLOCK_PREVIEW"
      blockId: string
      content: Record<string, unknown>
      settings?: Record<string, unknown>
    }
  | { type: "SCROLL_TO_BLOCK"; blockId: string }
  | { type: "ENABLE_INLINE_EDITING"; blockId: string }
  | { type: "DISABLE_INLINE_EDITING" }

type IframeToAdminMessage =
  | { type: "VISUAL_EDITOR_READY"; blocks: BlockInfo[] }
  | {
      type: "BLOCK_CLICKED"
      blockId: string
      blockType: string
      blockName: string
    }
  | { type: "BLOCK_HOVERED"; blockId: string | null }
  | { type: "BLOCKS_LOADED"; blocks: BlockInfo[] }
  | { type: "BLOCK_PREVIEW_RELOAD_NEEDED"; blockId: string }
  | {
      type: "BLOCK_FIELD_EDITED"
      blockId: string
      field: string
      value: string
    }

interface VisualEditorBridgeProps {
  blocks: Array<{
    id?: string
    name?: string
    type?: string
    content?: Record<string, unknown>
    order?: number
  }>
}

const STYLE_ID = "ve-styles"

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
      case "bold": return `<strong>${acc}</strong>`
      case "italic": return `<em>${acc}</em>`
      case "strike": return `<s>${acc}</s>`
      case "code": return `<code>${acc}</code>`
      case "underline": return `<u>${acc}</u>`
      case "link": {
        const href = escapeHtml(m.attrs?.href || "")
        const target = m.attrs?.target
          ? ` target="${escapeHtml(m.attrs.target)}"`
          : ""
        const rel = ` rel="noopener noreferrer"`
        return `<a href="${href}"${target}${rel}>${acc}</a>`
      }
      default: return acc
    }
  }, txt)
}

function renderTipTapNode(node: any): string {
  if (!node) return ""
  if (node.type === "text") return textWithMarks(node)
  const children = (node.content || []).map(renderTipTapNode).join("")
  switch (node.type) {
    case "heading": {
      const level = Math.min(Math.max(node.attrs?.level || 2, 1), 6)
      return `<h${level} class="mb-6 mt-8">${children}</h${level}>`
    }
    case "paragraph": return children ? `<p class="mb-4">${children}</p>` : "<p></p>"
    case "bulletList": return `<ul class="mb-4 ml-6 list-disc">${children}</ul>`
    case "orderedList": return `<ol class="mb-4 ml-6 list-decimal">${children}</ol>`
    case "listItem": return `<li class="mb-2">${children}</li>`
    case "blockquote": return `<blockquote>${children}</blockquote>`
    case "codeBlock": {
      const text = (node.content || [])
        .filter((n: any) => n.type === "text")
        .map((n: any) => escapeHtml(n.text || ""))
        .join("")
      return `<pre><code>${text}</code></pre>`
    }
    case "hardBreak": return "<br/>"
    case "image": {
      const src = escapeHtml(node.attrs?.src || "")
      const alt = escapeHtml(node.attrs?.alt || "")
      const cls = "tiptap-image max-w-full h-auto rounded-md"
      return src ? `<img src="${src}" alt="${alt}" class="${cls}" />` : ""
    }
    default: return children
  }
}

function renderTipTapToHtml(doc: any): string {
  try {
    return (doc?.content || []).map(renderTipTapNode).join("")
  } catch {
    return ""
  }
}

function getBlockById(blockId: string): HTMLElement | null {
  return document.querySelector(`[data-block-id="${blockId}"]`)
}

function collectBlockInfo(): BlockInfo[] {
  return (
    Array.from(document.querySelectorAll("[data-block-id]")) as HTMLElement[]
  ).map((el) => {
    const rect = el.getBoundingClientRect()
    return {
      id: el.dataset.blockId!,
      type: el.dataset.blockType || "",
      name: el.dataset.blockName || "",
      rect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      },
    }
  })
}

function sendToParent(message: IframeToAdminMessage) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, "*")
  }
}

export default function VisualEditorBridge({ blocks }: VisualEditorBridgeProps) {
  const selectedRef = useRef<string | null>(null)
  const highlightedRef = useRef<string | null>(null)

  // Inject editor styles once
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return

    const style = document.createElement("style")
    style.id = STYLE_ID
    style.textContent = `
      [data-block-id] {
        position: relative;
        transition: outline 0.15s ease, box-shadow 0.15s ease;
        cursor: pointer;
      }
      [data-block-id]:hover {
        outline: 2px dashed rgba(59, 130, 246, 0.4);
        outline-offset: 2px;
      }
      [data-block-id].ve-selected {
        outline: 2px solid rgb(59, 130, 246) !important;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      }
      [data-block-id].ve-highlighted {
        outline: 2px dashed rgb(59, 130, 246) !important;
        outline-offset: 2px;
      }
      .ve-block-label {
        position: absolute;
        top: -22px;
        left: 0;
        background: rgb(59, 130, 246);
        color: white;
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 4px 4px 0 0;
        z-index: 9999;
        pointer-events: none;
        white-space: nowrap;
        font-family: system-ui, -apple-system, sans-serif;
      }
      [data-field][contenteditable="true"] {
        outline: 2px solid rgba(59, 130, 246, 0.6) !important;
        outline-offset: 2px;
        cursor: text !important;
        border-radius: 2px;
        min-height: 1em;
      }
      [data-field][contenteditable="true"]:focus {
        outline: 2px solid rgb(59, 130, 246) !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        background: rgba(59, 130, 246, 0.03);
      }
      [data-field][contenteditable="true"]:empty::before {
        content: "Click to edit...";
        color: rgba(0, 0, 0, 0.3);
        font-style: italic;
      }
    `
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  const clearSelection = useCallback(() => {
    const prev = selectedRef.current
      ? getBlockById(selectedRef.current)
      : null
    if (prev) {
      prev.classList.remove("ve-selected")
      prev.querySelector(".ve-block-label")?.remove()
    }
    selectedRef.current = null
  }, [])

  const clearHighlight = useCallback(() => {
    const prev = highlightedRef.current
      ? getBlockById(highlightedRef.current)
      : null
    if (prev) {
      prev.classList.remove("ve-highlighted")
    }
    highlightedRef.current = null
  }, [])

  const selectBlock = useCallback(
    (blockId: string) => {
      clearSelection()
      const el = getBlockById(blockId)
      if (!el) return

      el.classList.add("ve-selected")
      selectedRef.current = blockId

      if (!el.querySelector(".ve-block-label")) {
        const label = document.createElement("div")
        label.className = "ve-block-label"
        label.textContent = `${el.dataset.blockType || "Block"}: ${el.dataset.blockName || blockId}`
        el.style.position = "relative"
        el.appendChild(label)
      }
    },
    [clearSelection]
  )

  const highlightBlock = useCallback(
    (blockId: string | null) => {
      clearHighlight()
      if (!blockId) return
      if (blockId === selectedRef.current) return

      const el = getBlockById(blockId)
      if (!el) return

      el.classList.add("ve-highlighted")
      highlightedRef.current = blockId
    },
    [clearHighlight]
  )

  const scrollToBlock = useCallback((blockId: string) => {
    const el = getBlockById(blockId)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  // --- Inline editing ---
  const editingBlockRef = useRef<string | null>(null)

  const disableInlineEditing = useCallback(() => {
    const prevId = editingBlockRef.current
    if (prevId) {
      const prev = getBlockById(prevId)
      if (prev) {
        prev.querySelectorAll('[data-field][contenteditable="true"]').forEach((el) => {
          ;(el as HTMLElement).contentEditable = "false"
        })
      }
    }
    editingBlockRef.current = null
  }, [])

  const enableInlineEditing = useCallback(
    (blockId: string) => {
      // Disable editing on the previous block first
      if (editingBlockRef.current && editingBlockRef.current !== blockId) {
        disableInlineEditing()
      }

      const el = getBlockById(blockId)
      if (!el) return

      el.querySelectorAll("[data-field]").forEach((fieldEl) => {
        const fe = fieldEl as HTMLElement
        // Skip array fields (links.N.label, features.N.title) — those need UI controls
        const fieldName = fe.dataset.field || ""
        if (fieldName.includes(".")) return

        fe.contentEditable = "true"

        const handleBlur = () => {
          const value = fe.innerText
          sendToParent({
            type: "BLOCK_FIELD_EDITED",
            blockId,
            field: fieldName,
            value,
          })
        }

        // Remove previous listener if any (avoid duplicates)
        fe.removeEventListener("blur", (fe as any)._veBlurHandler)
        ;(fe as any)._veBlurHandler = handleBlur
        fe.addEventListener("blur", handleBlur)
      })

      editingBlockRef.current = blockId
    },
    [disableInlineEditing]
  )

  const updateBlockPreview = useCallback(
    (
      blockId: string,
      content: Record<string, unknown>,
      settings?: Record<string, unknown>
    ) => {
      const el = getBlockById(blockId)
      if (!el) return

      // Generic: iterate content keys and update matching [data-field] elements
      for (const [key, value] of Object.entries(content)) {
        const fieldEl = el.querySelector(`[data-field="${key}"]`) as HTMLElement | null
        if (!fieldEl) continue

        if (typeof value === "string") {
          fieldEl.textContent = value
        } else if (
          value &&
          typeof value === "object" &&
          (value as any).type === "doc"
        ) {
          // TipTap JSON document — render to HTML
          fieldEl.innerHTML = renderTipTapToHtml(value as any)
        } else if (Array.isArray(value)) {
          // Arrays (links, images, features, etc.) — too complex for inline DOM patching;
          // signal the parent to do a full iframe reload
          sendToParent({ type: "BLOCK_PREVIEW_RELOAD_NEEDED", blockId })
          return
        }
      }

      // Apply settings to the block wrapper
      if (settings) {
        if (settings.backgroundColor) {
          el.style.backgroundColor = settings.backgroundColor as string
        }
        if (settings.textColor) {
          el.style.color = settings.textColor as string
        }
        if (settings.padding) {
          el.style.padding = settings.padding as string
        }
        if (settings.maxWidth) {
          el.style.maxWidth = settings.maxWidth as string
        }
      }
    },
    []
  )

  // Handle messages from admin panel
  useEffect(() => {
    const handleMessage = (event: MessageEvent<AdminToIframeMessage>) => {
      const data = event.data
      if (!data || typeof data !== "object" || !("type" in data)) return

      switch (data.type) {
        case "VISUAL_EDITOR_INIT":
          sendToParent({
            type: "VISUAL_EDITOR_READY",
            blocks: collectBlockInfo(),
          })
          break
        case "SELECT_BLOCK":
          selectBlock(data.blockId)
          scrollToBlock(data.blockId)
          enableInlineEditing(data.blockId)
          break
        case "HIGHLIGHT_BLOCK":
          highlightBlock(data.blockId)
          break
        case "SCROLL_TO_BLOCK":
          scrollToBlock(data.blockId)
          break
        case "UPDATE_BLOCK_PREVIEW":
          updateBlockPreview(data.blockId, data.content, data.settings)
          break
        case "ENABLE_INLINE_EDITING":
          enableInlineEditing(data.blockId)
          break
        case "DISABLE_INLINE_EDITING":
          disableInlineEditing()
          break
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [selectBlock, highlightBlock, scrollToBlock, updateBlockPreview, enableInlineEditing, disableInlineEditing])

  // Setup click and hover handlers on block elements
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const blockEl = (e.target as HTMLElement).closest(
        "[data-block-id]"
      ) as HTMLElement | null
      if (!blockEl) return

      // If clicking inside a contentEditable field, let it behave normally
      const target = e.target as HTMLElement
      if (
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const blockId = blockEl.dataset.blockId!
      const blockType = blockEl.dataset.blockType || ""
      const blockName = blockEl.dataset.blockName || ""

      selectBlock(blockId)
      sendToParent({ type: "BLOCK_CLICKED", blockId, blockType, blockName })
    }

    const handleMouseOver = (e: MouseEvent) => {
      const blockEl = (e.target as HTMLElement).closest(
        "[data-block-id]"
      ) as HTMLElement | null
      const blockId = blockEl?.dataset.blockId || null

      if (blockId !== highlightedRef.current) {
        highlightBlock(blockId)
        sendToParent({ type: "BLOCK_HOVERED", blockId })
      }
    }

    const handleMouseLeave = () => {
      clearHighlight()
      sendToParent({ type: "BLOCK_HOVERED", blockId: null })
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("mouseover", handleMouseOver)
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("mouseover", handleMouseOver)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [selectBlock, highlightBlock, clearHighlight])

  // Send ready signal on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      sendToParent({
        type: "VISUAL_EDITOR_READY",
        blocks: collectBlockInfo(),
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Disable navigation in editor mode
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a")
      if (link && !link.closest("[data-block-id]")) {
        const href = link.getAttribute("href")
        if (href && href !== "#" && !href.startsWith("javascript:")) {
          e.preventDefault()
        }
      }
    }

    document.addEventListener("click", handleLinkClick, true)
    return () => document.removeEventListener("click", handleLinkClick, true)
  }, [])

  return null
}

"use client"

import { useEffect, useCallback, useRef } from "react"

import { renderTipTapBody } from "./tiptap-viewer"

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
  | { type: "INSERT_IMAGE_AT_CURSOR"; imageUrl: string }

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
      isHtml?: boolean
    }
  | { type: "BLOCK_REORDERED"; orderedIds: string[] }
  | { type: "REQUEST_ADD_BLOCK_AT"; afterBlockId: string | null }
  | { type: "REQUEST_IMAGE_UPLOAD"; blockId: string }
  | { type: "TOOLBAR_COMMAND"; command: string }
  | { type: "OPEN_BODY_EDITOR"; blockId: string; field: string }

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

/**
 * 🔑 The TipTap renderer is IMPORTED, not repeated.
 *
 * This file used to carry a second, byte-identical copy of the JSON -> HTML
 * walk. Two copies of a switch over node types is two places a node type has
 * to be added to, and the forgotten one is the one the author is staring at
 * while they edit — so a fix lands where nobody is watching. The live page and
 * the visual editor now render from the same function by construction.
 */

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
      [data-block-id].ve-selected {
        cursor: default;
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
      [data-field]:not([contenteditable="true"]) {
        cursor: pointer;
      }
      [data-field][contenteditable="true"] {
        outline: 2px solid rgba(59, 130, 246, 0.6) !important;
        outline-offset: 2px;
        cursor: text !important;
        user-select: text !important;
        -webkit-user-select: text !important;
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
      .ve-drag-handle {
        position: absolute;
        top: -10px;
        right: 0;
        width: 28px;
        height: 28px;
        background: rgb(59, 130, 246);
        color: white;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.15s ease;
        user-select: none;
      }
      .ve-selected .ve-drag-handle {
        opacity: 1;
      }
      .ve-drag-handle:hover {
        background: rgb(37, 99, 235);
        cursor: grabbing;
      }
      [data-block-id].ve-dragging {
        opacity: 0.4;
        outline: 2px dashed rgb(59, 130, 246) !important;
      }
      [data-block-id].ve-drop-target {
        outline: 2px solid rgb(34, 197, 94) !important;
        outline-offset: 4px;
      }
      .ve-drop-indicator {
        height: 4px;
        background: rgb(34, 197, 94);
        margin: 4px 0;
        border-radius: 2px;
        opacity: 0;
        transition: opacity 0.1s ease;
      }
      .ve-drop-indicator.ve-drop-show {
        opacity: 1;
      }
      .ve-insert-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 24px;
        margin: 4px 0;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .ve-insert-handle:hover {
        opacity: 1;
      }
      .ve-insert-handle button {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid rgb(59, 130, 246);
        background: white;
        color: rgb(59, 130, 246);
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .ve-insert-handle button:hover {
        background: rgb(59, 130, 246);
        color: white;
      }
      .ve-floating-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10001;
        display: flex;
        flex-wrap: wrap;
        gap: 1px;
        padding: 4px;
        background: rgb(30, 41, 59);
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        pointer-events: none;
        max-width: 480px;
      }
      .ve-floating-toolbar.ve-toolbar-visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .ve-toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        padding: 0 6px;
        border-radius: 4px;
        background: transparent;
        color: rgb(203, 213, 225);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        white-space: nowrap;
        transition: background 0.1s ease, color 0.1s ease;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .ve-toolbar-btn:hover {
        background: rgb(51, 65, 85);
        color: white;
      }
      .ve-toolbar-btn.ve-active {
        background: rgb(59, 130, 246);
        color: white;
      }
      .ve-toolbar-divider {
        width: 1px;
        height: 20px;
        background: rgb(51, 65, 85);
        margin: 4px 2px;
      }
    `
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  // --- Floating formatting toolbar ---
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  const hideFloatingToolbar = useCallback(() => {
    if (toolbarRef.current) {
      toolbarRef.current.classList.remove("ve-toolbar-visible")
    }
  }, [])

  const showFloatingToolbar = useCallback((blockEl: HTMLElement) => {
    const hasRichText = blockEl.querySelector(
      '[data-field="body"], [data-field="body"] p, [data-field="body"] h1, [data-field="body"] h2, [data-field="body"] h3'
    ) || blockEl.querySelector('[data-field="body"]')

    if (!hasRichText) {
      hideFloatingToolbar()
      return
    }

    let toolbar = toolbarRef.current
    if (!toolbar) {
      toolbar = document.createElement("div")
      toolbar.className = "ve-floating-toolbar"
      toolbar.style.position = "fixed"

      const buttons: Array<{ label: string; command?: string; action?: () => void }> = [
        { label: "H1", command: "toggleHeading1" },
        { label: "H2", command: "toggleHeading2" },
        { label: "H3", command: "toggleHeading3" },
        { label: "B", command: "toggleBold" },
        { label: "I", command: "toggleItalic" },
        { label: "U", command: "toggleUnderline" },
        { label: "UL", command: "toggleBulletList" },
        { label: "OL", command: "toggleOrderedList" },
        { label: "Quote", command: "toggleBlockquote" },
        { label: "Code", command: "toggleCodeBlock" },
        { label: "Link", command: "setLink" },
        { label: "Image", command: "addImage" },
        { label: "Upload", command: "triggerUpload" },
        { label: "Video", command: "addVideo" },
        { label: "Left", command: "alignLeft" },
        { label: "Center", command: "alignCenter" },
        { label: "Right", command: "alignRight" },
      ]

      buttons.forEach((btn) => {
        const el = document.createElement("button")
        el.className = "ve-toolbar-btn"
        el.textContent = btn.label
        el.addEventListener("mousedown", (e) => {
          e.preventDefault()
          if (btn.command) {
            sendToParent({ type: "TOOLBAR_COMMAND", command: btn.command } as any)
          }
        })
        toolbar!.appendChild(el)
      })

      document.body.appendChild(toolbar)
      toolbarRef.current = toolbar
    }

    const rect = blockEl.getBoundingClientRect()
    toolbar.style.top = `${Math.max(8, rect.top - 56)}px`
    const toolbarWidth = toolbar.offsetWidth || 420
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - toolbarWidth - 8))
    toolbar.style.left = `${left}px`

    requestAnimationFrame(() => {
      toolbar!.classList.add("ve-toolbar-visible")
    })
  }, [hideFloatingToolbar])

  const clearSelection = useCallback(() => {
    const prev = selectedRef.current
      ? getBlockById(selectedRef.current)
      : null
    if (prev) {
      prev.classList.remove("ve-selected")
      prev.querySelector(".ve-block-label")?.remove()
    }
    selectedRef.current = null
    hideFloatingToolbar()
  }, [hideFloatingToolbar])

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

      showFloatingToolbar(el)
    },
    [clearSelection, showFloatingToolbar]
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
          ;(el as HTMLElement).style.outline = ""
          ;(el as HTMLElement).style.outlineOffset = ""
        })
        prev.querySelectorAll('[data-field]').forEach((el) => {
          const fe = el as HTMLElement
          if (fe.dataset.field === "body") {
            fe.style.outline = ""
            fe.style.cursor = ""
          }
        })
      }
    }
    editingBlockRef.current = null
    hideFloatingToolbar()
  }, [hideFloatingToolbar])

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
        const fieldName = fe.dataset.field || ""

        // Rich text fields open a drawer editor; everything else is inline contentEditable
        const isRichText = fieldName === "body"

        if (isRichText) {
          fe.style.cursor = "pointer"
          fe.style.outline = "2px dashed rgba(59, 130, 246, 0.5)"
          fe.style.outlineOffset = "2px"
          fe.title = "Click to open rich text editor"

          const handleClick = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            sendToParent({
              type: "OPEN_BODY_EDITOR",
              blockId,
              field: fieldName,
            } as any)
          }

          fe.removeEventListener("click", (fe as any)._veRichClickHandler)
          ;(fe as any)._veRichClickHandler = handleClick
          fe.addEventListener("click", handleClick)
        } else {
          fe.style.cursor = "text"
          fe.contentEditable = "true"
          fe.style.outline = "1px solid rgba(59, 130, 246, 0.3)"
          fe.style.outlineOffset = "1px"

          const handleBlur = () => {
            const value = fe.innerText
            sendToParent({
              type: "BLOCK_FIELD_EDITED",
              blockId,
              field: fieldName,
              value,
            })
          }

          fe.removeEventListener("blur", (fe as any)._veBlurHandler)
          ;(fe as any)._veBlurHandler = handleBlur
          fe.addEventListener("blur", handleBlur)
        }
      })

      editingBlockRef.current = blockId
      showFloatingToolbar(el)
    },
    [disableInlineEditing, showFloatingToolbar]
  )

  // --- Drag and drop reordering ---
  const dragSourceRef = useRef<string | null>(null)

  const addDragHandles = useCallback(() => {
    const blockEls = document.querySelectorAll("[data-block-id]") as NodeListOf<HTMLElement>
    blockEls.forEach((el) => {
      if (el.querySelector(".ve-drag-handle")) return
      const handle = document.createElement("div")
      handle.className = "ve-drag-handle"
      handle.textContent = "\u2630"
      handle.title = "Drag to reorder"
      handle.draggable = true

      handle.addEventListener("dragstart", (e) => {
        const blockEl = handle.closest("[data-block-id]") as HTMLElement
        const blockId = blockEl.dataset.blockId || ""
        dragSourceRef.current = blockId
        blockEl.classList.add("ve-dragging")
        e.dataTransfer?.setData("text/plain", blockId)
        e.dataTransfer!.effectAllowed = "move"
      })

      handle.addEventListener("dragend", () => {
        const blockEl = handle.closest("[data-block-id]") as HTMLElement
        blockEl?.classList.remove("ve-dragging")
        document.querySelectorAll(".ve-drop-target").forEach((el) =>
          el.classList.remove("ve-drop-target")
        )
        document.querySelectorAll(".ve-drop-show").forEach((el) =>
          el.classList.remove("ve-drop-show")
        )
        dragSourceRef.current = null
      })

      el.style.position = "relative"
      el.appendChild(handle)
    })
  }, [])

  const setupDragDrop = useCallback(() => {
    const container = document.querySelector(".space-y-8")
    if (!container) return

    const handleDragOver = (e: DragEvent) => {
      if (!dragSourceRef.current) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = "move"

      const blockEl = (e.target as HTMLElement).closest(
        "[data-block-id]"
      ) as HTMLElement | null
      if (blockEl && blockEl.dataset.blockId !== dragSourceRef.current) {
        document.querySelectorAll(".ve-drop-target").forEach((el) =>
          el.classList.remove("ve-drop-target")
        )
        blockEl.classList.add("ve-drop-target")
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      if (!dragSourceRef.current) return

      const targetBlock = (e.target as HTMLElement).closest(
        "[data-block-id]"
      ) as HTMLElement | null
      if (!targetBlock || targetBlock.dataset.blockId === dragSourceRef.current) {
        document.querySelectorAll(".ve-drop-target").forEach((el) =>
          el.classList.remove("ve-drop-target")
        )
        return
      }

      // Visually reorder: insert dragged block before/after the target
      const sourceEl = getBlockById(dragSourceRef.current)
      if (!sourceEl) return

      const rect = targetBlock.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      if (e.clientY < midpoint) {
        targetBlock.parentNode?.insertBefore(sourceEl, targetBlock)
      } else {
        targetBlock.parentNode?.insertBefore(sourceEl, targetBlock.nextSibling)
      }

      // Collect new order and post to parent
      const orderedIds = Array.from(
        document.querySelectorAll("[data-block-id]")
      ).map((el) => (el as HTMLElement).dataset.blockId || "")

      sendToParent({ type: "BLOCK_REORDERED", orderedIds })

      targetBlock.classList.remove("ve-drop-target")
    }

    document.addEventListener("dragover", handleDragOver)
    document.addEventListener("drop", handleDrop)

    return () => {
      document.removeEventListener("dragover", handleDragOver)
      document.removeEventListener("drop", handleDrop)
    }
  }, [])

  // --- Insert handles between blocks ---
  const addInsertHandles = useCallback(() => {
    const container = document.querySelector(".space-y-8")
    if (!container) return

    // Remove existing handles
    container.querySelectorAll(".ve-insert-handle").forEach((el) => el.remove())

    const blockEls = Array.from(
      container.querySelectorAll("[data-block-id]")
    ) as HTMLElement[]

    blockEls.forEach((blockEl, idx) => {
      // Insert handle before this block
      const handle = document.createElement("div")
      handle.className = "ve-insert-handle"
      const btn = document.createElement("button")
      btn.textContent = "+"
      btn.title = "Add block here"
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        const prevBlockId = idx > 0 ? blockEls[idx - 1].dataset.blockId || null : null
        sendToParent({
          type: "REQUEST_ADD_BLOCK_AT",
          afterBlockId: prevBlockId,
        })
      })
      handle.appendChild(btn)
      container.insertBefore(handle, blockEl)
    })

    // Insert handle after the last block
    if (blockEls.length > 0) {
      const handle = document.createElement("div")
      handle.className = "ve-insert-handle"
      const btn = document.createElement("button")
      btn.textContent = "+"
      btn.title = "Add block here"
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        sendToParent({
          type: "REQUEST_ADD_BLOCK_AT",
          afterBlockId: blockEls[blockEls.length - 1].dataset.blockId || null,
        })
      })
      handle.appendChild(btn)
      container.appendChild(handle)
    }
  }, [])

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
          if (key === "body" || (typeof value === "string" && value.trim().startsWith("<"))) {
            fieldEl.innerHTML = value
          } else {
            fieldEl.textContent = value
          }
        } else if (
          value &&
          typeof value === "object" &&
          (value as any).type === "doc"
        ) {
          // TipTap JSON document — render to HTML
          fieldEl.innerHTML = renderTipTapBody(value as any)
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
          el.style.padding = /^\d+$/.test(String(settings.padding).trim())
            ? `${settings.padding}px`
            : settings.padding as string
        }
        if (settings.paddingTop) el.style.paddingTop = `${settings.paddingTop}px`
        if (settings.paddingRight) el.style.paddingRight = `${settings.paddingRight}px`
        if (settings.paddingBottom) el.style.paddingBottom = `${settings.paddingBottom}px`
        if (settings.paddingLeft) el.style.paddingLeft = `${settings.paddingLeft}px`
        if (settings.margin) {
          el.style.margin = /^\d+$/.test(String(settings.margin).trim())
            ? `${settings.margin}px`
            : settings.margin as string
        }
        if (settings.marginTop) el.style.marginTop = `${settings.marginTop}px`
        if (settings.marginRight) el.style.marginRight = `${settings.marginRight}px`
        if (settings.marginBottom) el.style.marginBottom = `${settings.marginBottom}px`
        if (settings.marginLeft) el.style.marginLeft = `${settings.marginLeft}px`
        const maxW = (settings.max_width || settings.maxWidth) as string | undefined
        if (maxW && maxW !== "default") {
          const map: Record<string, string> = { narrow: "680px", medium: "960px", wide: "1200px", full: "100%" }
          el.style.maxWidth = map[maxW] || maxW
        }
        if (settings.width) {
          el.style.width = /^\d+$/.test(String(settings.width).trim())
            ? `${settings.width}px`
            : settings.width as string
        }
        if (settings.height) {
          el.style.height = /^\d+$/.test(String(settings.height).trim())
            ? `${settings.height}px`
            : settings.height as string
        }
        if (settings.borderRadius) {
          el.style.borderRadius = /^\d+$/.test(String(settings.borderRadius).trim())
            ? `${settings.borderRadius}px`
            : settings.borderRadius as string
        }
        if (settings.borderWidth || settings.borderColor) {
          el.style.border = `${settings.borderWidth || "1"}px solid ${settings.borderColor || "currentColor"}`
        }
        if (settings.boxShadow) {
          el.style.boxShadow = settings.boxShadow as string
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
          if (selectedRef.current !== data.blockId) {
            selectBlock(data.blockId)
            scrollToBlock(data.blockId)
          }
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
        case "INSERT_IMAGE_AT_CURSOR":
          document.execCommand("insertImage", false, data.imageUrl)
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

      const target = e.target as HTMLElement

      // If clicking inside a contentEditable field, let it behave normally
      if (
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      // If clicking on a rich-text field (dashed outline, not contentEditable),
      // let the field's own click handler fire (opens body editor drawer)
      const fieldEl = target.closest("[data-field]") as HTMLElement | null
      if (fieldEl && !fieldEl.isContentEditable) {
        const fieldName = fieldEl.dataset.field || ""
        if (fieldName === "body") {
          return
        }
      }

      e.preventDefault()
      e.stopPropagation()

      const blockId = blockEl.dataset.blockId!
      const blockType = blockEl.dataset.blockType || ""
      const blockName = blockEl.dataset.blockName || ""

      selectBlock(blockId)
      enableInlineEditing(blockId)

      // If the click was on a simple text field, focus it and place the cursor
      const clickedField = target.closest("[data-field]") as HTMLElement | null
      if (clickedField && clickedField.isContentEditable) {
        clickedField.focus()
        const range = document.createRange()
        range.selectNodeContents(clickedField)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }

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
  }, [selectBlock, enableInlineEditing, highlightBlock, clearHighlight])

  // Send ready signal on mount + setup drag/drop and insert handles
  useEffect(() => {
    const timer = setTimeout(() => {
      sendToParent({
        type: "VISUAL_EDITOR_READY",
        blocks: collectBlockInfo(),
      })
      addDragHandles()
      addInsertHandles()
      setupDragDrop()
    }, 300)
    return () => clearTimeout(timer)
  }, [addDragHandles, addInsertHandles, setupDragDrop])

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

  // Reposition floating toolbar on scroll/resize
  useEffect(() => {
    const reposition = () => {
      const toolbar = toolbarRef.current
      if (!toolbar || !toolbar.classList.contains("ve-toolbar-visible")) return
      if (!selectedRef.current) return
      const el = getBlockById(selectedRef.current)
      if (!el) return
      const rect = el.getBoundingClientRect()
      toolbar.style.top = `${Math.max(8, rect.top - 56)}px`
      const toolbarWidth = toolbar.offsetWidth || 420
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - toolbarWidth - 8))
      toolbar.style.left = `${left}px`
    }
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [])

  return null
}

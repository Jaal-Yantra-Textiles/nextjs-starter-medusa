import { NextRequest, NextResponse } from "next/server"

import { sdk } from "@lib/config"

/**
 * Artwork upload for a brief (#2608). A route handler, not a server action:
 * server actions cap request bodies at 1 MB. The backend re-checks type, size,
 * count and that the brief is still editable; this only forwards.
 */
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const form = await req.formData()
  const file = form.get("file")
  const questionKey = String(form.get("question_key") ?? "")
  const country = String(form.get("country") ?? "")
  if (!(file instanceof File) || !questionKey) {
    return NextResponse.json({ message: "No file received." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "Files can be up to 10 MB each." }, { status: 400 })
  }
  try {
    const content_base64 = Buffer.from(await file.arrayBuffer()).toString("base64")
    const res = await sdk.client.fetch<{ brief: unknown }>(`/store/b2b/briefs/${encodeURIComponent(token)}/files`, {
      method: "POST",
      query: country ? { country } : undefined,
      body: { question_key: questionKey, name: file.name, type: file.type || "application/octet-stream", content_base64 },
      cache: "no-store",
    })
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Upload failed." }, { status: e?.status || 500 })
  }
}

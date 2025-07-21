// src/utils/parsePostId.ts

export function parsePostId(id: string | undefined): number | null {
  if (!id) return null
  const parsed = Number(id)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
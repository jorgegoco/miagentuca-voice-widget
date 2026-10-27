export type CardFieldType = "text" | "list" | "number" | "badge"

export interface CardField {
  key: string
  label: string
  type: CardFieldType
  /** list only: the agent may highlight one item with highlight_item */
  highlightable?: boolean
  /** list only: keep at most this many items */
  maxItems?: number
  /** number only: shown after the value, e.g. "h/semana" */
  unit?: string
}

export type CardValue = string | number | string[] | null
export type CardValues = Record<string, CardValue>
export type CardStatus = "idle" | "listening" | "proposal" | "done"

export interface CardHighlight {
  key: string
  index: number
}

export interface CardState {
  values: CardValues
  highlighted: CardHighlight | null
  status: CardStatus
}

export const emptyValues = (fields: CardField[]): CardValues =>
  Object.fromEntries(fields.map((f) => [f.key, f.type === "list" ? [] : f.type === "text" ? "" : null]))

export const hasContent = (values: CardValues) =>
  Object.values(values).some((v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== ""))

const toText = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>
    return String(v.title ?? v.text ?? v.name ?? v.description ?? "")
  }
  return value == null ? "" : String(value)
}

// Agent payloads are untrusted input: keep only known fields, coerce types
export const parseValues = (fields: CardField[], payload: Record<string, unknown>): CardValues => {
  const patch: CardValues = {}
  for (const field of fields) {
    if (!(field.key in payload)) continue
    const raw = payload[field.key]
    switch (field.type) {
      case "text":
        patch[field.key] = toText(raw)
        break
      case "list":
        if (Array.isArray(raw)) patch[field.key] = raw.slice(0, field.maxItems).map(toText)
        break
      case "number": {
        const n = Number(raw)
        patch[field.key] = raw !== null && raw !== "" && Number.isFinite(n) ? n : null
        break
      }
      case "badge":
        // The agent may send 0-1, 0-100 or a word ("alta"); the badge handles all three
        patch[field.key] = typeof raw === "number" || typeof raw === "string" ? raw : null
        break
    }
  }
  return patch
}

export const isValidHighlight = (fields: CardField[], key: unknown, index: unknown): index is number => {
  const field = fields.find((f) => f.key === key)
  return (
    !!field &&
    field.type === "list" &&
    !!field.highlightable &&
    Number.isInteger(index) &&
    (index as number) >= 0 &&
    (index as number) < (field.maxItems ?? Infinity)
  )
}

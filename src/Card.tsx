import type { CardField, CardState, CardValue } from "./card-model"
import { hasContent } from "./card-model"
import { SparkleIcon } from "./icons"

export interface CardProps {
  fields: CardField[]
  card: CardState
  emptyText?: string
}

type BadgeLevel = "high" | "medium" | "low"

const badge = (label: string, value: CardValue): { text: string; level: BadgeLevel } | null => {
  if (value === null || value === "" || Array.isArray(value)) return null
  if (typeof value === "string") {
    const v = value.toLowerCase()
    const level = v.startsWith("alt") || v === "high" ? "high" : v.startsWith("med") ? "medium" : "low"
    return { text: `${label} ${value}`, level }
  }
  const pct = Math.round(value > 1 ? value : value * 100)
  return { text: `${label} ${pct}%`, level: pct >= 75 ? "high" : pct >= 50 ? "medium" : "low" }
}

export const Card = ({ fields, card, emptyText }: CardProps) => {
  const { values, highlighted } = card

  if (!hasContent(values)) {
    return (
      <div className="vw-card vw-card-empty">
        <SparkleIcon className="vw-icon vw-card-empty-icon" />
        {emptyText && <p>{emptyText}</p>}
      </div>
    )
  }

  return (
    <div className="vw-card" data-status={card.status}>
      {fields.map((field) => {
        const value = values[field.key]
        const cls = `vw-field vw-field-${field.type}`
        switch (field.type) {
          case "badge": {
            const b = badge(field.label, value)
            return b ? (
              <span key={field.key} className={`${cls} vw-badge`} data-key={field.key} data-level={b.level}>
                {b.text}
              </span>
            ) : null
          }
          case "number":
            return typeof value === "number" ? (
              <p key={field.key} className={cls} data-key={field.key}>
                <span className="vw-label">{field.label}:</span>{" "}
                <strong className="vw-number">
                  {value}
                  {field.unit ? ` ${field.unit}` : ""}
                </strong>
              </p>
            ) : null
          case "list":
            return Array.isArray(value) && value.length > 0 ? (
              <div key={field.key} className={cls} data-key={field.key}>
                <p className="vw-label">{field.label}</p>
                <ol className="vw-list">
                  {value.map((item, i) => (
                    <li
                      key={i}
                      className={
                        highlighted?.key === field.key && highlighted.index === i ? "vw-item vw-highlight" : "vw-item"
                      }
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <span className="vw-item-index">{i + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null
          default:
            return typeof value === "string" && value ? (
              <p key={field.key} className={cls} data-key={field.key}>
                <span className="vw-label">{field.label}:</span> {value}
              </p>
            ) : null
        }
      })}
    </div>
  )
}

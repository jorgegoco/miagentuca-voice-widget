import type { ReactNode } from "react"
import { VoiceProvider, type VoiceProviderProps } from "./VoiceProvider"
import { useVoiceSession } from "./session"
import { MicButton } from "./MicButton"
import { Card } from "./Card"
import { RetryIcon } from "./icons"

export interface VoiceWidgetProps extends Omit<VoiceProviderProps, "children"> {
  className?: string
  /** Extra host controls rendered between the mic and the card, inside the session */
  children?: ReactNode
  /** How many recent transcript lines to show (0 hides it) */
  transcriptLines?: number
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

const WidgetBody = ({ className, children, transcriptLines = 4 }: Pick<VoiceWidgetProps, "className" | "children" | "transcriptLines">) => {
  const { isActive, secondsLeft, timedOut, connect, transcript, fields, card, labels } = useVoiceSession()
  const recent = transcriptLines > 0 ? transcript.slice(-transcriptLines) : []

  return (
    <div className={className ? `vw-root ${className}` : "vw-root"}>
      <MicButton />

      {isActive && (
        <p className="vw-countdown">
          {labels.timeLeft}: {formatTime(secondsLeft)}
        </p>
      )}

      {timedOut && !isActive && (
        <button type="button" className="vw-retry" onClick={() => connect().catch(() => {})}>
          <RetryIcon className="vw-icon-sm" />
          {labels.timedOut}
        </button>
      )}

      {children}

      <Card fields={fields} card={card} emptyText={labels.emptyCard} />

      {recent.length > 0 && (
        <div className="vw-transcript">
          {recent.map((entry) => (
            <p key={`${entry.timestamp}-${entry.role}`} className={`vw-line vw-line-${entry.role}`}>
              <strong>{entry.role === "agent" ? labels.agent : labels.you}:</strong> {entry.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export const VoiceWidget = ({ className, children, transcriptLines, ...provider }: VoiceWidgetProps) => (
  <VoiceProvider {...provider}>
    <WidgetBody className={className} transcriptLines={transcriptLines}>
      {children}
    </WidgetBody>
  </VoiceProvider>
)

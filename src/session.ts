import { createContext, useContext } from "react"
import type { ConnectionState, TranscriptEntry, VocalBridgeError } from "@vocalbridgeai/sdk"
import type { VoiceLabels } from "./labels"
import type { CardField, CardState, CardValues } from "./card"

export interface VoiceSession {
  state: ConnectionState
  isActive: boolean
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  secondsLeft: number
  timedOut: boolean
  transcript: ReadonlyArray<TranscriptEntry>
  error: VocalBridgeError | null
  /** Send a page action to the agent (no-op while not connected) */
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<void>
  fields: CardField[]
  card: CardState
  /** Change card values from the page; the agent gets a ui_sync like for its own actions */
  updateCard: (patch: CardValues) => void
  labels: VoiceLabels
}

export const VoiceSessionContext = createContext<VoiceSession | null>(null)

export const useVoiceSession = (): VoiceSession => {
  const session = useContext(VoiceSessionContext)
  if (!session) throw new Error("useVoiceSession must be used inside <VoiceProvider>")
  return session
}

import { createContext, useContext } from "react"
import type { ConnectionState, TranscriptEntry, VocalBridgeError } from "@vocalbridgeai/sdk"
import type { VoiceLabels } from "./labels"

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
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<void>
  labels: VoiceLabels
}

export const VoiceSessionContext = createContext<VoiceSession | null>(null)

export const useVoiceSession = (): VoiceSession => {
  const session = useContext(VoiceSessionContext)
  if (!session) throw new Error("useVoiceSession must be used inside <VoiceProvider>")
  return session
}

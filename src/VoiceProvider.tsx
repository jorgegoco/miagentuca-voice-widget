import { useEffect, useMemo, useState, type ReactNode } from "react"
import { VocalBridgeProvider, useAgentActions, useTranscript, useVocalBridge } from "@vocalbridgeai/react"
import { ConnectionState, type TokenResponse, type VocalBridgeOptions } from "@vocalbridgeai/sdk"
import { resolveLabels, type VoiceLabels } from "./labels"
import { VoiceSessionContext, type VoiceSession } from "./session"

export interface VoiceProviderProps {
  /** Base URL of the token service, e.g. https://voice.miagentuca.es */
  tokenUrl: string
  /** Agent name; the token is requested from POST {tokenUrl}/token/{agent} */
  agent: string
  lang?: string
  labels?: Partial<VoiceLabels>
  /** Hard cap per session, so a forgotten tab does not keep a paid session open */
  maxSeconds?: number
  participantName?: string
  children: ReactNode
}

// The API key lives on the token server; the browser only gets a short-lived token
const createTokenProvider = (tokenUrl: string, agent: string) => async (): Promise<TokenResponse> => {
  const base = tokenUrl.replace(/\/+$/, "")
  const response = await fetch(`${base}/token/${encodeURIComponent(agent)}`, { method: "POST" })
  if (!response.ok) {
    throw new Error(`Error al obtener el token de voz (${response.status})`)
  }
  const t = await response.json()
  return {
    url: t.connection_url,
    token: t.token,
    room_name: t.session_name,
    participant_identity: "visitante",
    expires_in: 3600,
    agent_mode: t.agent_mode,
  }
}

type SessionProps = Omit<VoiceProviderProps, "tokenUrl" | "agent" | "participantName">

const SessionProvider = ({ lang, labels, maxSeconds = 180, children }: SessionProps) => {
  const { state, connect, disconnect, error } = useVocalBridge()
  const { transcript, clear: clearTranscript } = useTranscript()
  const { sendAction } = useAgentActions()

  const [secondsLeft, setSecondsLeft] = useState(maxSeconds)
  const [timedOut, setTimedOut] = useState(false)

  const isActive = state !== ConnectionState.Disconnected
  const isConnected = state === ConnectionState.Connected

  useEffect(() => {
    if (!isActive) return
    setTimedOut(false)
    clearTranscript()
  }, [isActive, clearTranscript])

  // Hard cap so a forgotten tab does not keep a paid voice session open
  useEffect(() => {
    if (!isActive) return
    const startedAt = Date.now()
    setSecondsLeft(maxSeconds)
    const timer = setInterval(() => {
      const left = maxSeconds - Math.floor((Date.now() - startedAt) / 1000)
      setSecondsLeft(Math.max(left, 0))
      if (left <= 0) {
        clearInterval(timer)
        setTimedOut(true)
        disconnect()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isActive, disconnect, maxSeconds])

  const resolvedLabels = useMemo(() => resolveLabels(lang, labels), [lang, labels])

  const session: VoiceSession = {
    state,
    isActive,
    isConnected,
    connect,
    disconnect,
    secondsLeft,
    timedOut,
    transcript,
    error,
    sendAction,
    labels: resolvedLabels,
  }

  return <VoiceSessionContext.Provider value={session}>{children}</VoiceSessionContext.Provider>
}

export const VoiceProvider = ({ tokenUrl, agent, participantName = "Visitante", ...rest }: VoiceProviderProps) => {
  // The SDK provider must always receive the same options object for the same agent
  const options = useMemo<VocalBridgeOptions>(
    () => ({ auth: { tokenProvider: createTokenProvider(tokenUrl, agent) }, participantName }),
    [tokenUrl, agent, participantName],
  )
  // The SDK reads options only once, so a new agent needs a new provider instance
  return (
    <VocalBridgeProvider key={`${tokenUrl}|${agent}`} options={options}>
      <SessionProvider {...rest} />
    </VocalBridgeProvider>
  )
}

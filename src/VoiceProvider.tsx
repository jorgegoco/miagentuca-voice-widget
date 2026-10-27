import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { VocalBridgeProvider, useTranscript, useVocalBridge } from "@vocalbridgeai/react"
import { ConnectionState, type AgentAction, type TokenResponse, type VocalBridgeOptions } from "@vocalbridgeai/sdk"
import { resolveLabels, type VoiceLabels } from "./labels"
import { VoiceSessionContext, type VoiceSession } from "./session"
import {
  emptyValues,
  hasContent,
  isValidHighlight,
  parseValues,
  type CardField,
  type CardState,
  type CardValues,
} from "./card"

export interface VoiceProviderProps {
  /** Base URL of the token service, e.g. https://voice.miagentuca.es */
  tokenUrl: string
  /** Agent name; the token is requested from POST {tokenUrl}/token/{agent} */
  agent: string
  /** Card fields the agent fills with show_card / update_card */
  fields: CardField[]
  lang?: string
  labels?: Partial<VoiceLabels>
  /** Hard cap per session, so a forgotten tab does not keep a paid session open */
  maxSeconds?: number
  /** Card keys kept when a new session starts (e.g. a sector picked before connecting) */
  keepOnConnect?: string[]
  /** Called for every action the agent sends, after the widget handled it */
  onAction?: (action: string, payload: Record<string, unknown>) => void
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

// Old action names from the first landing page agent
const ALIASES: Record<string, string> = {
  show_proposal: "show_card",
  update_proposal: "update_card",
  highlight_step: "highlight_item",
}

type SessionProps = Omit<VoiceProviderProps, "tokenUrl" | "agent" | "participantName">

const SessionProvider = ({ fields, lang, labels, maxSeconds = 180, keepOnConnect, onAction, children }: SessionProps) => {
  const { state, connect, disconnect, error, client } = useVocalBridge()
  const { transcript, clear: clearTranscript } = useTranscript()

  const [card, setCard] = useState<CardState>(() => ({ values: emptyValues(fields), highlighted: null, status: "idle" }))
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds)
  const [timedOut, setTimedOut] = useState(false)

  const isActive = state !== ConnectionState.Disconnected
  const isConnected = state === ConnectionState.Connected

  // Action handlers are registered once, so they read the latest values from refs
  const cardRef = useRef(card)
  const connectedRef = useRef(isConnected)
  const fieldsRef = useRef(fields)
  const keepRef = useRef(keepOnConnect)
  const onActionRef = useRef(onAction)
  connectedRef.current = isConnected
  fieldsRef.current = fields
  keepRef.current = keepOnConnect
  onActionRef.current = onAction

  const sendAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      if (connectedRef.current) await client.sendAction(action, payload)
    },
    [client],
  )

  // Single place where the card changes: update the page, then tell the agent what is on screen
  const applyCard = useCallback(
    (patch: Partial<CardState>) => {
      const next = { ...cardRef.current, ...patch }
      cardRef.current = next
      setCard(next)
      const { highlighted } = next
      sendAction("ui_sync", {
        ...next.values,
        highlighted,
        highlightedStep: highlighted?.key === "steps" ? highlighted.index : null,
        status: next.status,
      }).catch(() => {})
    },
    [sendAction],
  )

  const updateCard = useCallback(
    (patch: CardValues) => applyCard({ values: { ...cardRef.current.values, ...patch } }),
    [applyCard],
  )

  // Agent -> page
  useEffect(() => {
    const handle = ({ action, payload = {} }: AgentAction) => {
      const fields = fieldsRef.current
      switch (ALIASES[action] ?? action) {
        case "show_card":
          applyCard({
            values: { ...emptyValues(fields), ...parseValues(fields, payload) },
            highlighted: null,
            status: "proposal",
          })
          break
        case "update_card":
          applyCard({ values: { ...cardRef.current.values, ...parseValues(fields, payload) }, status: "proposal" })
          break
        case "highlight_item": {
          const key = action === "highlight_step" ? "steps" : payload.key
          const index = Number(payload.index)
          if (isValidHighlight(fields, key, index)) applyCard({ highlighted: { key: key as string, index } })
          break
        }
        case "clear_ui":
          applyCard({
            values: emptyValues(fields),
            highlighted: null,
            status: connectedRef.current ? "listening" : "idle",
          })
          break
      }
      onActionRef.current?.(action, payload)
    }
    client.on("agentAction", handle)
    return () => {
      client.off("agentAction", handle)
    }
  }, [client, applyCard])

  // Session lifecycle: fresh card when a session starts, "done" when it ends
  useEffect(() => {
    if (isActive) {
      setTimedOut(false)
      clearTranscript()
      const kept = Object.fromEntries((keepRef.current ?? []).map((k) => [k, cardRef.current.values[k]]))
      applyCard({ values: { ...emptyValues(fieldsRef.current), ...kept }, highlighted: null, status: "idle" })
    } else if (cardRef.current.status !== "idle") {
      applyCard({ highlighted: null, status: hasContent(cardRef.current.values) ? "done" : "idle" })
    }
  }, [isActive, applyCard, clearTranscript])

  useEffect(() => {
    if (isConnected && cardRef.current.status === "idle") {
      applyCard({ status: "listening" })
    }
  }, [isConnected, applyCard])

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
    fields,
    card,
    updateCard,
    labels: resolvedLabels,
  }

  return <VoiceSessionContext.Provider value={session}>{children}</VoiceSessionContext.Provider>
}

export const VoiceProvider = ({ tokenUrl, agent, participantName = "Visitante", ...rest }: VoiceProviderProps) => {
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

export interface VoiceLabels {
  idle: string
  connecting: string
  listening: string
  speaking: string
  start: string
  stop: string
  timeLeft: string
  timedOut: string
  micDenied: string
  connectError: string
  emptyCard: string
  you: string
  agent: string
}

const es: VoiceLabels = {
  idle: "Pulsa para hablar",
  connecting: "Conectando...",
  listening: "Escuchando...",
  speaking: "El agente está hablando",
  start: "Empezar a hablar",
  stop: "Terminar conversación",
  timeLeft: "Tiempo restante",
  timedOut: "Demo terminada — ¿la repetimos?",
  micDenied:
    "Necesitamos permiso para usar el micrófono. Actívalo en la barra de direcciones del navegador y vuelve a intentarlo.",
  connectError: "No se puede conectar con el agente de voz. El demo puede no estar disponible.",
  emptyCard: "Tu propuesta de automatización aparecerá aquí",
  you: "Tú",
  agent: "Agente",
}

const en: VoiceLabels = {
  idle: "Tap to talk",
  connecting: "Connecting...",
  listening: "Listening...",
  speaking: "The agent is speaking",
  start: "Start talking",
  stop: "End conversation",
  timeLeft: "Time left",
  timedOut: "Demo finished — try again?",
  micDenied:
    "We need permission to use the microphone. Enable it in the browser address bar and try again.",
  connectError: "Cannot reach the voice agent. The demo may be unavailable.",
  emptyCard: "Your card will appear here",
  you: "You",
  agent: "Agent",
}

export const labelSets: Record<string, VoiceLabels> = { es, en }

export const resolveLabels = (lang = "es", overrides?: Partial<VoiceLabels>): VoiceLabels => ({
  ...(labelSets[lang] ?? es),
  ...overrides,
})

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { VoiceWidget, type CardField } from "../src"

const TOKEN_URL = import.meta.env.VITE_VOICE_API_URL || "https://voice.miagentuca.es"

const fields: CardField[] = [
  { key: "sector", label: "Sector", type: "text" },
  { key: "confidence", label: "Confianza", type: "badge" },
  { key: "problem", label: "Problema", type: "text" },
  { key: "title", label: "Propuesta", type: "text" },
  { key: "steps", label: "Pasos", type: "list", highlightable: true, maxItems: 3 },
  { key: "hoursSavedPerWeek", label: "Ahorro estimado", type: "number", unit: "h/semana" },
]

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main>
      <h1>Habla con tu agente</h1>
      <VoiceWidget
        tokenUrl={TOKEN_URL}
        agent="voice-demo"
        lang="es"
        maxSeconds={180}
        fields={fields}
        onAction={(action, payload) => console.info("[agent]", action, payload)}
      />
    </main>
  </StrictMode>,
)

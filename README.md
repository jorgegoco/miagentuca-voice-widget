# @miagentuca/voice-widget

A React "talk to the agent" widget for [Vocal Bridge](https://vocalbridge.ai) voice agents.
It renders a mic button, status, a countdown, a card that the agent fills through actions,
and a short transcript. No Tailwind needed: the styles ship in one small CSS file.

## Install

```bash
npm install github:jorgegoco/miagentuca-voice-widget#v0.1.0
```

`react` and `react-dom` (18 or 19) are peer dependencies.

## Usage

```tsx
import { VoiceWidget, type CardField } from "@miagentuca/voice-widget"
import "@miagentuca/voice-widget/style.css"

const fields: CardField[] = [
  { key: "title", label: "Propuesta", type: "text" },
  { key: "steps", label: "Pasos", type: "list", highlightable: true },
  { key: "hoursSavedPerWeek", label: "Horas ahorradas / semana", type: "number" },
  { key: "confidence", label: "Confianza", type: "badge" },
]

<VoiceWidget tokenUrl="https://voice.miagentuca.es" agent="voice-demo" fields={fields} />
```

Props: `tokenUrl`, `agent`, `fields`, `lang` (default `"es"`), `maxSeconds` (default 180),
`labels` (override any UI string), `onAction(name, payload)` (every agent action),
`participantName`, `className`.

The token is fetched with `POST {tokenUrl}/token/{agent}`; the server answers
`{connection_url, token, session_name, agent_mode}`.

## Agent actions

| Action (agent → page) | Payload | Effect |
| --- | --- | --- |
| `show_card` | `{field: value, …}` | Replaces the card |
| `update_card` | `{field: value, …}` | Merges into the card |
| `highlight_item` | `{key, index}` | Highlights one item of a `list` field |
| `clear_ui` | `{}` | Empties the card |

Aliases kept for older agents: `show_proposal` → `show_card`, `update_proposal` →
`update_card`, `highlight_step` → `highlight_item {key: "steps"}`.

After every change the widget sends `ui_sync` with the full card values,
`highlighted: {key, index} | null`, `highlightedStep` (for older agents) and
`status` (`idle | listening | proposal | done`).

## Custom UIs

```tsx
import { VoiceProvider, useVoiceSession } from "@miagentuca/voice-widget"

function MyUI() {
  const { state, connect, disconnect, secondsLeft, transcript, card, sendAction } = useVoiceSession()
  // …
}

<VoiceProvider tokenUrl="…" agent="voice-demo" fields={fields}><MyUI /></VoiceProvider>
```

`<VoiceWidget>` also accepts `children`, rendered inside the provider, so host-specific
controls (e.g. sector chips calling `sendAction("sector_selected", {sector})`) can live
next to the widget.

## Theming

```css
.vw-root {
  --vw-bg: #0a192f;     /* navy */
  --vw-accent: #0ea5e9; /* electric blue */
  --vw-text: #e2e8f0;
}
```

## Development

```bash
npm install
npm run build   # dist/index.js, dist/index.d.ts, dist/style.css
npm run demo    # http://localhost:5173
```

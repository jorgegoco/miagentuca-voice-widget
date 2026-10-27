import { useEffect, useState } from "react"
import { useVocalBridge } from "@vocalbridgeai/react"
import { VocalBridgeError, VocalBridgeErrorCode } from "@vocalbridgeai/sdk"
import { useVoiceSession } from "./session"
import { AlertIcon, LoaderIcon, MicIcon, MicOffIcon, SpeakerIcon } from "./icons"

export type MicStatus = "idle" | "connecting" | "listening" | "speaking"

// The SDK wraps getUserMedia failures, so look at the original cause too
export const isMicDenied = (err: unknown) => {
  if (!(err instanceof VocalBridgeError)) return false
  if (err.code === VocalBridgeErrorCode.MicrophoneError) return true
  const cause = err.cause as { name?: string } | undefined
  return cause?.name === "NotAllowedError" || cause?.name === "NotFoundError"
}

export const MicButton = () => {
  const { client } = useVocalBridge()
  const { isActive, isConnected, connect, disconnect, error, labels } = useVoiceSession()
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Active speakers come from the underlying room; anyone but us is the agent
  useEffect(() => {
    const room = client.room
    if (!room || !isConnected) {
      setAgentSpeaking(false)
      return
    }
    const onSpeakers = (speakers: Array<{ identity: string }>) => {
      setAgentSpeaking(speakers.some((p) => p.identity !== room.localParticipant.identity))
    }
    room.on("activeSpeakersChanged", onSpeakers)
    return () => {
      room.off("activeSpeakersChanged", onSpeakers)
    }
  }, [client, isConnected])

  useEffect(() => {
    if (!error) return
    setMessage(isMicDenied(error) ? labels.micDenied : labels.connectError)
  }, [error, labels])

  const status: MicStatus = !isActive
    ? "idle"
    : !isConnected
      ? "connecting"
      : agentSpeaking
        ? "speaking"
        : "listening"

  const handleClick = async () => {
    setMessage(null)
    if (isActive) {
      await disconnect()
      return
    }
    try {
      // Must run inside the click handler: browsers only grant the mic after a user gesture
      await connect()
    } catch {
      // error is surfaced through the session's error
    }
  }

  const statusText = {
    idle: labels.idle,
    connecting: labels.connecting,
    listening: labels.listening,
    speaking: labels.speaking,
  }[status]

  return (
    <div className="vw-mic" data-status={status}>
      <div className="vw-mic-ring">
        <button
          type="button"
          onClick={handleClick}
          aria-label={isActive ? labels.stop : labels.start}
          className={`vw-mic-button${isActive ? " vw-active" : ""}`}
        >
          {status === "connecting" ? (
            <LoaderIcon className="vw-icon vw-spin" />
          ) : status === "speaking" ? (
            <SpeakerIcon className="vw-icon" />
          ) : isActive ? (
            <MicOffIcon className="vw-icon" />
          ) : (
            <MicIcon className="vw-icon" />
          )}
        </button>
      </div>

      <p className="vw-status" aria-live="polite">{statusText}</p>

      {message && (
        <div className="vw-error" role="alert">
          <AlertIcon className="vw-icon-sm" />
          <p>{message}</p>
        </div>
      )}
    </div>
  )
}

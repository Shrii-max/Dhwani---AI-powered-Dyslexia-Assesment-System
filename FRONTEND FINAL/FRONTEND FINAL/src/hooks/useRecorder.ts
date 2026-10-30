import { useEffect, useRef, useState } from "react"
import { convertBlobToWav } from "../utils/audioUtils"

export type RecorderErrorKind =
  | "permissions-policy"
  | "permission-denied"
  | "insecure-context"
  | "unsupported"
  | "device-not-found"
  | "device-busy"
  | "unknown"

export type RecorderError = {
  kind: RecorderErrorKind
  message: string
}

type PolicyDocument = Document & {
  featurePolicy?: {
    allowsFeature: (feature: string) => boolean
  }
}

function microphoneBlockedByPolicy(): boolean {
  const policy =
    (document as any).permissionsPolicy ??
    (document as PolicyDocument).featurePolicy

  return policy ? !policy.allowsFeature("microphone") : false
}

function describeRecorderError(error: unknown): RecorderError {
  if (microphoneBlockedByPolicy()) {
    return {
      kind: "permissions-policy",
      message:
        "Microphone access is restricted by browser policy. Please allow microphone permissions in site settings.",
    }
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      kind: "insecure-context",
      message:
        "Microphone recording requires HTTPS or localhost address.",
    }
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return {
        kind: "permission-denied",
        message:
          "Microphone permission was denied. Please allow microphone access in your browser address bar and try again.",
      }
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return {
        kind: "device-not-found",
        message:
          "No microphone was found. Connect an input device and try again.",
      }
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return {
        kind: "device-busy",
        message:
          "Microphone is currently in use by another application.",
      }
    }
  }

  return {
    kind: "unknown",
    message: "Recording could not start. Please check microphone settings and try again.",
  }
}

export function useRecorder() {
  const [state, setState] = useState<"idle" | "recording" | "ready" | "error">(
    "idle",
  )
  const [error, setError] = useState<RecorderError | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [url, setUrl] = useState("")
  const [blob, setBlob] = useState<Blob | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  useEffect(() => {
    if (state !== "recording") return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  const start = async () => {
    setError(null)
    setBlob(null)

    if (microphoneBlockedByPolicy()) {
      setError(describeRecorderError(null))
      setState("error")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError({
        kind: "unsupported",
        message: "This browser does not support audio recording.",
      })
      setState("error")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      chunks.current = []

      // Prefer standard audio/webm or audio/ogg
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : ""

      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      recorder.current = mr
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }

      mr.onstop = async () => {
        try {
          const rawBlob = new Blob(chunks.current, {
            type: mimeType || "audio/webm",
          })
          // Encode to standard 16kHz mono PCM WAV for maximum speech recognition accuracy
          const wavBlob = await convertBlobToWav(rawBlob)
          const blobUrl = URL.createObjectURL(wavBlob)
          setUrl(blobUrl)
          setBlob(wavBlob)
          setState("ready")
        } catch (stopErr) {
          console.error("Audio processing notice:", stopErr)
          const fallbackBlob = new Blob(chunks.current, { type: "audio/webm" })
          setUrl(URL.createObjectURL(fallbackBlob))
          setBlob(fallbackBlob)
          setState("ready")
        } finally {
          stream.getTracks().forEach((t) => t.stop())
        }
      }

      setSeconds(0)
      mr.start(100)
      setState("recording")
    } catch (caughtError) {
      setError(describeRecorderError(caughtError))
      setState("error")
    }
  }

  const stop = () => {
    if (recorder.current && recorder.current.state === "recording") {
      recorder.current.stop()
    }
  }

  const reset = () => {
    if (url) {
      URL.revokeObjectURL(url)
    }
    setUrl("")
    setBlob(null)
    setSeconds(0)
    setError(null)
    setState("idle")
  }

  return { state, seconds, url, blob, error, start, stop, reset }
}

import { useEffect, useRef, useState } from "react"

export type RecorderErrorKind = "permissions-policy" | "permission-denied" | "insecure-context" | "unsupported" | "device-not-found" | "device-busy" | "unknown"

export type RecorderError = {
  kind: RecorderErrorKind
  message: string
}

type PolicyDocument = Document & {
  featurePolicy?: {
    allowsFeature: (feature: string) => boolean
  }
}

function microphoneBlockedByPolicy() {
  const policy =
    (document as any).permissionsPolicy ?? (document as PolicyDocument).featurePolicy

  return policy ? !policy.allowsFeature("microphone") : false
}

function describeRecorderError(error: unknown): RecorderError {
  if (microphoneBlockedByPolicy()) {
    return {
      kind: "permissions-policy",
      message:
        "This embedded preview does not allow microphone access. Browser or Windows permission changes cannot override the preview iframe policy.",
    }
  }

  if (!window.isSecureContext) {
    return {
      kind: "insecure-context",
      message:
        "Microphone recording requires HTTPS or a localhost address in a top-level browser tab.",
    }
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return {
        kind: "permission-denied",
        message:
          "Microphone permission was denied for this site. Review this site's browser permission and try again.",
      }
    }
    if (error.name === "NotFoundError") {
      return {
        kind: "device-not-found",
        message:
          "No microphone was found. Connect or enable an input device and try again.",
      }
    }
    if (error.name === "NotReadableError") {
      return {
        kind: "device-busy",
        message:
          "The microphone is unavailable or being used by another application.",
      }
    }
  }

  return {
    kind: "unknown",
    message: "Recording could not start. No audio was captured.",
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
        message:
          "This browser or environment does not support audio recording.",
      })
      setState("error")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const mr = new MediaRecorder(stream)
      recorder.current = mr
      mr.ondataavailable = (e) => chunks.current.push(e.data)
      mr.onstop = () => {
        const audioBlob = new Blob(chunks.current, { type: "audio/webm" })
        setUrl(URL.createObjectURL(audioBlob))
        setBlob(audioBlob)
        stream.getTracks().forEach((t) => t.stop())
        setState("ready")
      }
      setSeconds(0)
      mr.start()
      setState("recording")
    } catch (caughtError) {
      setError(describeRecorderError(caughtError))
      setState("error")
    }
  }
  const stop = () => recorder.current?.stop()
  const reset = () => {
    setUrl("")
    setBlob(null)
    setSeconds(0)
    setError(null)
    setState("idle")
  }
  return { state, seconds, url, blob, error, start, stop, reset }
}

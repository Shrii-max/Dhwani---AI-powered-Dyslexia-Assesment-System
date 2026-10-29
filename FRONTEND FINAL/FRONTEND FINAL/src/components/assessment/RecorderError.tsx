import { ExternalLink, ShieldAlert } from "lucide-react"
import type { RecorderError as RecorderErrorDetails } from "../../hooks/useRecorder"

export function RecorderError({
  error,
}: {
  error: RecorderErrorDetails | null
}) {
  if (!error) return null

  const isPolicyViolation = error.kind === "permissions-policy"

  return (
    <div className="recorder-error" role="alert">
      <ShieldAlert size={20} />
      <div>
        <b>
          {isPolicyViolation
            ? "Microphone blocked by embedded preview"
            : "Microphone unavailable"}
        </b>
        <p>{error.message}</p>
        {isPolicyViolation && (
          <a href={window.location.href} target="_blank" rel="noreferrer">
            Open Dhwani in a top-level tab <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  )
}

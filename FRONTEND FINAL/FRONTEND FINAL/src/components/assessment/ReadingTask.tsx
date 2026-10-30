import { Activity, Check, ShieldCheck } from "lucide-react"
import type { AssessmentTest } from "../../types/assessment"
import { Recorder } from "./Recorder"

export function ReadingTask({
  test,
  onReady,
  isSaved = false,
}: {
  test: AssessmentTest
  onReady: (blob?: Blob | null) => void
  isSaved?: boolean
}) {
  return (
    <div className="reading-layout">
      <section className="stimulus-card reading">
        <div className="stimulus-top">
          <span>
            <i></i> Target stimulus 01
          </span>
          <small>{test.meta}</small>
        </div>
        <span className="read-label">Read this aloud</span>
        <h2>{test.stimulus}</h2>
        <p>Take your time. Press the microphone when you are ready.</p>
      </section>
      <Recorder onReady={onReady} />
      <div className="telemetry">
        <span>
          <Check /> {isSaved ? "Recording saved" : "Audio capture ready"}
          <small>{isSaved ? "Saved to Neon DB" : "Ready to submit"}</small>
        </span>
        <span>
          <Activity /> {isSaved ? "Response evaluated" : "Speech detection active"}
          <small>{isSaved ? "Azure AI analyzed" : "Audio input monitored"}</small>
        </span>
        <span>
          <ShieldCheck /> Database storage
          <small>{isSaved ? "Confirmed in Neon" : "Pending submission"}</small>
        </span>
      </div>
    </div>
  )
}

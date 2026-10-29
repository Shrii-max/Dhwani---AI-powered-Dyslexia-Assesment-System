import { Activity, Check, ShieldCheck } from "lucide-react"
import type { AssessmentTest } from "../../types/assessment"
import { Recorder } from "./Recorder"

export function ReadingTask({
  test,
  onReady,
}: {
  test: AssessmentTest
  onReady: (blob?: Blob | null) => void
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
          <Check /> Recording saved<small>Stored locally</small>
        </span>
        <span>
          <Activity /> Response detected<small>Pending review</small>
        </span>
        <span>
          <ShieldCheck /> Assessor review<small>Not auto-scored</small>
        </span>
      </div>
    </div>
  )
}

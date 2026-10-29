import { ArrowRight, Volume2 } from "lucide-react"
import type { AssessmentTest } from "../../types/assessment"
import { speak } from "../../utils/speech"
import { Button } from "../ui/Button"
import { Recorder } from "./Recorder"

export function RecordingTask({
  test,
  onReady,
}: {
  test: AssessmentTest
  onReady: (blob?: Blob | null) => void
}) {
  const substitution = test.id === 6
  return (
    <div className="recording-layout">
      <section className="stimulus-card">
        <div className="stimulus-top">
          <span>
            <i></i> Source stimulus
          </span>
          <small>{test.meta}</small>
        </div>
        <h2>{test.stimulus}</h2>
        {test.id === 4 && (
          <div className="sound-boxes">
            <i />
            <i />
            <i />
          </div>
        )}
        {substitution && (
          <div className="swap">
            <span>
              <small>Sound to change</small>
              <b>/m/</b>
            </span>
            <ArrowRight />
            <span>
              <small>New sound</small>
              <b>/c/</b>
            </span>
          </div>
        )}
        <Button onClick={() => speak(test.id === 5 ? "smile" : test.stimulus)}>
          <Volume2 size={18} />{" "}
          {test.id === 6 ? "Listen: “MAT”" : "Play word audio"}
        </Button>
      </section>
      <Recorder onReady={onReady} />
    </div>
  )
}

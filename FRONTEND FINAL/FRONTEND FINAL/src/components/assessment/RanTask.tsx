import { useEffect, useState } from "react"
import {
  ArrowRight,
  Check,
  Clock3,
  Grid3X3,
  Mic,
  RotateCcw,
  Square,
} from "lucide-react"
import { useRecorder } from "../../hooks/useRecorder"
import { Button } from "../ui/Button"
import { RecorderError } from "./RecorderError"

const ranSymbols = [
  "●",
  "■",
  "▲",
  "★",
  "◆",
  "▲",
  "●",
  "◆",
  "■",
  "★",
  "■",
  "★",
  "●",
  "◆",
  "▲",
  "◆",
  "▲",
  "★",
  "●",
  "■",
  "★",
  "■",
  "◆",
  "▲",
  "●",
  "▲",
  "●",
  "■",
  "★",
  "◆",
]
export function RanTask({ onReady }: { onReady: (blob?: Blob | null) => void }) {
  const [stage, setStage] =
    useState<"instructions" | "practice" | "assessment" | "review">(
      "instructions",
    )
  const r = useRecorder()
  useEffect(() => {
    if (r.state === "ready") {
      onReady(r.blob)
      setStage("review")
    }
  }, [r.state, r.blob])
  if (stage === "instructions")
    return (
      <section className="ran-intro">
        <span className="ran-graphic">
          <Grid3X3 />
        </span>
        <h2>Rapid naming activity</h2>
        <p>
          Name each shape from left to right, then move to the next row. The
          grid will stay in the same order.
        </p>
        <div className="sequence-demo">
          <span>1</span>
          <ArrowRight />
          <span>2</span>
          <ArrowRight />
          <span>3</span>
        </div>
        <Button onClick={() => setStage("practice")}>
          Try a practice row <ArrowRight />
        </Button>
      </section>
    )
  if (stage === "practice")
    return (
      <section className="ran-intro">
        <span className="kicker">Practice row</span>
        <div className="ran-grid practice">
          {ranSymbols.slice(0, 5).map((x, i) => (
            <i key={i}>{x}</i>
          ))}
        </div>
        <p>Say each shape aloud from left to right.</p>
        <Button onClick={() => setStage("assessment")}>
          I’m ready to begin <ArrowRight />
        </Button>
      </section>
    )
  return (
    <div className="ran-assessment">
      <div className="ran-toolbar">
        <span>
          <Clock3 /> {String(Math.floor(r.seconds / 60)).padStart(2, "0")}:
          {String(r.seconds % 60).padStart(2, "0")}
        </span>
        <b>
          {stage === "review"
            ? "Attempt complete"
            : "Read left → right, top → bottom"}
        </b>
        {r.state === "recording" ? (
          <Button variant="danger" onClick={r.stop}>
            <Square /> Finish
          </Button>
        ) : stage === "review" ? (
          <Button variant="secondary" onClick={() => setStage("practice")}>
            <RotateCcw /> New attempt
          </Button>
        ) : (
          <Button onClick={r.start}>
            <Mic /> Start recording
          </Button>
        )}
      </div>
      <div className="ran-grid">
        {ranSymbols.map((x, i) => (
          <i key={i}>{x}</i>
        ))}
      </div>
      {r.state === "error" && <RecorderError error={r.error} />}
      {stage === "review" && (
        <div className="review-banner">
          <Check /> Recording ready for assessor review. No automatic score has
          been assigned.
        </div>
      )}
    </div>
  )
}

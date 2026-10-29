import { useEffect } from "react"
import { AudioLines, Mic, RotateCcw, ShieldCheck, Square } from "lucide-react"
import { useRecorder } from "../../hooks/useRecorder"
import { Button } from "../ui/Button"
import { RecorderError } from "./RecorderError"
import { Waveform } from "./Waveform"

export function Recorder({ onReady }: { onReady: (blob?: Blob | null) => void }) {
  const r = useRecorder()
  useEffect(() => {
    if (r.state === "ready") onReady(r.blob)
  }, [r.state, r.blob])
  return (
    <section className="recorder-panel">
      <div className="recorder-head">
        <span>
          <AudioLines size={19} /> Voice capture console
        </span>
        <b>
          {String(Math.floor(r.seconds / 60)).padStart(2, "0")}:
          {String(r.seconds % 60).padStart(2, "0")}
        </b>
      </div>
      <Waveform active={r.state === "recording"} />
      {r.state === "error" && <RecorderError error={r.error} />}
      <div className="recorder-actions">
        {(r.state === "idle" || r.state === "error") && (
          <Button onClick={r.start}>
            <Mic size={18} />{" "}
            {r.state === "error" ? "Try recording again" : "Start recording"}
          </Button>
        )}
        {r.state === "recording" && (
          <Button variant="danger" onClick={r.stop}>
            <Square size={17} /> Stop recording
          </Button>
        )}
        {r.state === "ready" && (
          <>
            <audio controls src={r.url} />
            <Button variant="secondary" onClick={r.reset}>
              <RotateCcw size={17} /> Re-record
            </Button>
          </>
        )}
        <span className="safe-note">
          <ShieldCheck size={16} /> Audio remains on this device in this
          prototype.
        </span>
      </div>
    </section>
  )
}

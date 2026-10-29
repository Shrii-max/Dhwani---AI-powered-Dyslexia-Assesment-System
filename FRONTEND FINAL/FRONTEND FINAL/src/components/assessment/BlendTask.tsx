import { useState } from "react"
import { Play, Volume2 } from "lucide-react"
import type { AssessmentTest } from "../../types/assessment"
import { speak } from "../../utils/speech"
import { Button } from "../ui/Button"

export function BlendTask({
  test,
  onReady,
}: {
  test: AssessmentTest
  onReady: (selected?: string) => void
}) {
  const [selected, setSelected] = useState("")
  const sounds = ["c", "a", "t"]
  return (
    <div className="blend-layout">
      <section className="sound-sequence">
        <span className="kicker">Sound sequence</span>
        <div>
          {sounds.map((s, i) => (
            <button key={s} onClick={() => speak(s)}>
              <Play size={15} />
              <b>/{s}/</b>
              <small>Sound {i + 1}</small>
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            sounds.forEach((s, i) => setTimeout(() => speak(s), i * 650))
          }
        >
          <Volume2 size={18} /> Play all sounds
        </Button>
      </section>
      <section className="options-panel">
        <h3>What word do the sounds make?</h3>
        <div className="option-grid">
          {test.options?.map((o) => (
            <button
              key={o}
              className={`option word ${selected === o ? "selected" : ""}`}
              onClick={() => {
                setSelected(o)
                onReady(o)
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

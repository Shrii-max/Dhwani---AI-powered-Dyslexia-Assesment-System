import { useState } from "react"
import { Volume2 } from "lucide-react"
import type { AssessmentTest } from "../../types/assessment"
import { speak } from "../../utils/speech"

export function ChoiceTask({
  test,
  onReady,
}: {
  test: AssessmentTest
  onReady: (selected?: string) => void
}) {
  const [selected, setSelected] = useState("")
  return (
    <div className="choice-layout">
      <section className="stimulus-card compact">
        <span className="stimulus-label">Target word</span>
        <button className="listen-orb" onClick={() => speak(test.stimulus)}>
          <Volume2 />
          <span>Listen</span>
        </button>
        <h2>{test.stimulus}</h2>
        <p>{test.meta}</p>
      </section>
      <section className="options-panel">
        <span className="kicker">Choose one answer</span>
        <h3>
          {test.id === 1
            ? "Which sound begins the word?"
            : "Which answer matches?"}
        </h3>
        <div className="option-grid">
          {test.options?.map((o) => (
            <button
              key={o}
              className={`option ${selected === o ? "selected" : ""}`}
              onClick={() => {
                setSelected(o)
                onReady(o)
              }}
            >
              <span>{o}</span>
              {test.id === 2 && <Volume2 size={17} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

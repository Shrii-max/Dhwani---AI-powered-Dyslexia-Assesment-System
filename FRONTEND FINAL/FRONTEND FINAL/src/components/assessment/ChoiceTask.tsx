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
  const isIdentification =
    test.slug === "phoneme-identification" ||
    test.id === 1 ||
    test.title?.toLowerCase().includes("identification")
  const isMatching =
    test.slug === "phoneme-matching" ||
    test.id === 2 ||
    test.title?.toLowerCase().includes("matching")

  return (
    <div className="choice-layout">
      <section className="stimulus-card compact">
        <span className="stimulus-label">Target word</span>
        <button
          className="listen-orb"
          onClick={() => speak(test.wordAudio || test.stimulus)}
        >
          <Volume2 />
          <span>Listen</span>
        </button>
        <h2>{test.stimulus}</h2>
        <p>{test.meta}</p>
      </section>
      <section className="options-panel">
        <span className="kicker">Choose one answer</span>
        <h3>
          {isIdentification
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
              {isMatching && <Volume2 size={17} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

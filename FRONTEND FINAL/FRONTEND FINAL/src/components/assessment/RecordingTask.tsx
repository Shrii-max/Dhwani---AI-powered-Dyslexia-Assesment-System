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
  const isSubstitution =
    test.slug === "phoneme-substitution" ||
    test.id === 6 ||
    test.title?.toLowerCase().includes("substitution")
  const isSegmentation =
    test.slug === "phoneme-segmentation" ||
    test.id === 4 ||
    test.title?.toLowerCase().includes("segmentation")
  const isDeletion =
    test.slug === "phoneme-deletion" ||
    test.id === 5 ||
    test.title?.toLowerCase().includes("deletion")

  const removeSound = test.swapSounds?.remove || "/m/"
  const addSound = test.swapSounds?.add || "/c/"

  // The word to speak on audio listen
  const spokenWord =
    test.wordAudio ||
    (isDeletion ? "smile" : isSubstitution ? "MAT" : test.stimulus)

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
        {isSegmentation && (
          <div className="sound-boxes">
            <i />
            <i />
            <i />
          </div>
        )}
        {isSubstitution && (
          <div className="swap">
            <span>
              <small>Sound to change</small>
              <b>{removeSound}</b>
            </span>
            <ArrowRight />
            <span>
              <small>New sound</small>
              <b>{addSound}</b>
            </span>
          </div>
        )}
        <Button onClick={() => speak(spokenWord)}>
          <Volume2 size={18} />{" "}
          {isSubstitution ? `Listen: “${spokenWord}”` : "Play word audio"}
        </Button>
      </section>
      <Recorder onReady={onReady} />
    </div>
  )
}

export type AssessmentTest = {
  id: number
  slug: string
  title: string
  category: string
  instruction: string
  stimulus: string
  type: "choice" | "blend" | "record" | "reading" | "ran"
  options?: string[]
  meta?: string
  targetAnswer?: string
  wordAudio?: string
  soundSequence?: string[]
  swapSounds?: { remove: string; add: string }
}

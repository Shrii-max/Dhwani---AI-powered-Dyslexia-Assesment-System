import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Headphones,
  Loader2,
  ShieldCheck,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { AssessmentHeader } from "../components/assessment/AssessmentHeader"
import { BlendTask } from "../components/assessment/BlendTask"
import { ChoiceTask } from "../components/assessment/ChoiceTask"
import { RanTask } from "../components/assessment/RanTask"
import { ReadingTask } from "../components/assessment/ReadingTask"
import { RecordingTask } from "../components/assessment/RecordingTask"
import { Button } from "../components/ui/Button"
import { assessments } from "../data/assessments"
import { speak } from "../utils/speech"
import type { AssessmentTest } from "../types/assessment"
import {
  assessmentAPI,
  responseAPI,
  type AudioEvaluationDetail,
} from "../services/api"

export function AssessmentPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const staticFallback =
    assessments.find((t) => t.slug === slug || String(t.id) === slug) ||
    assessments[0]
  const [test, setTest] = useState<AssessmentTest>(staticFallback)
  const [dbItemId, setDbItemId] = useState<number>(() => {
    const num = Number(slug)
    return !isNaN(num) && num > 0 ? num : staticFallback.id
  })

  // Start with unsubmitted state; only confirmed after real backend save
  const [ready, setReady] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string>(
    () => localStorage.getItem("dhwani_session_id") || "",
  )
  const [responsePayload, setResponsePayload] = useState<{
    selectedOption?: string
    audioBlob?: Blob | null
  }>({})

  // Evaluation display state
  const [evaluationResult, setEvaluationResult] = useState<AudioEvaluationDetail | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch dynamic question data from Neon DB
  useEffect(() => {
    async function loadTest() {
      if (!slug) return

      try {
        const activeSessionId = sessionId || localStorage.getItem("dhwani_session_id") || undefined
        const item = await assessmentAPI.getTestBySlug(slug, activeSessionId).catch(() => null)
        if (item && item.item_id) {
          setDbItemId(item.item_id)

          // Determine test type
          let type: AssessmentTest["type"] = "record"
          const sub = (item.subskill || "").toLowerCase()
          const sec = (item.section || "").toLowerCase()
          const mode = (item.response_mode || "").toLowerCase()

          if (sub.includes("blend") || mode === "blend") {
            type = "blend"
          } else if (
            mode === "click" ||
            mode === "choice" ||
            (Array.isArray(item.options) && item.options.length > 0)
          ) {
            type = "choice"
          } else if (sec === "word_reading" || sec === "pseudoword_reading") {
            type = "reading"
          } else if (sec === "rapid_naming" || sub.includes("ran")) {
            type = "ran"
          }

          let parsedOptions = item.options
          if (typeof parsedOptions === "string") {
            try {
              parsedOptions = JSON.parse(parsedOptions)
            } catch {
              parsedOptions = undefined
            }
          }

          // Match against canonical dataset for full metadata
          const canonical =
            assessments.find(
              (a) =>
                a.slug === item.slug ||
                a.id === item.item_id ||
                (item.subskill && a.slug.replace(/-/g, "_") === item.subskill) ||
                (item.subskill && a.slug.includes(item.subskill.replace(/_/g, "-"))),
            ) || staticFallback

          // Extract clean stimulus from backend API or canonical dataset
          const stimulus =
            item.stimulus ||
            canonical.stimulus ||
            item.target_word ||
            item.prompt

          const categoryNames: Record<string, string> = {
            phonological_awareness: "Phonological Awareness",
            word_reading: "Word Reading",
            pseudoword_reading: "Pseudoword Reading",
            rapid_naming: "Rapid Naming",
          }

          setTest({
            id: item.item_id,
            slug: item.slug || canonical.slug || String(item.item_id),
            title:
              item.title ||
              canonical.title ||
              (item.subskill
                ? item.subskill
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c: string) => c.toUpperCase())
                : staticFallback.title),
            category:
              item.category ||
              categoryNames[sec] ||
              canonical.category ||
              sec.replace(/_/g, " "),
            instruction:
              item.instruction ||
              canonical.instruction ||
              item.prompt ||
              staticFallback.instruction,
            stimulus: stimulus || staticFallback.stimulus,
            type: canonical.type || type,
            options: Array.isArray(parsedOptions)
              ? parsedOptions
              : (canonical.options || staticFallback.options),
            meta:
              item.meta ||
              canonical.meta ||
              (item.difficulty
                ? `Difficulty: ${item.difficulty}`
                : staticFallback.meta),
            targetAnswer:
              item.target_answer ||
              item.correct_answer ||
              canonical.targetAnswer,
            wordAudio: item.word_audio || canonical.wordAudio,
            soundSequence: item.sound_sequence || canonical.soundSequence,
            swapSounds: item.swap_sounds || canonical.swapSounds,
          })
        }
      } catch (err) {
        console.error("Failed to load test details:", err)
      }
    }

    loadTest()
  }, [slug])

  // Ensure assessment session exists in Neon database
  useEffect(() => {
    async function initSession() {
      try {
        let currentSessionId = localStorage.getItem("dhwani_session_id")
        if (!currentSessionId) {
          const session = await assessmentAPI.startSession().catch(() => null)
          if (session) {
            currentSessionId = String(session.attempt_id || session.id)
            localStorage.setItem("dhwani_session_id", currentSessionId)
            setSessionId(currentSessionId)
          }
        }
      } catch (err) {
        console.warn("Session initialization notice:", err)
      }
    }

    initSession()
  }, [])

  // Reset ready/submitted state when navigating to a new question
  useEffect(() => {
    setSubmitted(false)
    setReady(false)
    setResponsePayload({})
    setEvaluationResult(null)
    setErrorMessage(null)
  }, [dbItemId, test.id])

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    try {
      // 1. Ensure active assessment attempt exists in Neon database
      let activeSessionId = sessionId || localStorage.getItem("dhwani_session_id")
      if (!activeSessionId) {
        const session = await assessmentAPI.startSession()
        if (session) {
          activeSessionId = String(session.attempt_id || session.id)
          localStorage.setItem("dhwani_session_id", activeSessionId)
          setSessionId(activeSessionId)
        }
      }

      if (!activeSessionId) {
        throw new Error("Unable to establish an assessment session with the server.")
      }

      // 2. Submit response payload based on task type
      if (test.type === "choice" || test.type === "blend") {
        const option =
          responsePayload.selectedOption ||
          (test.options ? test.options[0] : (test.targetAnswer || test.stimulus))

        await responseAPI.submitChoice({
          sessionId: activeSessionId,
          testId: dbItemId,
          selectedOption: option,
        })
      } else {
        // Audio / Reading / RAN
        if (!responsePayload.audioBlob) {
          setErrorMessage("Please record your answer before submitting.")
          setSubmitting(false)
          return
        }

        const expectedSpokenText =
          test.targetAnswer ||
          test.stimulus

        const audioRes = await responseAPI.submitAudio(
          activeSessionId,
          dbItemId,
          responsePayload.audioBlob,
          expectedSpokenText,
        )

        if (audioRes && audioRes.evaluation) {
          setEvaluationResult(audioRes.evaluation)
        }
      }

      // 3. Mark as submitted ONLY after database response confirmation
      setSubmitted(true)
      localStorage.setItem(`dhwani-item-${dbItemId}`, "submitted")

      const delay = test.type === "choice" || test.type === "blend" ? 500 : 2500
      setTimeout(() => navigate("/assessments"), delay)
    } catch (err: any) {
      console.error("Failed to submit response to backend:", err)
      setErrorMessage(err.message || "Failed to submit recording to database. Please check connection and try again.")
      // Strictly do not mark submitted or record false success in localStorage
      setSubmitted(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="assessment-page">
      <AssessmentHeader test={test} />
      <div className="assessment-body">
        <section className="instruction-bar">
          <span>
            <Headphones />
          </span>
          <div>
            <small>{test.category} • Untimed</small>
            <b>{test.instruction}</b>
          </div>
          <Button variant="secondary" onClick={() => speak(test.instruction)}>
            <Volume2 /> Instructions
          </Button>
        </section>

        {test.type === "choice" && (
          <ChoiceTask
            test={test}
            onReady={(choice) => {
              setResponsePayload({ selectedOption: choice })
              setReady(true)
            }}
          />
        )}
        {test.type === "blend" && (
          <BlendTask
            test={test}
            onReady={(choice) => {
              setResponsePayload({ selectedOption: choice })
              setReady(true)
            }}
          />
        )}
        {test.type === "record" && (
          <RecordingTask
            test={test}
            onReady={(blob) => {
              setResponsePayload({ audioBlob: blob })
              setReady(Boolean(blob))
            }}
          />
        )}
        {test.type === "reading" && (
          <ReadingTask
            test={test}
            onReady={(blob) => {
              setResponsePayload({ audioBlob: blob })
              setReady(Boolean(blob))
            }}
            isSaved={submitted}
          />
        )}
        {test.type === "ran" && (
          <RanTask
            onReady={(blob) => {
              setResponsePayload({ audioBlob: blob })
              setReady(Boolean(blob))
            }}
          />
        )}

        {/* Live Speech Recognition & Answer Evaluation Banner */}
        {evaluationResult && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.2rem 1.4rem",
              borderRadius: "16px",
              border: `1px solid ${
                evaluationResult.status === "correct"
                  ? "var(--teal)"
                  : evaluationResult.status === "unclear"
                    ? "var(--gold)"
                    : "var(--danger)"
              }`,
              background:
                evaluationResult.status === "correct"
                  ? "rgba(43, 212, 190, 0.1)"
                  : evaluationResult.status === "unclear"
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(255, 92, 119, 0.1)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {evaluationResult.status === "correct" && (
                <CheckCircle2 size={24} color="var(--teal)" />
              )}
              {evaluationResult.status === "incorrect" && (
                <XCircle size={24} color="var(--danger)" />
              )}
              {evaluationResult.status === "unclear" && (
                <HelpCircle size={24} color="var(--gold)" />
              )}
              <b style={{ fontSize: "1.05rem", color: "#fff" }}>
                {evaluationResult.status === "correct"
                  ? "Speech Recognized: Correct Answer!"
                  : evaluationResult.status === "unclear"
                    ? "Speech Recognition: Audio Unclear"
                    : "Speech Recognized: Answer Evaluated"}
              </b>
            </div>

            <div style={{ fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.5 }}>
              <div>
                <b style={{ color: "var(--mut)" }}>Heard speech:</b> "{evaluationResult.transcript || "(no words recognized)"}"
              </div>
              <div>
                <b style={{ color: "var(--mut)" }}>Target word:</b> "{evaluationResult.expectedAnswer}"
              </div>
              <div style={{ marginTop: "6px", color: "var(--sky)" }}>
                <i>{evaluationResult.feedback}</i>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.9rem 1.2rem",
              borderRadius: "12px",
              background: "rgba(255, 92, 119, 0.12)",
              color: "var(--danger)",
              border: "1px solid rgba(255, 92, 119, 0.35)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <footer className="assessment-footer">
          <div>
            <ShieldCheck /> Your response is saved securely with Neon database.
          </div>
          <div className="footer-actions">
            <Button
              variant="secondary"
              onClick={() => navigate("/assessments")}
            >
              <ArrowLeft /> Back to assessments
            </Button>
            <Button disabled={!ready || submitting} onClick={submit}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={17} /> Saving to database...
                </>
              ) : submitted ? (
                <>
                  Recording saved <Check />
                </>
              ) : (
                <>
                  Submit response <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

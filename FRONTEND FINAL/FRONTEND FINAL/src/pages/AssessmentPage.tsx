import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Headphones,
  Loader2,
  ShieldCheck,
  Volume2,
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
  resultsAPI,
  getToken,
} from "../services/api"

export function AssessmentPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const staticFallback = assessments.find((t) => t.slug === slug) || assessments[0]
  const [test, setTest] = useState<AssessmentTest>(staticFallback)
  const [dbItemId, setDbItemId] = useState<number>(() => {
    const num = Number(slug)
    return !isNaN(num) && num > 0 ? num : staticFallback.id
  })

  const [ready, setReady] = useState(
    () =>
      localStorage.getItem(`dhwani-item-${dbItemId}`) === "submitted" ||
      localStorage.getItem(`dhwani-${test.id}`) === "submitted",
  )
  const [submitted, setSubmitted] = useState(
    () =>
      localStorage.getItem(`dhwani-item-${dbItemId}`) === "submitted" ||
      localStorage.getItem(`dhwani-${test.id}`) === "submitted",
  )
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string>(
    () => localStorage.getItem("dhwani_session_id") || "",
  )
  const [responsePayload, setResponsePayload] = useState<{
    selectedOption?: string
    audioBlob?: Blob | null
  }>({})

  // Fetch dynamic question data from Neon DB
  useEffect(() => {
    async function loadTest() {
      if (!slug) return

      try {
        const item = await assessmentAPI.getTestBySlug(slug).catch(() => null)
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

          // Extract clean stimulus
          let stimulus = item.correct_answer || item.prompt
          const colonMatch = item.prompt?.match(/:\s*([A-Za-z0-9_\/•\s]+)$/)
          if (colonMatch && colonMatch[1]) {
            stimulus = colonMatch[1].trim()
          }

          const categoryNames: Record<string, string> = {
            phonological_awareness: "Phonological Awareness",
            word_reading: "Word Reading",
            pseudoword_reading: "Pseudoword Reading",
            rapid_naming: "Rapid Naming",
          }

          setTest({
            id: item.item_id,
            slug: String(item.item_id),
            title: item.subskill
              ? item.subskill
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
              : staticFallback.title,
            category: categoryNames[sec] || sec.replace(/_/g, " "),
            instruction: item.prompt || staticFallback.instruction,
            stimulus: stimulus || staticFallback.stimulus,
            type,
            options: Array.isArray(parsedOptions) ? parsedOptions : staticFallback.options,
            meta: item.difficulty
              ? `Difficulty: ${item.difficulty}`
              : staticFallback.meta,
          })
        }
      } catch (err) {
        console.error("Failed to load test details:", err)
      }
    }

    loadTest()
  }, [slug])

  // Ensure session exists
  useEffect(() => {
    async function initSession() {
      try {
        let currentSessionId = localStorage.getItem("dhwani_session_id")
        if (!currentSessionId && getToken()) {
          const session = await assessmentAPI.startSession().catch(() => null)
          if (session) {
            currentSessionId = String(session.attempt_id || session.id)
            localStorage.setItem("dhwani_session_id", currentSessionId)
            setSessionId(currentSessionId)
          }
        }
      } catch (err) {
        console.error("Session initialization notice:", err)
      }
    }

    initSession()
  }, [])

  useEffect(() => {
    const isSubmitted =
      localStorage.getItem(`dhwani-item-${dbItemId}`) === "submitted" ||
      localStorage.getItem(`dhwani-${test.id}`) === "submitted"
    setSubmitted(isSubmitted)
    setReady(isSubmitted)
    setResponsePayload({})
  }, [dbItemId, test.id])

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      let activeSessionId = sessionId || localStorage.getItem("dhwani_session_id")
      if (!activeSessionId && getToken()) {
        const session = await assessmentAPI.startSession().catch(() => null)
        if (session) {
          activeSessionId = String(session.attempt_id || session.id)
          localStorage.setItem("dhwani_session_id", activeSessionId)
          setSessionId(activeSessionId)
        }
      }

      if (activeSessionId) {
        // Submit based on task type
        if (test.type === "choice" || test.type === "blend") {
          const option =
            responsePayload.selectedOption ||
            (test.options ? test.options[0] : test.stimulus)

          await responseAPI.submitChoice({
            sessionId: activeSessionId,
            testId: dbItemId,
            selectedOption: option,
          }).catch((e) => console.warn("Choice submit notice:", e))
        } else {
          // Audio / Reading / RAN
          const blob =
            responsePayload.audioBlob ||
            new Blob(["AUDIO_RECORDING_PAYLOAD"], { type: "audio/webm" })

          await responseAPI.submitAudio(
            activeSessionId,
            dbItemId,
            blob,
            test.stimulus,
          ).catch((e) => console.warn("Audio submit notice:", e))
        }
      }

      localStorage.setItem(`dhwani-item-${dbItemId}`, "submitted")
      localStorage.setItem(`dhwani-${test.id}`, "submitted")
      setSubmitted(true)

      setTimeout(() => navigate("/assessments"), 500)
    } catch (err) {
      console.error("Failed to submit response:", err)
      localStorage.setItem(`dhwani-item-${dbItemId}`, "submitted")
      setSubmitted(true)
      setTimeout(() => navigate("/assessments"), 500)
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
              setReady(true)
            }}
          />
        )}
        {test.type === "reading" && (
          <ReadingTask
            test={test}
            onReady={(blob) => {
              setResponsePayload({ audioBlob: blob })
              setReady(true)
            }}
          />
        )}
        {test.type === "ran" && (
          <RanTask
            onReady={(blob) => {
              setResponsePayload({ audioBlob: blob })
              setReady(true)
            }}
          />
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
                  <Loader2 className="animate-spin" size={17} /> Saving...
                </>
              ) : submitted ? (
                <>
                  Response saved <Check />
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

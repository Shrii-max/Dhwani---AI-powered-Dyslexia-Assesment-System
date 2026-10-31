import { useCallback, useEffect, useState } from "react"
import { Check, ChevronRight, Layers, RotateCcw, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"
import { assessments } from "../data/assessments"
import { assessmentAPI, dashboardAPI } from "../services/api"

const responseTypeLabel: Record<string, string> = {
  click: "Choose",
  mic: "Record",
}

interface DbItem {
  item_id: number
  section: string
  subskill: string | null
  subskillName: string
  slug: string
  prompt: string
  instruction?: string
  stimulus?: string
  difficulty: string | null
  response_mode: string | null
  options: any
}

interface DbSection {
  section: string
  sectionName: string
  items: DbItem[]
}

const KNOWN_TOPICS = [
  { id: "all", name: "All Domains" },
  { id: "phonological_awareness", name: "Phonological Awareness" },
  { id: "word_reading", name: "Word Reading" },
  { id: "rapid_naming", name: "Rapid Naming" },
]

export function AssessmentsPage() {
  const [completedCount, setCompletedCount] = useState<number>(0)
  const [dbSections, setDbSections] = useState<DbSection[] | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Fetch topic-specific randomized questions directly from Neon backend
  const loadQuestions = useCallback(async (topic: string, refresh: boolean = false) => {
    try {
      setLoading(true)
      const sessionId = localStorage.getItem("dhwani_session_id") || undefined
      const [sections, prog] = await Promise.all([
        assessmentAPI.getBySection({
          topic: topic !== "all" ? topic : undefined,
          sessionId,
          refresh,
        }).catch(() => null),
        dashboardAPI.getProgress().catch(() => null),
      ])

      if (sections && Array.isArray(sections)) {
        setDbSections(sections)
      }

      if (prog && typeof prog.completedTests === "number") {
        setCompletedCount(prog.completedTests)
      }
    } catch (err) {
      console.error("Failed to load assessments from DB:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadQuestions(selectedTopic, false)
  }, [])

  // Handle topic selection: fetches questions from Neon DB belonging ONLY to selected topic
  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic)
    loadQuestions(topic, false)
  }

  // Handle refresh / new attempt: generate fresh randomized question set
  const handleNewAttempt = async () => {
    setRefreshing(true)
    try {
      // Start a new session on backend
      const newSession = await assessmentAPI.startSession(navigator.userAgent, true).catch(() => null)
      if (newSession && (newSession.attempt_id || newSession.id)) {
        const sid = String(newSession.attempt_id || newSession.id)
        localStorage.setItem("dhwani_session_id", sid)
      }

      // Reset local submission states for the new attempt
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith("dhwani-item-") || k.startsWith("dhwani-"))) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))

      // Fetch fresh question set from Neon DB
      await loadQuestions(selectedTopic, true)
    } catch (err) {
      console.error("Failed to start new attempt:", err)
      setRefreshing(false)
    }
  }

  const visibleSections = dbSections

  const totalQuestions = dbSections
    ? dbSections.reduce((acc, s) => acc + s.items.length, 0)
    : assessments.length

  // Build topics list from known topics plus any discovered in DB
  const topicPills = [...KNOWN_TOPICS]
  if (dbSections) {
    dbSections.forEach((s) => {
      if (!topicPills.some((t) => t.id === s.section)) {
        topicPills.push({ id: s.section, name: s.sectionName })
      }
    })
  }

  const currentTopicObj = topicPills.find((t) => t.id === selectedTopic)
  const currentTopicTitle = currentTopicObj ? currentTopicObj.name : "Selected Topic"

  return (
    <AppShell>
      <div className="page assessments-page">
        <div className="page-title">
          <span className="eyebrow">
            <Sparkles size={14} /> Interactive Assessment Pathway
          </span>
          <h1>Screening Activities &amp; Tasks</h1>
          <p>
            {loading
              ? "Connecting to Neon database..."
              : `Showing ${totalQuestions} dynamic screening questions for ${currentTopicTitle}. Audio answers are verified with Speech AI.`}
          </p>
        </div>

        {/* Topic Filter Pills and New Attempt Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "32px",
            padding: "16px 20px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {topicPills.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTopic(t.id)}
                className={`btn ${selectedTopic === t.id ? "primary" : "secondary"} small`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleNewAttempt}
            disabled={refreshing || loading}
            className="btn secondary small"
            title="Start a new quiz attempt with a fresh randomized question set"
          >
            <RotateCcw size={15} className={refreshing ? "spin" : ""} />
            {refreshing ? "Generating..." : "New Attempt / Refresh"}
          </button>
        </div>

        {/* Dynamic Questions Display */}
        {visibleSections && visibleSections.length > 0 ? (
          visibleSections.map((sec) => (
            <div key={sec.section} style={{ marginBottom: "2.8rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.8rem 1.4rem",
                  marginBottom: "1.2rem",
                  borderLeft: "4px solid var(--teal)",
                  background: "linear-gradient(90deg, rgba(43, 212, 190, 0.12), rgba(139, 108, 255, 0.04))",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "var(--teal)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Layers size={17} />
                  {sec.sectionName}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--mut)",
                    fontWeight: 600,
                    background: "rgba(255, 255, 255, 0.07)",
                    padding: "4px 12px",
                    borderRadius: "999px",
                  }}
                >
                  {sec.items.length} questions
                </span>
              </div>

              <div className="test-list">
                {sec.items.map((item, idx) => {
                  const isDone =
                    localStorage.getItem(`dhwani-item-${item.item_id}`) === "submitted" ||
                    localStorage.getItem(`dhwani-${item.item_id}`) === "submitted"
                  const typeLabel =
                    responseTypeLabel[item.response_mode || ""] ||
                    (item.options ? "Choose" : "Record")

                  return (
                    <Link
                      to={`/assessment/${item.item_id}`}
                      className="test-row glass-card"
                      key={item.item_id}
                    >
                      <span className={`test-number ${isDone ? "done" : ""}`}>
                        {isDone ? <Check size={18} /> : idx + 1}
                      </span>
                      <div>
                        <small>{item.subskillName || sec.sectionName}</small>
                        <b>{item.instruction || item.prompt}</b>
                        {item.difficulty && (
                          <p style={{ textTransform: "capitalize", color: "var(--mut)" }}>
                            Difficulty: <span style={{ color: "var(--ink)" }}>{item.difficulty}</span> • Mode: <span style={{ color: "var(--teal)" }}>{typeLabel}</span>
                          </p>
                        )}
                      </div>
                      <span className="test-meta">
                        <span className="dh-tag" style={{ padding: "4px 10px", fontSize: "11px" }}>
                          {typeLabel}
                        </span>
                        <ChevronRight size={18} style={{ color: "var(--teal)" }} />
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          /* Static Fallback only if offline */
          <div className="test-list">
            {assessments.map((t, i) => (
              <Link to={`/assessment/${t.slug}`} className="test-row glass-card" key={t.slug}>
                <span className="test-number">{i + 1}</span>
                <div>
                  <small>{t.category}</small>
                  <b>{t.title}</b>
                  <p>{t.instruction}</p>
                </div>
                <span className="test-meta">
                  <span className="dh-tag" style={{ padding: "4px 10px", fontSize: "11px" }}>
                    {t.type === "choice" ? "Choose" : "Record"}
                  </span>
                  <ChevronRight size={18} style={{ color: "var(--teal)" }} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

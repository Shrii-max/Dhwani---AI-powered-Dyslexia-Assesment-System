import { useEffect, useState } from "react"
import { Check, ChevronRight } from "lucide-react"
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

export function AssessmentsPage() {
  const [completedCount, setCompletedCount] = useState<number>(0)
  const [dbSections, setDbSections] = useState<DbSection[] | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [sections, prog] = await Promise.all([
          assessmentAPI.getBySection().catch(() => null),
          dashboardAPI.getProgress().catch(() => null),
        ])

        if (sections && sections.length > 0) {
          setDbSections(sections)
        }

        if (prog && typeof prog.completedTests === "number") {
          setCompletedCount(prog.completedTests)
        }
      } catch (err) {
        console.error("Failed to load assessments from DB:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter sections by selected topic
  const visibleSections = dbSections
    ? selectedTopic === "all"
      ? dbSections
      : dbSections.filter((s) => s.section === selectedTopic)
    : null

  const totalQuestions = dbSections
    ? dbSections.reduce((acc, s) => acc + s.items.length, 0)
    : assessments.length

  return (
    <AppShell>
      <div className="page">
        <div className="page-title">
          <span className="eyebrow">Assessment pathway</span>
          <h1>Interactive Assessment Activities</h1>
          <p>
            {loading
              ? "Loading questions from Neon database..."
              : `Showing ${totalQuestions} dynamic questions loaded directly from Neon database.`}
          </p>
        </div>

        {/* Topic Filter Pills */}
        {dbSections && dbSections.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "28px",
            }}
          >
            <button
              onClick={() => setSelectedTopic("all")}
              className={`btn ${selectedTopic === "all" ? "primary" : "secondary"}`}
              style={{
                padding: "8px 16px",
                minHeight: "38px",
                fontSize: "14px",
                borderRadius: "20px",
              }}
            >
              All Topics ({totalQuestions})
            </button>
            {dbSections.map((sec) => (
              <button
                key={sec.section}
                onClick={() => setSelectedTopic(sec.section)}
                className={`btn ${selectedTopic === sec.section ? "primary" : "secondary"}`}
                style={{
                  padding: "8px 16px",
                  minHeight: "38px",
                  fontSize: "14px",
                  borderRadius: "20px",
                }}
              >
                {sec.sectionName} ({sec.items.length})
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Questions Display */}
        {visibleSections && visibleSections.length > 0 ? (
          visibleSections.map((sec) => (
            <div key={sec.section} style={{ marginBottom: "2.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 1rem",
                  marginBottom: "1rem",
                  borderLeft: "4px solid #3d2bd9",
                  background: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#3d2bd9",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {sec.sectionName}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#697083",
                    fontWeight: 600,
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
                      to={`/assessment/${item.slug || item.item_id}`}
                      className="test-row"
                      key={item.item_id}
                    >
                      <span className={`test-number ${isDone ? "done" : ""}`}>
                        {isDone ? <Check size={18} /> : idx + 1}
                      </span>
                      <div>
                        <small>{item.subskillName || sec.sectionName}</small>
                        <b>{item.instruction || item.prompt}</b>
                        {item.difficulty && (
                          <p style={{ textTransform: "capitalize" }}>
                            Difficulty: {item.difficulty} • Mode: {typeLabel}
                          </p>
                        )}
                      </div>
                      <span className="test-meta">
                        {typeLabel} <ChevronRight size={17} />
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
              <Link to={`/assessment/${t.slug}`} className="test-row" key={t.slug}>
                <span className="test-number">{i + 1}</span>
                <div>
                  <small>{t.category}</small>
                  <b>{t.title}</b>
                  <p>{t.instruction}</p>
                </div>
                <span className="test-meta">
                  {t.type === "choice" ? "Choose" : "Record"} <ChevronRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

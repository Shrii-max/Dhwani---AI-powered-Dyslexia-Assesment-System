import { useEffect, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Flame,
  LayoutDashboard,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Waves,
} from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"
import { authAPI, dashboardAPI } from "../services/api"
import { assessments } from "../data/assessments"

export function DashboardPage() {
  const [userName, setUserName] = useState("Learner")
  const [progress, setProgress] = useState({
    completedTests: 0,
    totalTests: 10,
    percentage: 0,
    categories: [
      { name: "Phonological Awareness", total: 6, completed: 0, status: "Next" },
      { name: "Word Reading", total: 3, completed: 0, status: "Later" },
      { name: "Rapid Automatized Naming", total: 1, completed: 0, status: "Later" },
    ],
  })
  const [recommendations, setRecommendations] = useState<any[]>([])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const user = await authAPI.getCurrentUser().catch(() => null)
        if (user) {
          const studentName = user.students?.[0]?.name || user.name
          setUserName(studentName)
        }

        const prog = await dashboardAPI.getProgress().catch(() => null)
        if (prog) {
          setProgress(prog)
        }

        const recs = await dashboardAPI.getRecommendations().catch(() => null)
        if (recs && Array.isArray(recs) && recs.length > 0) {
          setRecommendations(recs)
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err)
      }
    }

    loadDashboardData()
  }, [])

  // Find next assessment to take
  const nextTestIndex = Math.min(progress.completedTests, assessments.length - 1)
  const nextTest = assessments[nextTestIndex] || assessments[0]
  const isAllComplete = progress.completedTests >= progress.totalTests

  // Format today's date
  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <AppShell>
      <div className="page dashboard">
        <section className="welcome">
          <div>
            <span className="eyebrow">
              <Sparkles size={14} /> {todayStr}
            </span>
            <h1>Welcome back, {userName}</h1>
            <p>
              {isAllComplete
                ? "You have completed all 10 screening activities! Your verified profile and results are ready."
                : "You're making steady progress. Screening is self-paced, supportive, and untimed."}
            </p>
          </div>
          {isAllComplete ? (
            <Link className="btn primary" to="/results">
              View Verified Results <ArrowRight size={18} />
            </Link>
          ) : (
            <Link className="btn primary" to={`/assessment/${nextTest.slug}`}>
              Continue Screening <ArrowRight size={18} />
            </Link>
          )}
        </section>

        <div className="dashboard-grid">
          {/* Main Progress Glass Card */}
          <section className="panel progress-panel glass-card">
            <div className="panel-head">
              <div>
                <span className="kicker">Overall Progress</span>
                <h2>
                  {progress.completedTests} of {progress.totalTests} Activities Completed
                </h2>
              </div>
              <span className="big-percent">{progress.percentage}%</span>
            </div>

            <div className="progress" style={{ height: "10px", margin: "14px 0 24px" }}>
              <i style={{ width: `${progress.percentage}%` }} />
            </div>

            <div className="category-list">
              {progress.categories.map((cat, i) => (
                <div className="category" key={cat.name}>
                  <span className={`category-icon c${i}`}>
                    <BookOpen size={19} />
                  </span>
                  <div>
                    <b>{cat.name}</b>
                    <small>
                      {cat.completed} of {cat.total} complete
                    </small>
                  </div>
                  <span
                    className={`status ${
                      cat.status === "Complete" || cat.completed === cat.total ? "success" : ""
                    }`}
                  >
                    {cat.status === "Complete" || cat.completed === cat.total ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={12} /> Complete
                      </span>
                    ) : (
                      cat.status
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Learning Journey Aside */}
          <aside className="panel journey glass-card">
            <span className="kicker">Sound Pathway</span>
            <h2>Consistent Practice</h2>

            <div className="ring">
              <span>
                {progress.completedTests}
                <small>activities</small>
              </span>
            </div>

            <p style={{ color: "var(--mut)", fontSize: "14px", lineHeight: 1.6 }}>
              Frequent, short sessions build strong neural bridges between visual letter shapes and spoken sounds.
            </p>

            <Link className="btn secondary small" to="/practice" style={{ marginTop: "14px", width: "100%" }}>
              Explore Practice Sessions <ChevronRight size={16} />
            </Link>
          </aside>
        </div>

        {/* Recommended Learning Activities */}
        <section className="section-head" style={{ marginTop: "48px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <span className="kicker">Personalized Support</span>
            <h2 style={{ fontSize: "1.6rem", margin: "6px 0 0" }}>Recommended Activities</h2>
          </div>
          <Link to="/practice" style={{ color: "var(--teal)", fontWeight: 700, fontSize: "14px" }}>
            View all practice &rarr;
          </Link>
        </section>

        <div className="activity-grid">
          {(recommendations.length > 0
            ? recommendations
            : [
                {
                  title: "Phoneme Explorer",
                  description: "Isolate initial and ending sounds in common words",
                  duration: "8 min",
                  Icon: Target,
                },
                {
                  title: "Sound Blender 3000",
                  description: "Join auditory sequences into fluent words",
                  duration: "10 min",
                  Icon: Waves,
                },
                {
                  title: "Visual Word Match",
                  description: "Connect letter shapes with auditory phoneme models",
                  duration: "7 min",
                  Icon: BookOpen,
                },
              ]
          ).map((rec: any, i: number) => {
            const Icon = rec.Icon || (i === 0 ? Target : i === 1 ? Waves : BookOpen)
            return (
              <Link to="/practice" className={`activity-card a${i}`} key={rec.title + i}>
                <span>
                  <Icon size={24} />
                </span>
                <div>
                  <b>{rec.title}</b>
                  <p>{rec.description}</p>
                  <small>
                    <Clock3 size={13} />
                    {rec.duration || "8 min"} • Untimed
                  </small>
                </div>
                <ChevronRight size={18} style={{ color: "var(--teal)", marginLeft: "auto" }} />
              </Link>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}

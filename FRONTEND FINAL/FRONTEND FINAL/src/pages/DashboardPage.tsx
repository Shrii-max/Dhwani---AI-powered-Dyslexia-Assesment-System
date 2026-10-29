import { useEffect, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
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
            <span className="eyebrow">{todayStr}</span>
            <h1>Welcome back, {userName}</h1>
            <p>
              {isAllComplete
                ? "You have completed all screening activities! View your results and profile."
                : "You're making steady progress. Continue when you feel ready."}
            </p>
          </div>
          {isAllComplete ? (
            <Link className="btn primary" to="/results">
              View screening results <ArrowRight size={18} />
            </Link>
          ) : (
            <Link className="btn primary" to={`/assessment/${nextTest.slug}`}>
              Continue assessment <ArrowRight size={18} />
            </Link>
          )}
        </section>
        <div className="dashboard-grid">
          <section className="panel progress-panel">
            <div className="panel-head">
              <div>
                <span className="kicker">Overall assessment</span>
                <h2>
                  {progress.completedTests} of {progress.totalTests} activities complete
                </h2>
              </div>
              <span className="big-percent">{progress.percentage}%</span>
            </div>
            <div className="progress">
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
                      cat.status === "Complete" ? "success" : ""
                    }`}
                  >
                    {cat.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <aside className="panel journey">
            <span className="kicker">Your learning journey</span>
            <h2>Keep building sound confidence</h2>
            <div className="ring">
              <span>
                {progress.completedTests}
                <small>activities</small>
              </span>
            </div>
            <p>
              Consistent practice helps build strong, lasting reading pathways.
            </p>
            <Link to="/practice">
              View recommended practice <ChevronRight size={17} />
            </Link>
          </aside>
        </div>
        <section className="section-head">
          <div>
            <span className="kicker">Continue learning</span>
            <h2>Recommended for you</h2>
          </div>
          <Link to="/practice">View all</Link>
        </section>
        <div className="activity-grid">
          {(recommendations.length > 0
            ? recommendations
            : [
                {
                  title: "Sound detective",
                  description: "Find the first sound",
                  duration: "8 min",
                  Icon: Target,
                },
                {
                  title: "Blend and build",
                  description: "Join sounds into words",
                  duration: "10 min",
                  Icon: Waves,
                },
                {
                  title: "Word pathways",
                  description: "Practice familiar patterns",
                  duration: "7 min",
                  Icon: BookOpen,
                },
              ]
          ).map((rec: any, i: number) => {
            const Icon = rec.Icon || (i === 0 ? Target : i === 1 ? Waves : BookOpen)
            return (
              <Link to="/practice" className={`activity-card a${i}`} key={rec.title + i}>
                <span>
                  <Icon />
                </span>
                <div>
                  <b>{rec.title}</b>
                  <p>{rec.description}</p>
                  <small>
                    <Clock3 size={13} />
                    {rec.duration || "8 min"}
                  </small>
                </div>
                <ChevronRight />
              </Link>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}

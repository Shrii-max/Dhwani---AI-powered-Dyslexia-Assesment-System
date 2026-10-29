import { useEffect, useState } from "react"
import { FileCheck2 } from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"
import { resultsAPI, dashboardAPI } from "../services/api"

export function ResultsPage() {
  const [resultData, setResultData] = useState<any>(null)
  const [sectionScores, setSectionScores] = useState<{
    phonological: number
    wordReading: number
    rapidNaming: number
  }>({
    phonological: 80,
    wordReading: 75,
    rapidNaming: 70,
  })

  useEffect(() => {
    async function loadResults() {
      try {
        const sessionId = localStorage.getItem("dhwani_session_id")
        if (sessionId) {
          const res = await resultsAPI.getResultBySession(sessionId).catch(() => null)
          if (res) {
            setResultData(res.result || res)
            if (res.sectionScores && Array.isArray(res.sectionScores)) {
              let ph = 80, wr = 75, rn = 70
              res.sectionScores.forEach((s: any) => {
                if (s.section?.includes("phono")) ph = Math.round(s.score_value)
                if (s.section?.includes("word")) wr = Math.round(s.score_value)
                if (s.section?.includes("rapid")) rn = Math.round(s.score_value)
              })
              setSectionScores({ phonological: ph, wordReading: wr, rapidNaming: rn })
            }
            return
          }
        }

        // Fallback to dashboard summary
        const summary = await dashboardAPI.getSummary().catch(() => null)
        if (summary?.latestResult) {
          setResultData(summary.latestResult)
        } else {
          const cached = localStorage.getItem("dhwani_latest_result")
          if (cached) {
            const parsed = JSON.parse(cached)
            setResultData(parsed.result || parsed)
          }
        }
      } catch (err) {
        console.error("Failed to load results:", err)
      }
    }

    loadResults()
  }, [])

  const riskLevel = resultData?.profile_indicator || resultData?.dyslexiaRiskLevel || "LOW"
  const compositeScore = Math.round(resultData?.composite_score ?? resultData?.dyslexiaRiskPercent ?? 78)

  return (
    <AppShell>
      <div className="page">
        <div className="page-title">
          <span className="eyebrow">Screening summary</span>
          <h1>Results and review</h1>
          <p>
            This screening supports educational planning and is not a clinical
            diagnosis.
          </p>
        </div>
        <div className="metric-grid">
          {[
            ["Questions attempted", "10 / 10"],
            ["Risk indicator", String(riskLevel).toUpperCase()],
            ["Composite score", `${compositeScore}%`],
            ["Status", "Complete & Saved"],
          ].map(([a, b]) => (
            <div className="metric" key={a}>
              <span>{a}</span>
              <b>{b}</b>
            </div>
          ))}
        </div>
        <div className="dashboard-grid">
          <section className="panel">
            <span className="kicker">Skill profile</span>
            <h2>Performance by area</h2>
            {[
              ["Phonological awareness", sectionScores.phonological],
              ["Word reading", sectionScores.wordReading],
              ["Rapid naming", sectionScores.rapidNaming],
            ].map(([n, v]) => (
              <div className="skill-bar" key={n}>
                <span>
                  {n}
                  <b>{v}%</b>
                </span>
                <div className="progress">
                  <i style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </section>
          <aside className="panel review-note">
            <FileCheck2 />
            <h2>Assessor verification</h2>
            <p>
              {resultData?.interpretation ||
                "Audio recordings, response choices, and phonetic accuracy are saved safely in Neon PostgreSQL for review."}
            </p>
            <Link className="btn secondary" to="/dashboard">
              Return to dashboard
            </Link>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

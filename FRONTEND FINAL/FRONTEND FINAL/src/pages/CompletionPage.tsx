import { Check, Database, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"

export function CompletionPage() {
  return (
    <AppShell>
      <div className="page" style={{ display: "grid", placeItems: "center", minHeight: "75vh" }}>
        <div className="completion glass-card" style={{ maxWidth: "680px", width: "100%", padding: "50px 30px" }}>
          <span>
            <Check size={36} />
          </span>
          <div style={{ margin: "24px 0 16px" }}>
            <span className="eyebrow" style={{ marginBottom: "12px" }}>
              <Sparkles size={14} /> Screening Completed
            </span>
            <h1 style={{ fontSize: "2.4rem", margin: "10px 0" }}>Assessment Complete!</h1>
          </div>
          <p style={{ color: "var(--mut)", fontSize: "1.05rem", lineHeight: 1.6, maxWidth: "500px", margin: "0 auto 28px" }}>
            You demonstrated great focus. Your responses, speech recordings, and phonetic accuracy scores have been safely saved to Neon PostgreSQL for educational evaluation.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "999px",
              background: "rgba(43, 212, 190, 0.08)",
              border: "1px solid rgba(43, 212, 190, 0.25)",
              color: "var(--teal)",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "32px",
            }}
          >
            <Database size={15} /> All 10 Activity Records Synced to Cloud Database
          </div>

          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn primary" to="/results">
              View Screening Results &rarr;
            </Link>
            <Link className="btn secondary" to="/dashboard">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

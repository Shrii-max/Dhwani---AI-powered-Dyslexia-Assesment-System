import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleUserRound,
  FileCheck2,
  FolderGit2,
  LineChart,
  Mic,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Volume2,
  Waves,
} from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"
import { speak } from "../utils/speech"

export function SimplePage({ type }: { type: string }) {
  const pageMeta: Record<
    string,
    { eyebrow: string; title: string; desc: string; icon: any }
  > = {
    learning: {
      eyebrow: "Adaptive Phonics Curriculum",
      title: "Personalized Learning Pathway",
      desc: "Tailored multi-sensory activities targeting phoneme awareness, letter-sound association, and sight-word fluency.",
      icon: Sparkles,
    },
    practice: {
      eyebrow: "Sound Confidence Gym",
      title: "Interactive Practice Sessions",
      desc: "Short, engaging, untimed exercises combining auditory feedback and visual cues to strengthen decoding skills.",
      icon: Waves,
    },
    progress: {
      eyebrow: "Longitudinal Analytics",
      title: "Progress & Growth Tracking",
      desc: "Monitor sound recognition speed, accuracy improvements, and phonological milestones without pressure or competitive scoring.",
      icon: LineChart,
    },
    profile: {
      eyebrow: "Learner & Assessor Settings",
      title: "Profile & Accessibility Preferences",
      desc: "Configure text magnification, speech rate, dyslexia-friendly fonts, and consent settings for speech data recording.",
      icon: Settings,
    },
    students: {
      eyebrow: "Assessor Console",
      title: "Learner Cohort & Screening Status",
      desc: "Review screening progress, pending audio submissions, and generated dyslexia risk profiles across your student roster.",
      icon: Users,
    },
    review: {
      eyebrow: "Speech AI Verification",
      title: "Audio Response Quality Review",
      desc: "Inspect recorded student audio waveforms alongside Azure Speech AI phonetic transcripts and assessor override controls.",
      icon: Mic,
    },
    report: {
      eyebrow: "Educational Documentation",
      title: "Comprehensive Screening Report",
      desc: "Export verified PDF summaries of phonological subskills and individualized classroom accommodation recommendations.",
      icon: FileCheck2,
    },
  }

  const current = pageMeta[type] || {
    eyebrow: "Assessor Workspace",
    title: "Assessor Command Dashboard",
    desc: "Oversee screening sessions, student cohorts, and verify automated phonetic evaluations.",
    icon: Sparkles,
  }

  const PageIcon = current.icon

  return (
    <AppShell>
      <div className="page simple-page">
        <div className="page-title">
          <span className="eyebrow">
            <PageIcon size={14} /> {current.eyebrow}
          </span>
          <h1>{current.title}</h1>
          <p>{current.desc}</p>
        </div>

        {/* Dynamic Contextual Modules Based on Route */}
        {type === "learning" && (
          <div style={{ display: "grid", gap: "22px" }}>
            <div className="panel glass-card">
              <span className="kicker">Weekly Phonics Roadmap</span>
              <h2 style={{ fontSize: "1.4rem", margin: "10px 0 20px" }}>Active Phonics Focus Modules</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {[
                  { step: "Week 1", title: "Phoneme Isolation", desc: "Isolating beginning /s/, /m/, /t/ in spoken words", status: "Active", progress: 85 },
                  { step: "Week 2", title: "Blending & Segmenting", desc: "Blending 3-sound sequences (/c/ • /a/ • /t/)", status: "Next", progress: 40 },
                  { step: "Week 3", title: "Sound Substitution", desc: "Swapping initial phonemes (mat -> cat)", status: "Queued", progress: 0 },
                ].map((item) => (
                  <div key={item.step} style={{ padding: "18px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span className="dh-tag" style={{ fontSize: "11px", padding: "3px 10px" }}>{item.step}</span>
                      <span style={{ fontSize: "12px", color: item.status === "Active" ? "var(--teal)" : "var(--mut)", fontWeight: 700 }}>{item.status}</span>
                    </div>
                    <b style={{ color: "#fff", display: "block", fontSize: "1.05rem" }}>{item.title}</b>
                    <p style={{ color: "var(--mut)", fontSize: "13px", margin: "6px 0 14px" }}>{item.desc}</p>
                    <div className="progress" style={{ height: "6px" }}><i style={{ width: `${item.progress}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <Link to="/assessments" className="btn primary">
                Take Assessment Activities <ArrowRight size={17} />
              </Link>
              <Link to="/practice" className="btn secondary">
                Launch Interactive Practice
              </Link>
            </div>
          </div>
        )}

        {type === "practice" && (
          <div style={{ display: "grid", gap: "22px" }}>
            <div className="panel glass-card">
              <span className="kicker">Multi-Sensory Audio Gym</span>
              <h2 style={{ fontSize: "1.4rem", margin: "10px 0 20px" }}>Choose a Phonics Workout</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                {[
                  { title: "Sound Identifier", word: "sun", sound: "/s/", icon: "☀️", desc: "Tap picture and speak the beginning sound aloud" },
                  { title: "Phoneme Blender", word: "cat", sound: "/c/ • /a/ • /t/", icon: "🐱", desc: "Listen to separated phonemes and combine them" },
                  { title: "Word Transformer", word: "mat ➔ cat", sound: "/m/ ➔ /c/", icon: "🔄", desc: "Substitute initial consonants to build new words" },
                ].map((item) => (
                  <div key={item.title} style={{ padding: "22px", borderRadius: "18px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.09)", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ fontSize: "2.4rem" }}>{item.icon}</span>
                    <b style={{ fontSize: "1.15rem", color: "#fff" }}>{item.title}</b>
                    <span style={{ color: "var(--teal)", fontWeight: 700, fontFamily: "monospace" }}>{item.sound}</span>
                    <p style={{ color: "var(--mut)", fontSize: "13px", margin: "4px 0 12px" }}>{item.desc}</p>
                    <button onClick={() => speak(item.word)} className="btn secondary small" style={{ width: "fit-content" }}>
                      <Volume2 size={16} /> Play Audio Model
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === "profile" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "22px" }}>
            <div className="panel glass-card">
              <span className="kicker">Accessibility Tuning</span>
              <h2 style={{ fontSize: "1.3rem", margin: "10px 0 16px" }}>Dyslexia Reader Settings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ color: "#fff", display: "block" }}>Lexend Reading Font</b>
                    <small style={{ color: "var(--mut)" }}>Optimized character spacing &amp; distinct shapes</small>
                  </div>
                  <span className="dh-tag">Enabled</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ color: "#fff", display: "block" }}>Speech Playback Rate</b>
                    <small style={{ color: "var(--mut)" }}>0.6x calm pacing for phoneme articulation</small>
                  </div>
                  <span className="dh-tag">Calm (0.6x)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b style={{ color: "#fff", display: "block" }}>High Contrast Neon Mode</b>
                    <small style={{ color: "var(--mut)" }}>Deep black canvas with glowing accents</small>
                  </div>
                  <span className="dh-tag">Active</span>
                </div>
              </div>
            </div>

            <div className="panel glass-card">
              <span className="kicker">Data &amp; Privacy</span>
              <h2 style={{ fontSize: "1.3rem", margin: "10px 0 16px" }}>Consent &amp; Security</h2>
              <p style={{ color: "var(--mut)", fontSize: "14px", lineHeight: 1.6 }}>
                Dhwani encrypts all student voice captures. Audio files are retained only for educational assessment review and parental access in compliance with child privacy guidelines.
              </p>
              <div style={{ marginTop: "18px", padding: "12px 16px", borderRadius: "12px", background: "rgba(43, 212, 190, 0.08)", border: "1px solid rgba(43, 212, 190, 0.25)", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={18} style={{ color: "var(--teal)" }} />
                <span style={{ color: "var(--teal)", fontSize: "13px", fontWeight: 600 }}>Parental consent verified • Neon DB active</span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Empty State for Other Modules */}
        {!["learning", "practice", "profile"].includes(type) && (
          <div className="empty-state glass-card">
            <Sparkles size={40} />
            <h2>{current.title} is Ready</h2>
            <p>
              All data connections, screening routes, and speech evaluation services are operational.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link className="btn primary" to="/assessments">
                Go to Assessments <ArrowRight size={16} />
              </Link>
              <Link className="btn secondary" to="/dashboard">
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

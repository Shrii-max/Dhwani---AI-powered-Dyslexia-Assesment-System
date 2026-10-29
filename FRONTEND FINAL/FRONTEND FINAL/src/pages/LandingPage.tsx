import {
  ArrowRight,
  Check,
  Clock3,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react"
import { Link } from "react-router-dom"
import { AppShell } from "../components/layout/AppShell"

export function LandingPage() {
  return (
    <AppShell>
      <div className="landing">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} /> Learning that listens
            </span>
            <h1>Every sound tells a story.</h1>
            <p>
              Dhwani helps educators understand how each learner hears, blends,
              and reads words—through calm, child-friendly screening.
            </p>
            <div className="button-row">
              <Link to="/signup" className="btn primary">
                Begin screening <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn secondary">
                Sign in
              </Link>
            </div>
            <div className="trust-row">
              <span>
                <ShieldCheck /> Private by design
              </span>
              <span>
                <Clock3 /> 20 minute screening
              </span>
              <span>
                <FileCheck2 /> Assessor verified
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="sound-card">
              <div className="sound-icon">
                <Waves />
              </div>
              <span>Listen to the sounds</span>
              <strong>/c/ &nbsp; /a/ &nbsp; /t/</strong>
              <div className="mini-wave">
                {[12, 22, 34, 20, 42, 30, 18, 38, 24, 14].map((h, i) => (
                  <i key={i} style={{ height: h }} />
                ))}
              </div>
            </div>
            <div className="floating-card progress-float">
              <Check size={16} /> Progress saved
            </div>
            <div className="floating-card care-float">
              <Sparkles size={16} /> Take your time
            </div>
          </div>
        </section>
        <section className="feature-strip">
          <div>
            <b>10</b>
            <span>evidence-informed activities</span>
          </div>
          <div>
            <b>3</b>
            <span>skill areas explored</span>
          </div>
          <div>
            <b>1</b>
            <span>personal learning path</span>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

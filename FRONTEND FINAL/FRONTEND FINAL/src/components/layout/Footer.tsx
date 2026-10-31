import { ShieldCheck, Sparkles } from "lucide-react"

export function Footer() {
  return (
    <footer className="dh-foot-global">
      <div className="dh-foot-content">
        <span className="dh-logo-inline">
          <i /> Dhwani AI
        </span>
        <span className="dh-foot-tag">
          <ShieldCheck size={15} /> Private, child-friendly &amp; non-diagnostic screening
        </span>
        <span className="dh-foot-copy">
          &copy; {new Date().getFullYear()} Dhwani. Powered by Speech AI &amp; Neon DB.
        </span>
      </div>
    </footer>
  )
}

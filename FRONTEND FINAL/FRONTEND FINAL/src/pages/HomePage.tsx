import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import "./home.css"

// Connected auth & screening routes
const ROUTES = { start: "/assessments", login: "/login", register: "/signup" }

/* ---------- 3D particle sphere (canvas, no dependencies) ---------- */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext("2d")!
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const N = window.innerWidth < 700 ? 450 : 1000
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996
      return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, h: i % 3 }
    })
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    let w = 0, h = 0, rot = 0, raf = 0
    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      w = c.clientWidth; h = c.clientHeight
      c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    const move = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }
    const cols = ["185,168,242", "43,181,166", "143,211,244"]
    const draw = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05
      if (!reduce) rot += 0.0035
      ctx.clearRect(0, 0, w, h)
      const R = Math.min(w, h) * 0.36, cx = w * (w > 800 ? 0.68 : 0.5), cy = h * (w > 800 ? 0.5 : 0.62)
      const ay = rot + mouse.x * 0.8, ax = mouse.y * 0.5
      const cyA = Math.cos(ay), syA = Math.sin(ay), cxA = Math.cos(ax), sxA = Math.sin(ax)
      for (const p of pts) {
        const pulse = 1 + Math.sin(t * 0.0012 + p.y * 4) * 0.06
        let x = p.x * cyA - p.z * syA, z = p.x * syA + p.z * cyA, y = p.y
        const y2 = y * cxA - z * sxA; z = y * sxA + z * cxA
        const s = 1 / (1.8 - z * 0.6), px = cx + x * R * pulse * s * 1.6, py = cy + y2 * R * pulse * s * 1.6
        const a = 0.15 + (z + 1) * 0.4
        ctx.fillStyle = `rgba(${cols[p.h]},${a})`
        ctx.beginPath(); ctx.arc(px, py, (z + 1.4) * 1.1, 0, 6.283); ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    resize(); raf = requestAnimationFrame(draw)
    window.addEventListener("resize", resize); window.addEventListener("pointermove", move)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", move) }
  }, [])
  return <canvas ref={ref} className="dh-canvas" aria-hidden="true" />
}

function speak(text: string, rate = 0.6) {
  if (!("speechSynthesis" in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text); u.rate = rate; speechSynthesis.speak(u)
}

const words = [
  { e: "🐱", w: "cat", s: ["k", "a", "t"] },
  { e: "🐟", w: "fish", s: ["f", "i", "sh"] },
  { e: "🐸", w: "frog", s: ["f", "r", "o", "g"] },
  { e: "☀️", w: "sun", s: ["s", "u", "n"] },
]

export function HomePage() {
  const root = useRef<HTMLDivElement>(null)
  const [wobble, setWobble] = useState(true)
  const [wi, setWi] = useState(0)
  const [lit, setLit] = useState(-1)
  const cur = words[wi]

  // scroll reveal + scroll progress + parallax glow
  useEffect(() => {
    const el = root.current!
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.15 }
    )
    el.querySelectorAll("[data-r]").forEach((n) => io.observe(n))
    const bar = el.querySelector<HTMLElement>(".dh-bar")!
    const onScroll = () => {
      const m = document.documentElement.scrollHeight - window.innerHeight
      bar.style.transform = `scaleX(${m > 0 ? window.scrollY / m : 0})`
      el.style.setProperty("--sy", String(window.scrollY))
    }
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true })
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll) }
  }, [])

  const play = () => {
    cur.s.forEach((s, i) => setTimeout(() => { setLit(i); speak(s, 0.5) }, i * 900))
    setTimeout(() => { setLit(-1); speak(cur.w, 0.8) }, cur.s.length * 900)
  }

  return (
    <div className="dh" ref={root}>
      <div className="dh-bar" />
      <header className="dh-nav">
        <Link to="/" className="dh-logo"><i />Dhwani</Link>
        <nav>
          <a href="#understand">Dyslexia</a><a href="#sounds">Sounds</a>
          <a href="#pictures">Pictures</a><a href="#how">How it helps</a>
        </nav>
        <Link to={ROUTES.login} className="dh-btn ghost">Sign in</Link>
      </header>

      <section className="dh-hero">
        <Particles />
        <div className="dh-hero-in">
          <span className="dh-tag" data-r>AI-powered dyslexia screening &amp; learning</span>
          <h1>
            {["Every", "Mind", "Learns", "Differently"].map((w, i) => (
              <span key={w} className="dh-word" style={{ animationDelay: `${0.2 + i * 0.18}s` }}>
                <b className={i > 1 ? "glow" : ""}>{w}</b>{" "}
              </span>
            ))}
          </h1>
          <p data-r>Dhwani listens, spots early signs of dyslexia, and turns sounds and pictures into a joyful path to confident reading.</p>
          <div className="dh-cta" data-r>
            <Link to={ROUTES.start} className="dh-btn primary">Begin screening</Link>
            <a href="#understand" className="dh-btn ghost">Explore ↓</a>
          </div>
        </div>
        <div className="dh-scroll" aria-hidden="true"><span /></div>
      </section>

      <section className="dh-sec" id="understand">
        <h2 data-r>Understanding <em>dyslexia</em></h2>
        <p className="dh-sub" data-r>It’s not about intelligence. It’s how the brain links letters to sounds.</p>
        <div className="dh-grid">
          {[
            ["🧠", "A different wiring", "About 1 in 10 people read differently. It runs in families and lasts for life."],
            ["💡", "Bright minds", "Many dyslexic learners are creative, curious, big-picture thinkers."],
            ["🌱", "Early help works", "Spotting it early and practising little and often changes everything."],
          ].map(([e, t, d], i) => (
            <article className="dh-card" data-r style={{ transitionDelay: `${i * 0.12}s` }} key={t}>
              <div className="dh-orb">{e}</div><h3>{t}</h3><p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dh-sec dh-split" id="challenges">
        <div data-r>
          <span className="dh-tag">Reading challenges</span>
          <h2>When letters <em>wobble</em></h2>
          <p className="dh-sub left">Letters can flip, swap or blur. Tap to see how a word might feel.</p>
          <button className="dh-btn primary" onClick={() => setWobble(!wobble)} aria-pressed={wobble}>
            {wobble ? "Show clear text" : "Show how it can look"}
          </button>
          <ul className="dh-list">
            <li>b ↔ d and p ↔ q look alike</li><li>Reading feels slow and tiring</li><li>Spelling and rhyming are tricky</li>
          </ul>
        </div>
        <div className="dh-screen" data-r aria-live="polite">
          <div className={`dh-wob ${wobble ? "on" : ""}`}>
            {"big dog played".split("").map((ch, i) => (
              <span key={i} style={{ animationDelay: `${(i % 5) * 0.15}s` }}>{ch === " " ? "\u00A0" : ch}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="dh-sec" id="sounds">
        <span className="dh-tag" data-r>Phonological awareness</span>
        <h2 data-r>Hear the <em>sounds</em> inside words</h2>
        <p className="dh-sub" data-r>Every word is made of tiny sounds. Pick a picture and listen.</p>
        <div className="dh-demo" data-r>
          <div className="dh-picks">
            {words.map((w, i) => (
              <button key={w.w} className={i === wi ? "on" : ""} aria-label={w.w} onClick={() => { setWi(i); setLit(-1) }}>{w.e}</button>
            ))}
          </div>
          <div className="dh-chips">
            {cur.s.map((s, i) => <span key={s + i} className={i === lit ? "lit" : ""}>{s}</span>)}
          </div>
          <div className={`dh-wave ${lit >= 0 ? "go" : ""}`} aria-hidden="true">{Array.from({ length: 21 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.06}s` }} />)}</div>
          <button className="dh-btn primary" onClick={play}>🔊 Play sounds</button>
        </div>
      </section>

      <section className="dh-sec" id="pictures">
        <span className="dh-tag" data-r>Picture-based learning</span>
        <h2 data-r>Pictures make <em>words</em> stick</h2>
        <div className="dh-tiles">
          {words.concat([{ e: "🌈", w: "rainbow", s: [] }, { e: "🦉", w: "owl", s: [] }]).map((w, i) => (
            <div className="dh-tile" data-r style={{ transitionDelay: `${i * 0.08}s` }} key={w.w} tabIndex={0} onClick={() => speak(w.w, 0.8)}>
              <span>{w.e}</span><b>{w.w}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="dh-sec" id="how">
        <h2 data-r>How Dhwani <em>helps</em></h2>
        <div className="dh-steps">
          {[["01", "Listen", "Short AI-guided activities capture how your child hears sounds."],
            ["02", "Spot", "Dhwani highlights early signs across phonics, reading and naming."],
            ["03", "Learn", "A personal picture-and-sound path adapts to every child."],
            ["04", "Grow", "Parents and teachers see progress and celebrate wins."]].map(([n, t, d], i) => (
            <div className="dh-step" data-r style={{ transitionDelay: `${i * 0.12}s` }} key={n}>
              <span>{n}</span><h3>{t}</h3><p>{d}</p>
            </div>
          ))}
        </div>
        <p className="dh-note" data-r>For children, parents and educators alike. Screening is a learning aid, not a medical diagnosis.</p>
      </section>

      <section className="dh-final" data-r>
        <h2>Ready to hear the <em>difference?</em></h2>
        <Link to={ROUTES.start} className="dh-btn primary big">Start free screening</Link>
      </section>
      <footer className="dh-foot"><span className="dh-logo"><i />Dhwani</span><span>© {new Date().getFullYear()} Dhwani</span></footer>
    </div>
  )
}

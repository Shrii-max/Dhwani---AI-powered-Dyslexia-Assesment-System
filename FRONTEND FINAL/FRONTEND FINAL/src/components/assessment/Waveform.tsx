export function Waveform({ active = false }: { active?: boolean }) {
  return (
    <div className={`waveform ${active ? "active" : ""}`}>
      {Array.from({ length: 42 }, (_, i) => (
        <i key={i} style={{ height: `${12 + ((i * 17) % 34)}px` }} />
      ))}
    </div>
  )
}

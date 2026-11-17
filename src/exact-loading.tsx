import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import KiloThermalDial from './KiloThermalDial'

function LoadingDial({ label }: { label: string }) {
  const [value, setValue] = useState(0)
  useEffect(() => { const start = performance.now(); const timer = setInterval(() => setValue(Math.min(100, Math.round((performance.now() - start) / 8))), 24); return () => clearInterval(timer) }, [])
  return <div role="status" aria-label={label} style={{ display: 'grid', justifyItems: 'center', gap: 18 }}><KiloThermalDial value={value} min={0} max={100} size={300} theme="light" hint={false} unit="%" /><p style={{ font: '500 16px system-ui', color: '#51647f' }}>{label}</p></div>
}

export function showLoadingDial(label: string) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#f4f7ff'
  document.body.append(overlay)
  const root = createRoot(overlay); root.render(<LoadingDial label={label} />)
  return new Promise<void>(resolve => setTimeout(() => { root.unmount(); overlay.remove(); resolve() }, 950))
}

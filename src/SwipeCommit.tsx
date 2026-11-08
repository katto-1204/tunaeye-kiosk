import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'

type SwipeCommitProps = {
  label: string
  onCommit: () => void
}

export function SwipeCommit({ label, onCommit }: SwipeCommitProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const flight = useRef(0)
  const x = useMotionValue(0)
  const reduced = useReducedMotion()
  const [max, setMax] = useState(0)
  const fill = useTransform(x, [0, max || 1], [0, 1])

  const measure = () => {
    const track = trackRef.current
    const knob = knobRef.current
    if (!track || !knob) return 0
    return Math.max(0, track.clientWidth - knob.offsetWidth - 8)
  }

  useLayoutEffect(() => {
    const update = () => setMax(measure())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const finish = (info: PanInfo) => {
    const travel = measure()
    const passed = info.offset.x > travel * 0.45 || info.velocity.x > 800
    const id = ++flight.current
    const release = passed
      ? reduced
        ? { duration: 0.12, ease: 'easeOut' as const }
        : { type: 'spring' as const, velocity: info.velocity.x, stiffness: 420, damping: 28, bounce: 0.18 }
      : reduced
        ? { duration: 0.12, ease: 'easeOut' as const }
        : { type: 'spring' as const, velocity: info.velocity.x, stiffness: 700, damping: 42, bounce: 0 }
    const controls = animate(x, passed ? travel : 0, release)
    controls.then(() => {
      if (flight.current !== id || !passed) return
      onCommit()
    }).catch(() => {})
  }

  return (
    <div ref={trackRef} className="swipe-commit" style={{ touchAction: 'pan-y' }}>
      <motion.span className="swipe-commit__fill" style={{ scaleX: fill }} />
      <span className="swipe-commit__label">{label}</span>
      <motion.div
        ref={knobRef}
        className="swipe-commit__knob"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.2}
        dragMomentum={false}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onDragStart={() => { flight.current += 1 }}
        onDragEnd={(_, info) => finish(info)}
        onKeyDown={event => {
          if (event.key !== 'ArrowRight' && event.key !== 'Enter') return
          event.preventDefault()
          finish({ offset: { x: measure(), y: 0 }, velocity: { x: 0, y: 0 }, point: { x: 0, y: 0 }, delta: { x: 0, y: 0 } })
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>
      </motion.div>
    </div>
  )
}

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState, ReactNode } from 'react'

interface FadeInProps {
  children: ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'left' | 'right' | 'none'
}

export function FadeIn({ children, delay = 0, className = '', direction = 'up' }: FadeInProps) {
  const initial =
    direction === 'up'    ? { opacity: 0, y: 30 } :
    direction === 'left'  ? { opacity: 0, x: -30 } :
    direction === 'right' ? { opacity: 0, x: 30 } :
                            { opacity: 0 }

  const animate =
    direction === 'up'    ? { opacity: 1, y: 0 } :
    direction === 'left'  ? { opacity: 1, x: 0 } :
    direction === 'right' ? { opacity: 1, x: 0 } :
                            { opacity: 1 }

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

interface CountUpProps {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export function CountUp({ end, suffix = '', prefix = '', duration = 2000, className = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(ease * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, end, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{value}{suffix}
    </span>
  )
}

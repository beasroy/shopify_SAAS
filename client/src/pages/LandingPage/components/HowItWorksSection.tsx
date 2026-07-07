import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { FadeIn } from './AnimationHelpers'
import { Plug, Layers, Zap } from 'lucide-react'

const STEPS = [
  { number: '01', icon: Plug, title: 'Connect', desc: 'Link Meta Ads, Google Ads, GA4, and Shopify in minutes with secure OAuth — no engineers needed.', color: 'indigo' },
  { number: '02', icon: Layers, title: 'Unify', desc: 'Parallels normalizes your data into a single model. No manual exports, no mismatched attribution.', color: 'cyan' },
  { number: '03', icon: Zap, title: 'Act', desc: 'Get actionable insights, automated alerts, and shareable reports — always up to date.', color: 'emerald' },
]

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  indigo:  { bg: 'bg-indigo-600',  text: 'text-indigo-600',  ring: 'ring-indigo-200' },
  cyan:    { bg: 'bg-cyan-600',    text: 'text-cyan-600',    ring: 'ring-cyan-200' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', ring: 'ring-emerald-200' },
}

export default function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true })

  return (
    <section className="section-pad bg-white" id="how-it-works">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">How It Works</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">From scattered data to{' '}<span className="gradient-text">clear decisions</span></h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">Up and running in under 10 minutes.</p>
        </FadeIn>
        <div ref={containerRef} className="relative">
          <div className="hidden lg:block absolute top-12 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-px">
            <svg className="w-full h-8 overflow-visible" preserveAspectRatio="none">
              <motion.path d="M0,4 Q50%,4 100%,4" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={isInView ? { pathLength: 1, opacity: 1 } : {}} transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }} />
            </svg>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const c = COLOR_MAP[step.color]
              return (
                <motion.div key={step.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }} className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 ${c.bg} rounded-2xl flex items-center justify-center mb-5 shadow-lg ring-4 ${c.ring}`}><Icon size={28} className="text-white" /></div>
                  <div className={`text-xs font-bold ${c.text} uppercase tracking-widest mb-2`}>Step {step.number}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{step.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

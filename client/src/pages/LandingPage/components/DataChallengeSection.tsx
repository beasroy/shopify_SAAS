import { motion } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import { XCircle, CheckCircle2, ArrowDown, Zap } from 'lucide-react'

const PAINS = [
  {
    platform: 'Meta Ads Manager',
    color: '#1877f2',
    letter: 'M',
    stat: 'Reports 847 conversions',
    reality: 'Shopify shows 412 actual orders',
    type: 'mismatch',
  },
  {
    platform: 'Google Ads',
    color: '#4285f4',
    letter: 'G',
    stat: 'Claims 3.2x ROAS',
    reality: 'Blended reality: 2.1x after overlap',
    type: 'overlap',
  },
  {
    platform: 'GA4 Analytics',
    color: '#e37400',
    letter: 'A',
    stat: '12,400 sessions tracked',
    reality: '38% attribution gap vs ad platforms',
    type: 'gap',
  },
  {
    platform: 'Shopify Revenue',
    color: '#96bf48',
    letter: 'S',
    stat: '$148k total revenue',
    reality: 'No link to which ads drove it',
    type: 'unlinked',
  },
]

const BADGE_STYLE: Record<string, string> = {
  mismatch: 'bg-rose-950/60 text-rose-400 border-rose-800/50',
  overlap:  'bg-amber-950/60 text-amber-400 border-amber-800/50',
  gap:      'bg-orange-950/60 text-orange-400 border-orange-800/50',
  unlinked: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

const SOLUTIONS = [
  'One blended ROAS across every channel',
  'Shopify revenue linked to actual campaigns',
  'Deduped conversions — no more double-counting',
  'Attribution that matches your bank account',
  'Automated alerts when ROAS drops below target',
  'Board-ready reports in one click',
]

export default function DataChallengeSection() {
  return (
    <section className="relative bg-[#07071a] overflow-hidden py-28" id="problem">
      {/* Subtle grid */}
      <div className="absolute inset-0 dot-grid-dark opacity-40 pointer-events-none" />
      {/* Divider from hero */}
      <div className="absolute top-0 inset-x-0 glow-line" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Heading */}
        <FadeIn className="text-center mb-16 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold text-rose-400 uppercase tracking-widest mb-4 border border-rose-900/60 bg-rose-950/40 px-3 py-1 rounded-full">
            The Problem
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-5 leading-tight">
            Your ad platforms are{' '}
            <span className="text-rose-400">lying to you.</span>
          </h2>
          <p className="text-lg text-white/45 leading-relaxed">
            Every platform inflates its own numbers. Without a neutral source of truth, you're making six-figure budget decisions on data that can't be trusted.
          </p>
        </FadeIn>

        {/* Pain cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {PAINS.map((p, i) => (
            <motion.div
              key={p.platform}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative bg-white/[0.03] border border-white/8 rounded-2xl p-5 overflow-hidden"
            >
              {/* Platform header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                  style={{ backgroundColor: p.color }}>
                  {p.letter}
                </div>
                <p className="text-xs font-semibold text-white/70">{p.platform}</p>
              </div>

              {/* What the platform claims */}
              <div className="mb-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[8px] text-white/40 font-bold">!</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium">{p.stat}</p>
                </div>
              </div>

              {/* The reality */}
              <div className={`rounded-xl border px-3 py-2.5 ${BADGE_STYLE[p.type]}`}>
                <div className="flex items-start gap-1.5">
                  <XCircle size={11} className="shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold leading-snug">{p.reality}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stat callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
          {[
            { stat: '11 hrs', label: 'wasted per week', sub: 'manually reconciling data across platforms' },
            { stat: '30–40%', label: 'conversion overcount', sub: 'when summing platform-reported numbers' },
            { stat: '$0 insight', label: 'from Shopify alone', sub: 'revenue without knowing which ad drove it' },
          ].map((s, i) => (
            <motion.div
              key={s.stat}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="bg-white/[0.03] border border-white/8 rounded-2xl px-6 py-5 text-center"
            >
              <p className="text-4xl font-black text-white mb-1">{s.stat}</p>
              <p className="text-sm font-semibold text-rose-400 mb-1">{s.label}</p>
              <p className="text-xs text-white/35 leading-snug">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Arrow */}
        <FadeIn className="flex justify-center mb-14">
          <div className="flex flex-col items-center gap-3">
            <div className="w-px h-10 bg-gradient-to-b from-transparent to-indigo-500" />
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/40">
              <ArrowDown size={18} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-white/40">Parallels fixes this</p>
            <div className="w-px h-10 bg-gradient-to-b from-indigo-500 to-transparent" />
          </div>
        </FadeIn>

        {/* Solution card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative max-w-3xl mx-auto"
        >
          {/* Glow */}
          <div className="absolute -inset-4 bg-indigo-600/15 rounded-3xl blur-2xl" />
          <div className="relative bg-gradient-to-br from-indigo-950/80 via-slate-900/80 to-cyan-950/60 border border-indigo-500/25 rounded-3xl p-8 lg:p-10 overflow-hidden">
            {/* Corner glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <p className="text-base font-extrabold text-white">Parallels</p>
                <p className="text-xs text-indigo-300">Unified marketing intelligence</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live sync
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOLUTIONS.map((sol, i) => (
                <motion.div
                  key={sol}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="flex items-center gap-2.5 text-sm text-white/75"
                >
                  <CheckCircle2 size={15} className="text-indigo-400 shrink-0" />
                  {sol}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

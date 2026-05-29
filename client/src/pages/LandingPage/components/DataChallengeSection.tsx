import { motion } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import { XCircle, CheckCircle2, ArrowRight, Zap } from 'lucide-react'

const PAINS = [
  {
    platform: 'Meta Ads Manager',
    color: '#1877f2',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    letter: 'M',
    claim: 'Reports 847 conversions',
    gap: 'Shopify shows only 412 actual orders',
    gapColor: 'text-rose-600',
    gapBg: 'bg-rose-50 border-rose-100',
  },
  {
    platform: 'Google Ads',
    color: '#4285f4',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    letter: 'G',
    claim: 'Claims 3.2x ROAS',
    gap: 'Blended reality is 2.1x after channel overlap',
    gapColor: 'text-amber-700',
    gapBg: 'bg-amber-50 border-amber-100',
  },
  {
    platform: 'GA4 Analytics',
    color: '#e37400',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    letter: 'A',
    claim: '12,400 sessions tracked',
    gap: '38% attribution gap vs your ad platforms',
    gapColor: 'text-amber-700',
    gapBg: 'bg-amber-50 border-amber-100',
  },
  {
    platform: 'Shopify Revenue',
    color: '#96bf48',
    bg: 'bg-green-50',
    border: 'border-green-100',
    letter: 'S',
    claim: '$148k total revenue',
    gap: 'No link to which campaigns drove it',
    gapColor: 'text-slate-600',
    gapBg: 'bg-slate-100 border-slate-200',
  },
]

const SOLUTIONS = [
  'True blended ROAS — not platform-inflated numbers',
  'Shopify revenue linked to actual campaigns',
  'Deduped conversions, no double-counting',
  'Real-time alerts when ROAS drops',
]

export default function DataChallengeSection() {
  return (
    <section className="py-20 bg-white overflow-hidden" id="problem">
      <div className="max-w-6xl mx-auto px-6">

        {/* Heading */}
        <FadeIn className="text-center mb-12 max-w-2xl mx-auto">
          <span className="inline-block text-xs font-semibold text-rose-600 uppercase tracking-widest mb-3 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
            The Problem
          </span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
            Your ad platforms are
            {' '}<span className="text-rose-500">lying to you.</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Every platform inflates its own numbers. Without a neutral source of truth you're making six-figure budget decisions on data you can't trust.
          </p>
        </FadeIn>

        {/* Two-col layout: pain left, solution right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Left: pain cards ── */}
          <div className="space-y-3">
            {PAINS.map((p, i) => (
              <motion.div
                key={p.platform}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm"
              >
                {/* Platform logo */}
                <div className={`w-9 h-9 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center text-sm font-black shrink-0`}
                  style={{ color: p.color }}>
                  {p.letter}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-700">{p.platform}</p>
                    <span className="text-xs text-slate-400 font-medium shrink-0 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      {p.claim}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold border rounded-lg px-2.5 py-1.5 ${p.gapBg} ${p.gapColor}`}>
                    <XCircle size={11} className="shrink-0" />
                    {p.gap}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="grid grid-cols-3 gap-3 pt-1"
            >
              {[
                { n: '11 hrs', l: 'wasted weekly' },
                { n: '~35%', l: 'conversion overcount' },
                { n: '$0 insight', l: 'from Shopify alone' },
              ].map(s => (
                <div key={s.n} className="text-center bg-slate-50 border border-slate-100 rounded-xl py-3 px-2">
                  <p className="text-xl font-black text-slate-900">{s.n}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Right: solution ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute -inset-3 bg-indigo-50 rounded-3xl blur-xl -z-10"/>

            <div className="bg-gradient-to-br from-indigo-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200/50">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-base text-white">Parallels</p>
                  <p className="text-xs text-indigo-200">Unified marketing intelligence</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                  Live sync
                </div>
              </div>

              {/* Solution list */}
              <div className="space-y-3 mb-6">
                {SOLUTIONS.map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className="flex items-center gap-2.5 text-sm text-white/90"
                  >
                    <CheckCircle2 size={15} className="text-white shrink-0" />
                    {s}
                  </motion.div>
                ))}
              </div>

              {/* Mini metric preview */}
              <div className="bg-white/10 rounded-xl p-4 mb-5">
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mb-3">Live dashboard preview</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Blended ROAS', v: '4.8x', up: true },
                    { l: 'Revenue', v: '$148k', up: true },
                    { l: 'True CAC', v: '$19', up: false },
                  ].map(m => (
                    <div key={m.l} className="bg-white/10 rounded-lg p-2.5 text-center">
                      <p className="text-[9px] text-white/50 mb-1">{m.l}</p>
                      <p className="text-sm font-black text-white">{m.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <a href="#how-it-works"
                className="flex items-center justify-between bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-4 py-3 group cursor-pointer">
                <span className="text-sm font-semibold text-white">See how it works</span>
                <ArrowRight size={15} className="text-white group-hover:translate-x-0.5 transition-transform"/>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const BAR_DATA = [
  { label: 'Meta', value: 72, color: '#6366f1' },
  { label: 'Google', value: 55, color: '#06b6d4' },
  { label: 'Shopify', value: 88, color: '#10b981' },
  { label: 'GA4', value: 44, color: '#f59e0b' },
]

function DashboardMock() {
  return (
    <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }} className="relative">
      <div className="glass-card rounded-2xl p-5 w-full max-w-[480px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Parallels Overview</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">Last 30 days</p>
          </div>
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium flex items-center gap-1">
            <TrendingUp size={11} /> Live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'ROAS', value: '4.2x', delta: '+12%', up: true },
            { label: 'Revenue', value: '$128k', delta: '+24%', up: true },
            { label: 'CAC', value: '$18', delta: '-8%', up: false },
          ].map((m) => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">{m.label}</p>
              <p className="text-base font-bold text-slate-900">{m.value}</p>
              <p className={`text-xs font-medium flex items-center gap-0.5 mt-0.5 ${m.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {m.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{m.delta}
              </p>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-3">Revenue by Channel</p>
          <div className="flex items-end gap-3 h-24">
            {BAR_DATA.map((bar, i) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <motion.div className="w-full rounded-t-md" style={{ backgroundColor: bar.color, maxWidth: '40px' }} initial={{ height: 0 }} animate={{ height: `${bar.value}%` }} transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: 'easeOut' }} />
                </div>
                <span className="text-[10px] text-slate-500">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">ROAS Trend</p>
          <svg viewBox="0 0 200 40" className="w-full h-10" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path d="M0,32 C20,28 40,18 60,20 C80,22 100,10 120,8 C140,6 160,14 180,10 L200,8" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: 1, ease: 'easeOut' }} />
            <motion.path d="M0,32 C20,28 40,18 60,20 C80,22 100,10 120,8 C140,6 160,14 180,10 L200,8 L200,40 L0,40 Z" fill="url(#lineGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 1.1 }} />
          </svg>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4, duration: 0.4 }} className="absolute -top-3 -right-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />Syncing live
      </motion.div>
    </motion.div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden dot-grid-bg pt-16">
      <div className="orb-indigo -top-40 -left-40" />
      <div className="orb-cyan top-20 right-0" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />Now in Beta — Join 50+ D2C brands
            </span>
          </motion.div>
          <motion.h1 variants={item} className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Stop guessing.{' '}<span className="gradient-text">Start knowing.</span>
          </motion.h1>
          <motion.p variants={item} className="text-lg text-slate-600 leading-relaxed mb-8 max-w-md">
            Parallels unifies Meta Ads, Google Ads, GA4, and Shopify into one source of truth — so you see what actually drives revenue, not vanity metrics in siloed dashboards.
          </motion.p>
          <motion.div variants={item} className="flex flex-wrap items-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md shadow-indigo-200">Get Demo <ArrowRight size={16} /></Link>
            <Link to="/login" className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-colors bg-white">Sign In</Link>
          </motion.div>
          <motion.div variants={item} className="mt-8 flex items-center gap-6 text-sm text-slate-500">
            {['No credit card required', 'Free 14-day trial', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-400" />{t}</span>
            ))}
          </motion.div>
        </motion.div>
        <DashboardMock />
      </div>
    </section>
  )
}

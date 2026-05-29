
import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, Zap, BarChart2, Bell } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const CHANNELS = [
  { label: 'Meta', value: 78, color: '#6366f1', roas: '4.2x' },
  { label: 'Google', value: 58, color: '#06b6d4', roas: '3.8x' },
  { label: 'Shopify', value: 91, color: '#10b981', roas: '9.1x' },
  { label: 'Email', value: 44, color: '#f59e0b', roas: '2.4x' },
]

const ALERTS = [
  { icon: TrendingDown, text: 'Meta CPC up 18% — review bids', color: 'text-rose-500', bg: 'bg-rose-50' },
  { icon: TrendingUp, text: 'Google ROAS hit all-time high', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Zap, text: 'Weekly report ready to share', color: 'text-indigo-600', bg: 'bg-indigo-50' },
]

function DashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 48, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
      className="relative w-full max-w-[520px] mx-auto"
    >
      {/* Glow halo */}
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-indigo-200/60 via-cyan-100/40 to-transparent blur-3xl scale-110" />

      {/* Card with browser chrome */}
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-slate-200/60 bg-white">
        {/* Chrome bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              app.getparallels.io / dashboard
            </div>
          </div>
          <BarChart2 size={14} className="text-slate-400" />
        </div>

        {/* Dashboard body */}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Overview — Last 30 days</p>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5">$148,300 Revenue</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <TrendingUp size={11} /> +22% MoM
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: 'Blended ROAS', value: '4.8x', delta: '+12%', up: true },
              { label: 'Revenue', value: '$148k', delta: '+22%', up: true },
              { label: 'CAC', value: '$19', delta: '-9%', up: false },
              { label: 'MER', value: '5.1x', delta: '+0.8x', up: true },
            ].map((m) => (
              <div key={m.label} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <p className="text-[9px] text-slate-400 leading-tight mb-1">{m.label}</p>
                <p className="text-sm font-extrabold text-slate-900 leading-none">{m.value}</p>
                <p className={`text-[9px] font-semibold flex items-center gap-0.5 mt-1 ${m.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {m.up ? <TrendingUp size={8} /> : <TrendingDown size={8} />}{m.delta}
                </p>
              </div>
            ))}
          </div>

          {/* Channel bars */}
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-slate-500 mb-3">Revenue by Channel</p>
            <div className="space-y-2.5">
              {CHANNELS.map((ch, i) => (
                <div key={ch.label} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-10 shrink-0">{ch.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: ch.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ch.value}%` }}
                      transition={{ duration: 0.9, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: ch.color }}>{ch.roas}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sparkline */}
          <div className="border-t border-slate-100 pt-4 mb-4">
            <p className="text-[11px] font-semibold text-slate-500 mb-2">ROAS Trend — 8 weeks</p>
            <svg viewBox="0 0 280 48" className="w-full h-12" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0,38 C30,34 50,22 80,20 C110,18 130,10 160,8 C190,6 220,16 250,12 L280,6"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.4, delay: 0.9, ease: 'easeOut' }}
              />
              <motion.path
                d="M0,38 C30,34 50,22 80,20 C110,18 130,10 160,8 C190,6 220,16 250,12 L280,6 L280,48 L0,48 Z"
                fill="url(#sparkGrad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.4, delay: 1 }}
              />
            </svg>
          </div>

          {/* Alert feed */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Bell size={11} className="text-slate-400" />
              <p className="text-[10px] font-semibold text-slate-400">Smart Alerts</p>
            </div>
            {ALERTS.map((a, i) => {
              const AIcon = a.icon
              return (
                <motion.div
                  key={a.text}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.15 }}
                  className={`flex items-center gap-2 ${a.bg} rounded-lg px-3 py-2`}
                >
                  <AIcon size={11} className={a.color} />
                  <p className={`text-[10px] font-medium ${a.color}`}>{a.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating — Syncing live */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.4, ease: 'easeOut' }}
        className="absolute -top-4 -right-4 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xl text-xs font-semibold text-indigo-600 flex items-center gap-2"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
        Syncing live
      </motion.div>

      {/* Floating — insights badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.4, ease: 'easeOut' }}
        className="absolute -bottom-4 -left-4 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xl text-xs font-semibold text-slate-700 flex items-center gap-2"
      >
        <span className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">3</span>
        New insights today
      </motion.div>
    </motion.div>
  )
}

const INTEGRATIONS = ['Meta Ads', 'Google Ads', 'GA4', 'Shopify']
const INT_COLORS = ['#1877f2', '#4285f4', '#e37400', '#96bf48']

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden dot-grid-bg pt-16">
      {/* Orbs */}
      <div className="orb-indigo -top-56 -left-56 opacity-50" />
      <div className="orb-cyan top-10 right-0 opacity-40" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-50/40 rounded-full blur-3xl -z-10" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
        {/* Left copy */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7 shadow-sm">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              Now in Beta — Join 50+ D2C brands
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-5xl lg:text-[3.75rem] font-extrabold text-slate-900 leading-[1.08] tracking-tight mb-6"
          >
            Your marketing data,{' '}
            <span className="gradient-text">finally unified.</span>
          </motion.h1>

          <motion.p variants={item} className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
            Parallels connects Meta Ads, Google Ads, GA4, and Shopify into one live source of truth — so you see true ROAS, real CAC, and exactly which campaigns drive revenue.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap items-center gap-3 mb-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-200 text-sm"
            >
              Get Started Free <ArrowRight size={15} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 text-slate-700 font-semibold px-6 py-3.5 rounded-xl transition-colors bg-white text-sm shadow-sm"
            >
              Sign In
            </Link>
          </motion.div>

          <motion.div variants={item} className="flex flex-wrap items-center gap-5 text-xs text-slate-500 mb-10">
            {['No credit card required', '14-day free trial', 'Cancel anytime'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                {t}
              </span>
            ))}
          </motion.div>

          {/* Integration strip */}
          <motion.div variants={item} className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Connects with</span>
            {INTEGRATIONS.map((name, i) => (
              <div
                key={name}
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INT_COLORS[i] }} />
                {name}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right mock */}
        <DashboardMock />
      </div>
    </section>
  )
}



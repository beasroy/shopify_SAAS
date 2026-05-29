import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, Zap, BarChart2, Bell, Sparkles } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ─── Floating insight cards ─────────────────────────────────────── */
function InsightCard({
  children, className, delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={`absolute bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 ${className}`}
    >
      {children}
    </motion.div>
  )
}

/* ─── Wide dashboard mock ────────────────────────────────────────── */
const CHANNELS = [
  { label: 'Meta Ads', value: 82, color: '#6366f1', roas: '4.2x', spend: '$18.4k' },
  { label: 'Google', value: 65, color: '#06b6d4', roas: '3.8x', spend: '$12.1k' },
  { label: 'Shopify', value: 94, color: '#10b981', roas: '9.1x', spend: '$1.2k' },
  { label: 'Email', value: 48, color: '#f59e0b', roas: '2.4x', spend: '$0.9k' },
]

const WEEKS = [28, 42, 38, 55, 50, 68, 72, 65, 80, 88, 84, 96]

function DashboardMock() {
  const W = 520, H = 90
  const maxV = Math.max(...WEEKS)
  const pts = WEEKS.map((v, i) => `${(i / (WEEKS.length - 1)) * W},${H - (v / maxV) * H}`).join(' ')
  const area = `${pts} ${W},${H} 0,${H}`

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-indigo-100/40 bg-white w-full">
      {/* Browser chrome */}
      <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-1.5 text-[11px] text-slate-500 font-medium flex items-center gap-2 max-w-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            app.getparallels.io / dashboard
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-slate-400" />
          <Bell size={14} className="text-slate-400" />
        </div>
      </div>

      {/* Sidebar + main */}
      <div className="flex">
        {/* Mini sidebar */}
        <div className="w-14 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-4 gap-4 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">P</span>
          </div>
          {[BarChart2, TrendingUp, Sparkles, Bell].map((Icon, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-indigo-100' : ''}`}>
              <Icon size={14} className={i === 0 ? 'text-indigo-600' : 'text-slate-400'} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-5 min-w-0">
          {/* Top KPIs */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Blended ROAS', value: '4.8x', delta: '+12%', up: true, color: 'indigo' },
              { label: 'Revenue', value: '$148k', delta: '+22%', up: true, color: 'emerald' },
              { label: 'Total Spend', value: '$32.6k', delta: '+5%', up: true, color: 'cyan' },
              { label: 'CAC', value: '$19', delta: '-9%', up: false, color: 'rose' },
            ].map((m) => (
              <div key={m.label} className="bg-slate-50/80 border border-slate-100 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium">{m.label}</p>
                <p className="text-base font-extrabold text-slate-900 leading-none">{m.value}</p>
                <p className={`text-[10px] font-semibold flex items-center gap-0.5 mt-1.5 ${m.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {m.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{m.delta} vs last month
                </p>
              </div>
            ))}
          </div>

          {/* Two columns below */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left: sparkline */}
            <div className="col-span-3 bg-white border border-slate-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700">Revenue Trend</p>
                <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">12 weeks</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.polygon
                  points={area}
                  fill="url(#heroGrad)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2, delay: 1 }}
                />
                <motion.polyline
                  points={pts}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
                />
              </svg>
            </div>

            {/* Right: channel breakdown */}
            <div className="col-span-2 bg-white border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Channel ROAS</p>
              <div className="space-y-3">
                {CHANNELS.map((ch, i) => (
                  <div key={ch.label} className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-12 shrink-0">{ch.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: ch.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${ch.value}%` }}
                        transition={{ duration: 0.9, delay: 0.5 + i * 0.12, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] font-bold shrink-0" style={{ color: ch.color }}>{ch.roas}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Integration pills ──────────────────────────────────────────── */
const INTEGRATIONS = [
  { name: 'Meta Ads', color: '#1877f2' },
  { name: 'Google Ads', color: '#4285f4' },
  { name: 'GA4', color: '#e37400' },
  { name: 'Shopify', color: '#96bf48' },
]

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden dot-grid-bg pt-24 pb-0">
      {/* Orbs */}
      <div className="orb-indigo -top-40 -left-40" />
      <div className="orb-cyan -top-20 right-0" />
      <div className="orb-violet bottom-20 left-1/3" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* ── Centered headline block ── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={item} className="flex justify-center mb-7">
            <span className="inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm shadow-indigo-100">
              <span className="relative flex">
                <span className="ping-slow absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-indigo-500" />
              </span>
              Now in Beta — Join 50+ D2C brands
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={item}
            className="text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.04] mb-7"
          >
            Turn ad spend into{' '}
            <br className="hidden sm:block" />
            <span className="gradient-text">real revenue insight.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p variants={item} className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Parallels connects Meta Ads, Google Ads, GA4, and Shopify into one live command center — showing true ROAS, blended CAC, and every dollar's journey from click to purchase.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2.5 text-white font-semibold px-8 py-4 rounded-xl text-sm"
            >
              Start for Free <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 text-slate-700 font-semibold px-7 py-4 rounded-xl transition-all text-sm bg-white shadow-sm"
            >
              View Live Demo
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 mb-12">
            {['No credit card required', '14-day free trial', 'Cancel anytime', 'SOC2 compliant'].map((t, i) => (
              <span key={t} className="flex items-center gap-1.5">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-300" />}
                {t}
              </span>
            ))}
          </motion.div>

          {/* Integration strip */}
          <motion.div variants={item} className="flex items-center justify-center gap-3 flex-wrap mb-16">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Connects with</span>
            {INTEGRATIONS.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Perspective dashboard ── */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: 'easeOut' }}
          className="relative hero-perspective pb-0"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-8 bg-gradient-to-b from-indigo-100/50 via-cyan-50/30 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="hero-tilt">
            <DashboardMock />
          </div>

          {/* Floating badge — top right */}
          <InsightCard className="top-4 -right-4 lg:-right-8 px-3.5 py-2.5 flex items-center gap-2.5" delay={1.4}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-800">Syncing live</span>
          </InsightCard>

          {/* Floating badge — bottom left */}
          <InsightCard className="bottom-8 -left-4 lg:-left-8 p-3" delay={1.6}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Zap size={14} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 leading-none mb-0.5">This week</p>
                <p className="text-xs font-bold text-slate-800">+$22k revenue</p>
              </div>
            </div>
          </InsightCard>

          {/* Floating badge — top left */}
          <InsightCard className="top-8 -left-4 lg:-left-8 p-3" delay={1.5}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <TrendingDown size={14} className="text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 leading-none mb-0.5">Alert</p>
                <p className="text-xs font-bold text-slate-800">Meta CPC +18%</p>
              </div>
            </div>
          </InsightCard>

          {/* Gradient fade bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/70 to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  )
}

import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, Sparkles, Bell, BarChart2 } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

/* ─── Platform icons (SVG-based colour dots) ─────────────────────── */
const PLATFORMS = [
  { name: 'Meta Ads',    color: '#1877f2', letter: 'M' },
  { name: 'Google Ads',  color: '#4285f4', letter: 'G' },
  { name: 'GA4',         color: '#e37400', letter: 'A' },
  { name: 'Shopify',     color: '#96bf48', letter: 'S' },
]

/* ─── Metric floating card ───────────────────────────────────────── */
function MetricBadge({
  label, value, delta, up, delay, className,
}: {
  label: string; value: string; delta: string; up: boolean;
  delay: number; className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
      className={`absolute glass-dark rounded-2xl px-4 py-3 border border-white/10 shadow-xl ${className}`}
    >
      <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-black text-white leading-none">{value}</p>
      <p className={`text-[11px] font-semibold flex items-center gap-1 mt-1.5 ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{delta}
      </p>
    </motion.div>
  )
}

/* ─── Dashboard mock (white card on dark bg) ─────────────────────── */
const CHAN = [
  { label: 'Meta',   pct: 82, color: '#6366f1', roas: '4.2x' },
  { label: 'Google', pct: 64, color: '#06b6d4', roas: '3.8x' },
  { label: 'Shopify',pct: 93, color: '#10b981', roas: '9.1x' },
  { label: 'Email',  pct: 46, color: '#f59e0b', roas: '2.4x' },
]
const WEEKS = [28,42,38,55,50,68,72,65,80,88,84,96]

function DashboardMock() {
  const W = 460, H = 72
  const max = Math.max(...WEEKS)
  const pts = WEEKS.map((v,i) => `${(i/(WEEKS.length-1))*W},${H-(v/max)*H}`).join(' ')

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full border border-slate-200/60">
      {/* Chrome */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-1.5 max-w-[220px] w-full justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            app.getparallels.io
          </div>
        </div>
        <BarChart2 size={13} className="text-slate-400" />
      </div>

      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-12 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-3 gap-3.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-black">P</span>
          </div>
          {[BarChart2, TrendingUp, Bell, Sparkles].map((Icon,i) => (
            <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i===0?'bg-indigo-50':''}`}>
              <Icon size={13} className={i===0?'text-indigo-600':'text-slate-300'} />
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-4 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { l:'Blended ROAS', v:'4.8x',  d:'+12%', up:true  },
              { l:'Revenue',      v:'$148k', d:'+22%', up:true  },
              { l:'Total Spend',  v:'$32.6k',d:'+5%',  up:true  },
              { l:'CAC',          v:'$19',   d:'-9%',  up:false },
            ].map(m=>(
              <div key={m.l} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <p className="text-[9px] text-slate-400 mb-1 font-medium leading-tight">{m.l}</p>
                <p className="text-sm font-extrabold text-slate-900 leading-none">{m.v}</p>
                <p className={`text-[9px] font-semibold flex items-center gap-0.5 mt-1 ${m.up?'text-emerald-600':'text-rose-500'}`}>
                  {m.up?<TrendingUp size={8}/>:<TrendingDown size={8}/>}{m.d}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Sparkline */}
            <div className="col-span-3 bg-white border border-slate-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-slate-600">Revenue Trend</p>
                <span className="text-[9px] text-emerald-600 font-semibold">↑ All-time high</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <motion.polygon points={`${pts} ${W},${H} 0,${H}`} fill="url(#hg)"
                  initial={{opacity:0}} animate={{opacity:1}} transition={{duration:1,delay:1}}/>
                <motion.polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                  transition={{duration:1.4,delay:0.8,ease:'easeOut'}}/>
              </svg>
            </div>

            {/* Channels */}
            <div className="col-span-2 bg-white border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-600 mb-2.5">Channel ROAS</p>
              <div className="space-y-2.5">
                {CHAN.map((ch,i)=>(
                  <div key={ch.label} className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400 w-9 shrink-0">{ch.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{backgroundColor:ch.color}}
                        initial={{width:0}} animate={{width:`${ch.pct}%`}}
                        transition={{duration:0.9,delay:0.4+i*0.12,ease:'easeOut'}}/>
                    </div>
                    <span className="text-[9px] font-bold shrink-0" style={{color:ch.color}}>{ch.roas}</span>
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

export default function HeroSection() {
  return (
    <section className="relative hero-dark overflow-hidden pt-20 pb-0 min-h-screen flex flex-col">
      {/* Orbs */}
      <div className="orb-indigo -top-40 left-1/2 -translate-x-1/2 opacity-70" />
      <div className="orb-violet -top-20 -right-32 opacity-60" />
      <div className="orb-cyan bottom-32 -left-32 opacity-50" />

      {/* Dark dot grid */}
      <div className="absolute inset-0 dot-grid-dark opacity-100 pointer-events-none" />

      {/* Top glow line */}
      <div className="absolute top-0 inset-x-0 glow-line opacity-60" />

      {/* ── Copy block ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-10 text-center max-w-5xl mx-auto w-full">
        <motion.div variants={container} initial="hidden" animate="show" className="w-full">

          {/* Badge */}
          <motion.div variants={item} className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2.5 glass-dark text-indigo-300 text-xs font-semibold px-4 py-2 rounded-full border border-indigo-500/30">
              <span className="relative flex shrink-0">
                <span className="ping-slow absolute w-2 h-2 rounded-full bg-indigo-400" />
                <span className="relative w-2 h-2 rounded-full bg-indigo-400" />
              </span>
              Trusted by 50+ D2C brands in beta
              <span className="w-px h-3 bg-white/20" />
              <span className="text-white/40">Free 14-day trial</span>
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={item}
            className="text-5xl sm:text-6xl lg:text-[76px] font-black text-white leading-[1.04] tracking-tight mb-7"
          >
            Marketing analytics
            <br />
            <span className="gradient-text-hero">built for D2C growth.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p variants={item} className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto mb-10">
            Connect Meta Ads, Google Ads, GA4, and Shopify in minutes. See true ROAS, real CAC, and exactly which campaigns drive revenue — not platform vanity metrics.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <Link to="/login" className="btn-glow inline-flex items-center gap-2.5 text-white font-bold px-8 py-4 rounded-xl text-sm">
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 glass-dark border border-white/15 hover:border-white/30 text-white/80 hover:text-white font-semibold px-7 py-4 rounded-xl transition-all text-sm">
              Watch Demo
            </Link>
          </motion.div>

          {/* Trust strip */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <div className="flex items-center -space-x-2 mr-1">
              {['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6'].map((c,i)=>(
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#07071a] flex items-center justify-center text-white text-[9px] font-bold"
                  style={{backgroundColor:c}}>
                  {['A','B','C','D','E'][i]}
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs">
              <span className="text-white/70 font-semibold">50+ brands</span> already using Parallels
            </p>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(s=>(
                <svg key={s} viewBox="0 0 12 12" className="w-3 h-3 fill-amber-400"><path d="M6 1l1.3 2.6L10 4.1 8 6l.5 2.8L6 7.5l-2.5 1.3L4 6 2 4.1l2.7-.5L6 1z"/></svg>
              ))}
              <span className="text-white/40 text-[11px] ml-1">4.9/5</span>
            </div>
          </motion.div>

          {/* Platform connects */}
          <motion.div variants={item} className="flex items-center justify-center gap-2 flex-wrap mt-4">
            <span className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mr-1">Connects with</span>
            {PLATFORMS.map(p=>(
              <div key={p.name} className="flex items-center gap-1.5 glass-dark border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/60">
                <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:p.color}}/>
                {p.name}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Dashboard mock ── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-0">
        <motion.div
          initial={{ opacity: 0, y: 56 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: 'easeOut' }}
          className="relative"
        >
          {/* Glow behind mock */}
          <div className="absolute -inset-6 bg-indigo-600/10 rounded-3xl blur-3xl" />
          <div className="absolute -inset-3 bg-cyan-500/5 rounded-3xl blur-2xl" />

          <DashboardMock />

          {/* Floating badges */}
          <MetricBadge label="ROAS This Month" value="4.8x" delta="+12% vs last" up delay={1.3} className="-left-6 top-10 hidden lg:block float-anim-slow" />
          <MetricBadge label="Revenue (30d)" value="$148k" delta="+22% growth" up delay={1.5} className="-right-6 top-10 hidden lg:block float-anim" />
          <MetricBadge label="CAC Trend" value="$19" delta="-9% this week" up={false} delay={1.7} className="-right-4 bottom-16 hidden lg:block float-anim-fast" />

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#07071a] to-transparent pointer-events-none rounded-b-2xl" />
        </motion.div>
      </div>
    </section>
  )
}

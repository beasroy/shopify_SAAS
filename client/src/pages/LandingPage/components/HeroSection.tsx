import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, BarChart2, Bell, Sparkles, Zap, ShieldCheck } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

/* ─── Avatar stack for social proof ─────────────────────────────── */
const AVATARS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899']

/* ─── Channel data ───────────────────────────────────────────────── */
const CHANNELS = [
  { label: 'Meta Ads', pct: 84, color: '#6366f1', roas: '4.2x', spend: '$18.4k' },
  { label: 'Google',   pct: 67, color: '#06b6d4', roas: '3.8x', spend: '$12.1k' },
  { label: 'Shopify',  pct: 95, color: '#10b981', roas: '9.1x', spend: '$1.2k'  },
  { label: 'Email',    pct: 48, color: '#f59e0b', roas: '2.4x', spend: '$0.9k'  },
]

/* ─── Sparkline path ─────────────────────────────────────────────── */
const WEEKS  = [22,34,30,48,42,60,64,56,74,82,78,96]
const WEEKS2 = [15,22,35,28,44,38,55,62,50,68,74,88]  // second series

function buildPolyline(data: number[], w: number, h: number) {
  const max = Math.max(...data)
  return data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h * 0.88}`).join(' ')
}

/* ─── Big dashboard mock ─────────────────────────────────────────── */
function DashboardMock() {
  const W = 500, H = 100
  const pts1 = buildPolyline(WEEKS,  W, H)
  const pts2 = buildPolyline(WEEKS2, W, H)

  const ALERTS = [
    { icon: TrendingDown, text: 'Meta CPC up 18% — review bids', color: 'text-rose-600',  bg: 'bg-rose-50  border-rose-100'    },
    { icon: TrendingUp,   text: 'Google ROAS hit all-time high', color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100' },
    { icon: Zap,          text: 'Weekly report is ready to share',color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100'  },
  ]

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-indigo-100/50 w-full">

      {/* ── Browser chrome ── */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400"/>
          <span className="w-3 h-3 rounded-full bg-amber-400"/>
          <span className="w-3 h-3 rounded-full bg-emerald-400"/>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-2 shadow-sm">
            <ShieldCheck size={10} className="text-emerald-500"/>
            app.getparallels.io / overview
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"/>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <BarChart2 size={13}/>
          <Bell size={13}/>
          <Sparkles size={13}/>
        </div>
      </div>

      <div className="flex h-[420px]">

        {/* ── Sidebar ── */}
        <div className="w-14 bg-slate-50 border-r border-slate-100 flex flex-col items-center pt-4 pb-3 gap-1 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-3 shadow-md shadow-indigo-200">
            <span className="text-white text-[10px] font-black">P</span>
          </div>
          {[
            { Icon: BarChart2,  active: true  },
            { Icon: TrendingUp, active: false },
            { Icon: Bell,       active: false },
            { Icon: Sparkles,   active: false },
          ].map(({ Icon, active }, i) => (
            <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors
              ${active ? 'bg-indigo-100 shadow-sm' : 'hover:bg-slate-100'}`}>
              <Icon size={14} className={active ? 'text-indigo-600' : 'text-slate-300'}/>
            </div>
          ))}
        </div>

        {/* ── Main panel ── */}
        <div className="flex-1 p-5 flex flex-col gap-4 min-w-0 overflow-hidden">

          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Overview · Last 30 days</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">$148,300 <span className="text-sm font-semibold text-slate-400">revenue</span></p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <TrendingUp size={10}/> +22% MoM
              </span>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { l: 'Blended ROAS', v: '4.8x',  d: '+12%', up: true,  accent: '#6366f1' },
              { l: 'Total Revenue',v: '$148k', d: '+22%', up: true,  accent: '#10b981' },
              { l: 'Total Spend',  v: '$32.6k',d: '+5%',  up: true,  accent: '#06b6d4' },
              { l: 'Blended CAC',  v: '$19',   d: '-9%',  up: false, accent: '#f59e0b' },
            ].map(m => (
              <div key={m.l} className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-xl" style={{ backgroundColor: m.accent + '60' }}/>
                <p className="text-[9px] text-slate-400 font-medium mb-1.5 leading-tight">{m.l}</p>
                <p className="text-sm font-extrabold text-slate-900 leading-none">{m.v}</p>
                <p className={`text-[9px] font-semibold flex items-center gap-0.5 mt-1.5 ${m.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {m.up ? <TrendingUp size={8}/> : <TrendingDown size={8}/>}{m.d}
                </p>
              </div>
            ))}
          </div>

          {/* Chart + channels row */}
          <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">

            {/* Multi-line sparkline */}
            <div className="col-span-3 bg-white border border-slate-100 rounded-xl p-3.5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-700">Revenue vs Spend</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block"/>Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 rounded-full inline-block"/>Spend</span>
                </div>
              </div>
              <div className="flex-1 relative min-h-0">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18"/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12"/>
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
                    </linearGradient>
                    <filter id="glow1">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  {/* Area fills */}
                  <motion.polygon
                    points={`${pts1} ${W},${H} 0,${H}`} fill="url(#g1)"
                    initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.8,delay:1}}/>
                  <motion.polygon
                    points={`${pts2} ${W},${H} 0,${H}`} fill="url(#g2)"
                    initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.8,delay:1.1}}/>
                  {/* Lines */}
                  <motion.polyline points={pts2} fill="none" stroke="#06b6d4" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"
                    initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                    transition={{duration:1.4,delay:0.9,ease:'easeOut'}}/>
                  <motion.polyline points={pts1} fill="none" stroke="#6366f1" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" filter="url(#glow1)"
                    initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                    transition={{duration:1.6,delay:0.7,ease:'easeOut'}}/>
                  {/* Peak dot */}
                  {(() => {
                    const max = Math.max(...WEEKS)
                    const idx = WEEKS.indexOf(max)
                    const cx = (idx/(WEEKS.length-1))*W
                    const cy = H-(max/max)*H*0.88
                    return (
                      <motion.circle cx={cx} cy={cy} r="4" fill="#6366f1"
                        initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}}
                        transition={{delay:1.8,duration:0.3}}>
                        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
                      </motion.circle>
                    )
                  })()}
                </svg>
              </div>
            </div>

            {/* Channel ROAS */}
            <div className="col-span-2 bg-white border border-slate-100 rounded-xl p-3.5 flex flex-col">
              <p className="text-xs font-bold text-slate-700 mb-3">Channel ROAS</p>
              <div className="space-y-3 flex-1">
                {CHANNELS.map((ch, i) => (
                  <div key={ch.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-slate-600">{ch.label}</span>
                      <span className="text-[10px] font-black" style={{color:ch.color}}>{ch.roas}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full relative overflow-hidden"
                        style={{backgroundColor:ch.color}}
                        initial={{width:0}} animate={{width:`${ch.pct}%`}}
                        transition={{duration:0.9,delay:0.4+i*0.12,ease:'easeOut'}}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"/>
                      </motion.div>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">Spend {ch.spend}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alert feed */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Bell size={11} className="text-slate-400"/>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Smart Alerts</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALERTS.map((a, i) => {
                const AIcon = a.icon
                return (
                  <motion.div key={a.text}
                    initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                    transition={{delay:1.4+i*0.12}}
                    className={`flex items-center gap-2 border rounded-xl px-2.5 py-2 ${a.bg}`}>
                    <AIcon size={11} className={`${a.color} shrink-0`}/>
                    <p className={`text-[10px] font-semibold leading-tight ${a.color}`}>{a.text}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Integration pills ──────────────────────────────────────────── */
const INTEGRATIONS = [
  { name: 'Meta Ads',   color: '#1877f2' },
  { name: 'Google Ads', color: '#4285f4' },
  { name: 'GA4',        color: '#e37400' },
  { name: 'Shopify',    color: '#96bf48' },
]

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">

      {/* Layered background */}
      <div className="absolute inset-0 dot-grid-bg"/>
      <div className="orb-indigo -top-48 -left-40 opacity-80"/>
      <div className="orb-cyan   top-0    right-0  opacity-70"/>
      <div className="orb-violet bottom-0 left-1/3 opacity-60"/>

      {/* Decorative gradient strip along the top */}
      <div className="absolute top-16 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent"/>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 w-full grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-10 items-center">

        {/* ══ LEFT: copy ══ */}
        <motion.div variants={container} initial="hidden" animate="show">

          {/* Badge */}
          <motion.div variants={item} className="mb-6">
            <span className="inline-flex items-center gap-2.5 bg-white border border-indigo-200/80 text-indigo-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm shadow-indigo-100">
              <span className="relative flex shrink-0 h-2 w-2">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-indigo-400"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"/>
              </span>
              Now in Beta
              <span className="w-px h-3 bg-indigo-200"/>
              <span className="text-indigo-500">Free 14-day trial</span>
            </span>
          </motion.div>

          {/* H1 — large, bold, two-line */}
          <motion.h1 variants={item}
            className="text-[52px] lg:text-[60px] font-black text-slate-900 leading-[1.04] tracking-[-1.5px] mb-6">
            Stop guessing.<br/>
            <span className="relative inline-block">
              <span className="gradient-text">Start knowing.</span>
              {/* Underline accent */}
              <motion.span
                initial={{scaleX:0}} animate={{scaleX:1}}
                transition={{delay:0.8,duration:0.6,ease:'easeOut'}}
                className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 origin-left"
              />
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p variants={item} className="text-[17px] text-slate-500 leading-relaxed mb-8 max-w-[440px]">
            Connect Meta, Google, GA4 &amp; Shopify into one live command center. See true ROAS, real CAC, and exactly which campaigns drive revenue.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap gap-3 mb-8">
            <Link to="/login"
              className="btn-primary inline-flex items-center gap-2.5 text-white font-bold px-7 py-3.5 rounded-xl text-sm">
              Start Free Trial <ArrowRight size={16}/>
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 font-semibold px-6 py-3.5 rounded-xl transition-all text-sm shadow-sm">
              View Demo
            </Link>
          </motion.div>

          {/* ── Social proof: avatars + count ── */}
          <motion.div variants={item} className="flex items-center gap-4 mb-8 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm w-fit">
            <div className="flex items-center -space-x-2.5">
              {AVATARS.map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-sm"
                  style={{backgroundColor: c}}>
                  {['AR','BK','CS','DM','EL','FP'][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">50+ brands already live</p>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} viewBox="0 0 12 12" className="w-3 h-3 fill-amber-400">
                    <path d="M6 1l1.3 2.6L10 4.1 8 6l.5 2.8L6 7.5l-2.5 1.3L4 6 2 4.1l2.7-.5L6 1z"/>
                  </svg>
                ))}
                <span className="text-[11px] text-slate-400 ml-0.5 font-medium">4.9 / 5</span>
              </div>
            </div>
          </motion.div>

          {/* Trust + integrations */}
          <motion.div variants={item} className="space-y-3">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
              {['No credit card required','Cancel anytime','SOC2 compliant'].map((t,i)=>(
                <span key={t} className="flex items-center gap-1.5">
                  {i>0&&<span className="w-1 h-1 rounded-full bg-slate-300"/>}
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connects with</span>
              {INTEGRATIONS.map(s=>(
                <div key={s.name} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:s.color}}/>
                  {s.name}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ══ RIGHT: dashboard ══ */}
        <motion.div
          initial={{opacity:0, x:52, y:8}}
          animate={{opacity:1, x:0,  y:0}}
          transition={{duration:0.9, delay:0.28, ease:'easeOut'}}
          className="relative w-full"
        >
          {/* Halo */}
          <div className="absolute -inset-6 bg-gradient-to-br from-indigo-100/60 via-cyan-50/30 to-purple-50/20 rounded-3xl blur-2xl -z-10"/>

          <DashboardMock />

          {/* Floating — Syncing live (top-right) */}
          <motion.div
            initial={{opacity:0,scale:0.8,y:8}} animate={{opacity:1,scale:1,y:0}}
            transition={{delay:1.4,duration:0.4}}
            className="absolute -top-5 -right-4 lg:-right-6 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xl float-anim-slow flex items-center gap-2.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-xs font-bold text-slate-800">Syncing live</span>
          </motion.div>

          {/* Floating — revenue badge (bottom-left) */}
          <motion.div
            initial={{opacity:0,scale:0.8,y:8}} animate={{opacity:1,scale:1,y:0}}
            transition={{delay:1.65,duration:0.4}}
            className="absolute -bottom-5 -left-4 lg:-left-6 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl float-anim flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-200">
              <Zap size={14} className="text-white"/>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 leading-none mb-0.5">This week</p>
              <p className="text-sm font-extrabold text-slate-900">+$22,400 revenue</p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}

import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, TrendingUp, TrendingDown, BarChart2,
  Bell, Sparkles, Zap, ShieldCheck, ArrowUpRight,
  Activity, DollarSign, Users2,
} from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const AVATARS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#ec4899']
const INTEGRATIONS = [
  { name: 'Meta Ads',   color: '#1877f2' },
  { name: 'Google Ads', color: '#4285f4' },
  { name: 'GA4',        color: '#e37400' },
  { name: 'Shopify',    color: '#96bf48' },
]

/* ─────────────────────────────────────────────────────────────────
   DASHBOARD MOCK
   ───────────────────────────────────────────────────────────────── */
const REV_WEEKS  = [38, 42, 36, 55, 50, 64, 70, 62, 78, 88, 82, 100]
const ROAS_WEEKS = [32, 35, 30, 45, 42, 56, 60, 54, 67, 75, 72, 86]

const CHANNELS = [
  { label: 'Meta Ads',  pct: 84, color: '#6366f1', roas: '4.2x', spend: '$18.4k', rev: '$77.3k'  },
  { label: 'Google',    pct: 67, color: '#06b6d4', roas: '3.8x', spend: '$12.1k', rev: '$45.9k'  },
  { label: 'Shopify',   pct: 95, color: '#10b981', roas: '9.1x', spend: '$1.2k',  rev: '$10.9k'  },
  { label: 'Email',     pct: 48, color: '#f59e0b', roas: '2.4x', spend: '$0.9k',  rev: '$2.2k'   },
]

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function buildPath(data: number[], W: number, H: number, pad = 8) {
  const max = Math.max(...data)
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (W - pad * 2) + pad
      const y = H - pad - (v / max) * (H - pad * 2)
      return `${x},${y}`
    })
    .join(' ')
}

function DashboardMock() {
  const W = 440, H = 110

  const pts1 = buildPath(REV_WEEKS,  W, H)
  const pts2 = buildPath(ROAS_WEEKS, W, H)

  /* convert polyline pts to closed area polygon */
  const toArea = (pts: string) => {
    const first = pts.split(' ')[0]
    const last  = pts.split(' ').at(-1)!
    const lx    = parseFloat(last.split(',')[0])
    const fx    = parseFloat(first.split(',')[0])
    return `${pts} ${lx},${H} ${fx},${H}`
  }

  /* recent activity rows */
  const ACTIVITY = [
    { label: 'Meta Summer Sale',     value: '+$4,240', up: true,  tag: 'Campaign'  },
    { label: 'Google Brand Search',  value: '+$2,110', up: true,  tag: 'Campaign'  },
    { label: 'Prospecting LAL 3%',   value: '-$640',   up: false, tag: 'Warning'   },
  ]

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-indigo-100/40 w-full">

      {/* ── Browser chrome ── */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400"/>
          <span className="w-3 h-3 rounded-full bg-amber-400"/>
          <span className="w-3 h-3 rounded-full bg-emerald-400"/>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-1.5 shadow-sm">
            <ShieldCheck size={10} className="text-emerald-500 shrink-0"/>
            parallels.messold.com/dashboard
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1"/>
          </div>
        </div>
        <div className="flex gap-2 text-slate-300">
          <BarChart2 size={13}/><Bell size={13}/><Sparkles size={13}/>
        </div>
      </div>

      {/* ── App shell ── */}
      <div className="flex" style={{ height: 400 }}>

        {/* Sidebar */}
        <div className="w-[52px] bg-slate-50 border-r border-slate-100 flex flex-col items-center pt-4 pb-3 gap-1 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-3 shadow-md shadow-indigo-200/60">
            <span className="text-white text-[9px] font-black">P</span>
          </div>
          {[
            { Icon: BarChart2,  active: true  },
            { Icon: Activity,   active: false },
            { Icon: DollarSign, active: false },
            { Icon: Users2,     active: false },
            { Icon: Bell,       active: false },
          ].map(({ Icon, active }, i) => (
            <div key={i}
              className={`w-8 h-8 rounded-xl flex items-center justify-center
                ${active ? 'bg-indigo-100 shadow-sm' : ''}`}>
              <Icon size={14} className={active ? 'text-indigo-600' : 'text-slate-300'}/>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Overview</p>
              <p className="text-base font-black text-slate-900 mt-0.5 leading-none">
                $148,300
                <span className="text-xs font-semibold text-slate-400 ml-1">total revenue</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">30d</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <TrendingUp size={9}/> +22% MoM
              </span>
            </div>
          </div>

          {/* Body: scrollable */}
          <div className="flex-1 flex overflow-hidden">

            {/* Left column: KPIs + chart + activity */}
            <div className="flex-1 flex flex-col gap-3 p-3.5 overflow-hidden">

              {/* KPI row */}
              <div className="grid grid-cols-4 gap-2 shrink-0">
                {[
                  { l:'ROAS',    v:'4.8x',  d:'+12%', up:true,  c:'#6366f1' },
                  { l:'Revenue', v:'$148k', d:'+22%', up:true,  c:'#10b981' },
                  { l:'Spend',   v:'$32.6k',d:'+5%',  up:true,  c:'#06b6d4' },
                  { l:'CAC',     v:'$19',   d:'-9%',  up:false, c:'#f59e0b' },
                ].map(m => (
                  <div key={m.l} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-xl" style={{background:`linear-gradient(90deg,${m.c}80,${m.c}20)`}}/>
                    <p className="text-[9px] text-slate-400 font-semibold mb-1">{m.l}</p>
                    <p className="text-[13px] font-extrabold text-slate-900 leading-none">{m.v}</p>
                    <p className={`text-[8px] font-bold flex items-center gap-0.5 mt-1 ${m.up?'text-emerald-600':'text-rose-500'}`}>
                      {m.up?<TrendingUp size={7}/>:<TrendingDown size={7}/>}{m.d}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart card */}
              <div className="bg-white border border-slate-100 rounded-xl p-3 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <p className="text-[11px] font-bold text-slate-700">Revenue &amp; ROAS Trend</p>
                  <div className="flex items-center gap-3 text-[9px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-indigo-500 rounded-full inline-block"/>Revenue
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-cyan-400 rounded-full inline-block" style={{backgroundImage:'repeating-linear-gradient(90deg,#06b6d4 0,#06b6d4 3px,transparent 3px,transparent 6px)'}}/>ROAS
                    </span>
                  </div>
                </div>

                {/* Y-axis labels + SVG */}
                <div className="flex flex-1 min-h-0 gap-1">
                  <div className="flex flex-col justify-between text-[8px] text-slate-300 font-medium pb-4 shrink-0">
                    {['100','75','50','25'].map(l=><span key={l}>{l}%</span>)}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                        </linearGradient>
                        <filter id="ln-glow">
                          <feGaussianBlur stdDeviation="2.5" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        {/* Horizontal grid lines */}
                      </defs>
                      {/* Grid lines */}
                      {[0.25,0.5,0.75].map(f=>(
                        <line key={f} x1="8" x2={W-8} y1={H*f} y2={H*f}
                          stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="4 3"/>
                      ))}
                      {/* Area */}
                      <motion.polygon points={toArea(pts1)} fill="url(#rg)"
                        initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.6,delay:1}}/>
                      {/* ROAS dashed */}
                      <motion.polyline points={pts2} fill="none" stroke="#06b6d4" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"
                        initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                        transition={{duration:1.2,delay:0.9,ease:'easeOut'}}/>
                      {/* Revenue solid + glow */}
                      <motion.polyline points={pts1} fill="none" stroke="#6366f1" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round" filter="url(#ln-glow)"
                        initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                        transition={{duration:1.5,delay:0.7,ease:'easeOut'}}/>
                      {/* Data dots on revenue line */}
                      {buildPath(REV_WEEKS,W,H).split(' ').map((pt,i)=>{
                        const [cx,cy] = pt.split(',').map(Number)
                        const isMax = REV_WEEKS[i]===Math.max(...REV_WEEKS)
                        return isMax ? (
                          <g key={i}>
                            <motion.circle cx={cx} cy={cy} r="5" fill="#6366f1" opacity="0.2"
                              initial={{scale:0}} animate={{scale:1}} transition={{delay:1.8}}>
                              <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/>
                            </motion.circle>
                            <motion.circle cx={cx} cy={cy} r="3.5" fill="#6366f1"
                              initial={{scale:0}} animate={{scale:1}} transition={{delay:1.8}}/>
                          </g>
                        ) : (i % 3 === 0 ? (
                          <motion.circle key={i} cx={cx} cy={cy} r="2" fill="white" stroke="#6366f1" strokeWidth="1.5"
                            initial={{scale:0}} animate={{scale:1}} transition={{delay:1.6+i*0.04}}/>
                        ) : null)
                      })}
                    </svg>
                    {/* X-axis month labels */}
                    <div className="flex justify-between px-2 mt-1 shrink-0">
                      {MONTH_LABELS.map((m,i)=>(
                        <span key={m} className={`text-[8px] font-medium ${i===11?'text-indigo-500 font-bold':'text-slate-300'}`}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity feed */}
              <div className="bg-white border border-slate-100 rounded-xl p-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-600">Recent Activity</p>
                  <span className="text-[9px] text-indigo-500 font-semibold cursor-pointer flex items-center gap-0.5">
                    View all <ArrowUpRight size={9}/>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {ACTIVITY.map(a=>(
                    <div key={a.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.up?'bg-emerald-400':'bg-rose-400'}`}/>
                        <span className="text-[10px] text-slate-600 font-medium">{a.label}</span>
                        <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{a.tag}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${a.up?'text-emerald-600':'text-rose-500'}`}>{a.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: channel breakdown */}
            <div className="w-[148px] shrink-0 border-l border-slate-100 p-3 flex flex-col gap-3">
              <p className="text-[10px] font-bold text-slate-700 shrink-0">Channels</p>

              {CHANNELS.map((ch, i) => (
                <motion.div key={ch.label}
                  initial={{opacity:0,x:10}} animate={{opacity:1,x:0}}
                  transition={{delay:0.5+i*0.1}}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-between min-h-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-slate-600">{ch.label}</span>
                    <span className="text-[10px] font-black" style={{color:ch.color}}>{ch.roas}</span>
                  </div>
                  <div className="h-1.5 bg-white border border-slate-100 rounded-full overflow-hidden mb-1.5">
                    <motion.div className="h-full rounded-full"
                      style={{background:`linear-gradient(90deg, ${ch.color}, ${ch.color}99)`}}
                      initial={{width:0}} animate={{width:`${ch.pct}%`}}
                      transition={{duration:0.8,delay:0.5+i*0.12,ease:'easeOut'}}/>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[8px] text-slate-400">{ch.spend}</span>
                    <span className="text-[8px] font-semibold text-slate-600">{ch.rev}</span>
                  </div>
                </motion.div>
              ))}

              {/* Alert pill */}
              <div className="shrink-0 bg-amber-50 border border-amber-100 rounded-xl p-2 flex items-start gap-1.5">
                <Bell size={10} className="text-amber-500 shrink-0 mt-0.5"/>
                <p className="text-[9px] font-semibold text-amber-700 leading-snug">Meta CPC +18% — review bids</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   HERO SECTION
   ───────────────────────────────────────────────────────────────── */
export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">
      <div className="absolute inset-0 dot-grid-bg"/>
      <div className="orb-indigo -top-48 -left-40 opacity-80"/>
      <div className="orb-cyan   top-0    right-0  opacity-70"/>
      <div className="orb-violet bottom-0 left-1/3 opacity-60"/>
      <div className="absolute top-16 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent"/>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 w-full grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-center">

        {/* LEFT copy */}
        <motion.div variants={container} initial="hidden" animate="show">

          <motion.div variants={item} className="mb-6">
            <span className="inline-flex items-center gap-2.5 bg-white border border-indigo-200/80 text-indigo-700 text-xs font-semibold px-4 py-2 rounded-full shadow-sm shadow-indigo-100">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-indigo-400"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"/>
              </span>
              Now in Beta
              <span className="w-px h-3 bg-indigo-200"/>
              <span className="text-indigo-500">Free 14-day trial</span>
            </span>
          </motion.div>

          <motion.h1 variants={item}
            className="text-[52px] lg:text-[60px] font-black text-slate-900 leading-[1.04] tracking-[-1.5px] mb-6">
            Stop guessing.<br/>
            <span className="relative inline-block">
              <span className="gradient-text">Start knowing.</span>
              <motion.span
                initial={{scaleX:0}} animate={{scaleX:1}}
                transition={{delay:0.9,duration:0.6,ease:'easeOut'}}
                className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 origin-left"
              />
            </span>
          </motion.h1>

          <motion.p variants={item} className="text-[17px] text-slate-500 leading-relaxed mb-8 max-w-[440px]">
            Connect Meta, Google, GA4 &amp; Shopify into one live analytics command center. See true ROAS, real CAC, and exactly which campaigns drive revenue.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap gap-3 mb-8">
            <Link to="/login" className="btn-primary inline-flex items-center gap-2.5 text-white font-bold px-7 py-3.5 rounded-xl text-sm">
              Start Free Trial <ArrowRight size={16}/>
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 font-semibold px-6 py-3.5 rounded-xl transition-all text-sm shadow-sm">
              View Demo
            </Link>
          </motion.div>

          {/* Social proof card */}
          <motion.div variants={item} className="flex items-center gap-4 mb-8 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm w-fit">
            <div className="flex items-center -space-x-2.5">
              {AVATARS.map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow-sm"
                  style={{backgroundColor:c}}>
                  {['AR','BK','CS','DM','EL','FP'][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">50+ brands already live</p>
              <div className="flex items-center gap-0.5 mt-1">
                {[1,2,3,4,5].map(s=>(
                  <svg key={s} viewBox="0 0 12 12" className="w-3 h-3 fill-amber-400">
                    <path d="M6 1l1.3 2.6L10 4.1 8 6l.5 2.8L6 7.5l-2.5 1.3L4 6 2 4.1l2.7-.5L6 1z"/>
                  </svg>
                ))}
                <span className="text-[11px] text-slate-400 ml-0.5 font-medium">4.9 / 5</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="space-y-3">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
              {['No credit card required','Cancel anytime','SOC2 compliant'].map((t,i)=>(
                <span key={t} className="flex items-center gap-1.5">
                  {i>0&&<span className="w-1 h-1 rounded-full bg-slate-300"/>}{t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connects with</span>
              {INTEGRATIONS.map(s=>(
                <div key={s.name} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor:s.color}}/>
                  {s.name}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* RIGHT: dashboard */}
        <motion.div
          initial={{opacity:0, x:52, y:8}}
          animate={{opacity:1, x:0,  y:0}}
          transition={{duration:0.9, delay:0.28, ease:'easeOut'}}
          className="relative w-full"
        >
          <div className="absolute -inset-6 bg-gradient-to-br from-indigo-100/60 via-cyan-50/30 to-purple-50/20 rounded-3xl blur-2xl -z-10"/>

          <DashboardMock />

          {/* Syncing live */}
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
            transition={{delay:1.4,duration:0.4}}
            className="absolute -top-4 -right-4 lg:-right-6 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xl float-anim-slow flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-xs font-bold text-slate-800">Syncing live</span>
          </motion.div>

          {/* Revenue badge */}
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
            transition={{delay:1.65,duration:0.4}}
            className="absolute -bottom-4 -left-4 lg:-left-6 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl float-anim flex items-center gap-3">
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

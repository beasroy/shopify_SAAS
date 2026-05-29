import { motion, type Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, BarChart2, Bell, Sparkles, Zap } from 'lucide-react'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const INTEGRATIONS = [
  { name: 'Meta Ads',   color: '#1877f2' },
  { name: 'Google Ads', color: '#4285f4' },
  { name: 'GA4',        color: '#e37400' },
  { name: 'Shopify',    color: '#96bf48' },
]

const CHANNELS = [
  { label: 'Meta',   pct: 82, color: '#6366f1', roas: '4.2x' },
  { label: 'Google', pct: 64, color: '#06b6d4', roas: '3.8x' },
  { label: 'Shopify',pct: 93, color: '#10b981', roas: '9.1x' },
  { label: 'Email',  pct: 46, color: '#f59e0b', roas: '2.4x' },
]

const WEEKS = [28,42,38,55,50,68,72,65,80,88,84,96]

function DashboardMock() {
  const W = 440, H = 68
  const max = Math.max(...WEEKS)
  const pts = WEEKS.map((v,i) => `${(i/(WEEKS.length-1))*W},${H-(v/max)*H}`).join(' ')

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-indigo-100/40 w-full">
      {/* Browser chrome */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            app.getparallels.io
          </div>
        </div>
        <BarChart2 size={13} className="text-slate-400" />
      </div>

      {/* Dashboard body */}
      <div className="flex">
        {/* Mini sidebar */}
        <div className="w-11 bg-slate-50/70 border-r border-slate-100 flex flex-col items-center py-3 gap-3 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white text-[9px] font-black">P</span>
          </div>
          {[BarChart2, TrendingUp, Bell, Sparkles].map((Icon, i) => (
            <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i===0?'bg-indigo-100':''}`}>
              <Icon size={13} className={i===0?'text-indigo-600':'text-slate-300'} />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 min-w-0">
          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-2 mb-3.5">
            {[
              { l:'Blended ROAS', v:'4.8x',  d:'+12%', up:true  },
              { l:'Revenue',      v:'$148k', d:'+22%', up:true  },
              { l:'Spend',        v:'$32k',  d:'+5%',  up:true  },
              { l:'CAC',          v:'$19',   d:'-9%',  up:false },
            ].map(m=>(
              <div key={m.l} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <p className="text-[9px] text-slate-400 mb-1 leading-tight">{m.l}</p>
                <p className="text-sm font-extrabold text-slate-900 leading-none">{m.v}</p>
                <p className={`text-[9px] font-semibold flex items-center gap-0.5 mt-1 ${m.up?'text-emerald-600':'text-rose-500'}`}>
                  {m.up?<TrendingUp size={8}/>:<TrendingDown size={8}/>}{m.d}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2.5">
            {/* Sparkline */}
            <div className="col-span-3 bg-white border border-slate-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-slate-600">Revenue Trend</p>
                <span className="text-[9px] text-emerald-600 font-semibold">↑ +22% MoM</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <motion.polygon points={`${pts} ${W},${H} 0,${H}`} fill="url(#hg2)"
                  initial={{opacity:0}} animate={{opacity:1}} transition={{duration:1,delay:1}}/>
                <motion.polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}}
                  transition={{duration:1.4,delay:0.8,ease:'easeOut'}}/>
              </svg>
            </div>

            {/* Channel ROAS */}
            <div className="col-span-2 bg-white border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-600 mb-2.5">Channel ROAS</p>
              <div className="space-y-2">
                {CHANNELS.map((ch,i)=>(
                  <div key={ch.label} className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-400 w-9 shrink-0">{ch.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{backgroundColor:ch.color}}
                        initial={{width:0}} animate={{width:`${ch.pct}%`}}
                        transition={{duration:0.9,delay:0.4+i*0.1,ease:'easeOut'}}/>
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
    <section className="relative min-h-screen flex items-center overflow-hidden dot-grid-bg pt-16">
      {/* Orbs */}
      <div className="orb-indigo -top-40 -left-32" />
      <div className="orb-cyan top-10 right-0" />
      <div className="orb-violet bottom-0 left-1/3" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center w-full">

        {/* ── Left copy ── */}
        <motion.div variants={container} initial="hidden" animate="show">

          {/* Badge */}
          <motion.div variants={item} className="mb-6">
            <span className="inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-sm shadow-indigo-100/60">
              <span className="relative flex shrink-0">
                <span className="ping-slow absolute w-2 h-2 rounded-full bg-indigo-400" />
                <span className="relative w-2 h-2 rounded-full bg-indigo-500" />
              </span>
              Now in Beta · 50+ D2C brands
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1 variants={item}
            className="text-5xl lg:text-[56px] font-black text-slate-900 leading-[1.06] tracking-tight mb-5">
            Marketing data,
            <br />
            <span className="gradient-text">finally unified.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p variants={item} className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
            Connect Meta Ads, Google Ads, GA4, and Shopify in minutes. See your true ROAS, real CAC, and exactly which campaigns drive revenue — in one live dashboard.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-wrap gap-3 mb-8">
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-sm">
              Start Free Trial <ArrowRight size={15}/>
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 text-slate-700 font-semibold px-6 py-3.5 rounded-xl transition-all text-sm shadow-sm">
              View Demo
            </Link>
          </motion.div>

          {/* Trust row */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-5 text-xs text-slate-400 mb-8">
            {['No credit card', '14-day free trial', 'Cancel anytime'].map((t,i)=>(
              <span key={t} className="flex items-center gap-1.5">
                {i>0&&<span className="w-1 h-1 rounded-full bg-slate-300"/>}
                {t}
              </span>
            ))}
          </motion.div>

          {/* Integrations */}
          <motion.div variants={item} className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Connects with</span>
            {INTEGRATIONS.map(s=>(
              <div key={s.name} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:s.color}}/>
                {s.name}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right: dashboard mock ── */}
        <motion.div
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.3, ease: 'easeOut' }}
          className="relative w-full"
        >
          {/* Soft glow behind card */}
          <div className="absolute -inset-4 bg-gradient-to-br from-indigo-100/60 via-cyan-50/40 to-transparent rounded-3xl blur-2xl -z-10"/>

          <DashboardMock />

          {/* Floating badge — top right */}
          <motion.div
            initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}}
            transition={{delay:1.3,duration:0.4}}
            className="absolute -top-4 -right-3 lg:-right-6 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xl float-anim-slow flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-xs font-semibold text-slate-800">Syncing live</span>
          </motion.div>

          {/* Floating badge — bottom left */}
          <motion.div
            initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}}
            transition={{delay:1.55,duration:0.4}}
            className="absolute -bottom-4 -left-3 lg:-left-6 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xl float-anim flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Zap size={13} className="text-indigo-600"/>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 leading-none">This week</p>
              <p className="text-xs font-bold text-slate-900">+$22k revenue</p>
            </div>
          </motion.div>

          {/* Floating badge — mid left */}
          <motion.div
            initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}}
            transition={{delay:1.75,duration:0.4}}
            className="absolute top-1/3 -left-3 lg:-left-6 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xl float-anim-fast flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <TrendingDown size={13} className="text-rose-500"/>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 leading-none">Alert</p>
              <p className="text-xs font-bold text-slate-900">Meta CPC +18%</p>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  )
}

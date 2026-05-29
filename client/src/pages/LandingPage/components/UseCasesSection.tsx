import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import {
  Store, Target, TrendingUp, Users,
  TrendingDown, CheckCircle2, BarChart2, Zap, Bell,
} from 'lucide-react'

/* ─── Role definitions ───────────────────────────────────────────── */
const ROLES = [
  {
    value: 'dtc',
    tab: 'DTC Founders',
    icon: Store,
    tagline: 'Revenue Intelligence',
    headline: 'Know exactly where every dollar comes from.',
    desc: 'Stop guessing which channel actually works. See blended ROAS, true CAC, and revenue by channel in one live view — not five disconnected dashboards.',
    metric: { value: '4.8x', label: 'avg. blended ROAS' },
    bullets: [
      'Blended ROAS across Meta, Google & Email',
      'True CAC — not inflated platform numbers',
      'Revenue contribution per channel, live',
    ],
    accent: '#6366f1',
    tabActive: 'bg-indigo-600 text-white border-indigo-600',
    tagStyle: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    metricStyle: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    barColor: 'bg-indigo-600',
    mini: [
      { label: 'Meta Ads', value: '4.2x', color: '#6366f1', pct: 80 },
      { label: 'Google', value: '3.8x', color: '#06b6d4', pct: 65 },
      { label: 'Email', value: '9.1x', color: '#10b981', pct: 95 },
    ],
  },
  {
    value: 'marketers',
    tab: 'Performance Marketers',
    icon: Target,
    tagline: 'Campaign Intelligence',
    headline: 'Find winners. Kill losers. Before it costs you.',
    desc: "Platform conversions never match Shopify revenue. Parallels computes real attribution so you know which campaigns to scale and which to cut — immediately.",
    metric: { value: '6 hrs', label: 'saved per week' },
    bullets: [
      'Cross-channel attribution beyond last-click',
      'Real-time ROAS alerts for underperformers',
      'Funnel drop-off from ad click to purchase',
    ],
    accent: '#06b6d4',
    tabActive: 'bg-cyan-600 text-white border-cyan-600',
    tagStyle: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    metricStyle: 'bg-cyan-50 border-cyan-100 text-cyan-600',
    barColor: 'bg-cyan-500',
    mini: [
      { label: 'Retarget', value: '6.1x ↑', color: '#10b981', pct: 92 },
      { label: 'Prospect', value: '2.9x ↓', color: '#f59e0b', pct: 42 },
      { label: 'Brand KW', value: '8.3x ↑', color: '#06b6d4', pct: 98 },
    ],
  },
  {
    value: 'growth',
    tab: 'Growth Leaders',
    icon: TrendingUp,
    tagline: 'Executive Analytics',
    headline: 'Board-ready metrics. Zero analyst needed.',
    desc: 'Get MER, blended ROAS, and CAC trends without asking anyone to pull a spreadsheet. Executive clarity, always up to date.',
    metric: { value: '+31%', label: 'avg. revenue growth' },
    bullets: [
      'MER, blended ROAS, and CAC at a glance',
      '12-week revenue trend with channel breakdown',
      'One-click reports for board presentations',
    ],
    accent: '#8b5cf6',
    tabActive: 'bg-violet-600 text-white border-violet-600',
    tagStyle: 'bg-violet-50 text-violet-700 border-violet-100',
    metricStyle: 'bg-violet-50 border-violet-100 text-violet-600',
    barColor: 'bg-violet-600',
    mini: [
      { label: 'MER',     value: '5.1x', color: '#8b5cf6', pct: 88 },
      { label: 'Revenue', value: '+31%', color: '#10b981', pct: 75 },
      { label: 'CAC',     value: '$22',  color: '#06b6d4', pct: 38 },
    ],
  },
  {
    value: 'agencies',
    tab: 'Agencies',
    icon: Users,
    tagline: 'Portfolio Management',
    headline: 'All your clients. One command center.',
    desc: "Manage every brand under one roof. Instantly see which clients need attention, auto-deliver white-label reports, and reclaim the 11 hours a week you waste on manual data pulls.",
    metric: { value: '4×', label: 'more clients managed' },
    bullets: [
      'Multi-brand portfolio with health indicators',
      'Automated white-label client reports',
      'Instant view: which clients need attention',
    ],
    accent: '#10b981',
    tabActive: 'bg-emerald-600 text-white border-emerald-600',
    tagStyle: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    metricStyle: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    barColor: 'bg-emerald-500',
    mini: [
      { label: 'Luminary', value: '5.2x ↑', color: '#10b981', pct: 85 },
      { label: 'Peak',     value: '3.1x →', color: '#f59e0b', pct: 52 },
      { label: 'Bloom',    value: '6.8x ↑', color: '#06b6d4', pct: 95 },
    ],
  },
]

export default function UseCasesSection() {
  const [active, setActive] = useState('dtc')
  const role = ROLES.find(r => r.value === active)!
  const Icon = role.icon

  return (
    <section className="section-pad bg-white" id="use-cases">
      <div className="max-w-6xl mx-auto px-6">

        <FadeIn className="text-center mb-10">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Who it's for</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Built for every role on your growth team
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Whether you run the brand or run the ads — Parallels surfaces what you need to act.
          </p>
        </FadeIn>

        {/* ── Tab bar ── */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {ROLES.map(r => {
            const RIcon = r.icon
            const isActive = active === r.value
            return (
              <button
                key={r.value}
                onClick={() => setActive(r.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200
                  ${isActive ? r.tabActive + ' shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'}`}
              >
                <RIcon size={15} />
                {r.tab}
              </button>
            )
          })}
        </div>

        {/* ── Content card ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-100/60"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">

              {/* ── Copy side ── */}
              <div className="p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
                <div>
                  {/* Tag */}
                  <div className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-full mb-5 ${role.tagStyle}`}>
                    <Icon size={11}/>
                    {role.tagline}
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                    {role.headline}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    {role.desc}
                  </p>

                  <ul className="space-y-3 mb-7">
                    {role.bullets.map(b => (
                      <li key={b} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 size={15} style={{color:role.accent}} className="shrink-0"/>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom stats strip */}
                <div className="grid grid-cols-3 gap-3 pt-5 border-t border-slate-100">
                  {[
                    { n: '< 10 min', l: 'to connect' },
                    { n: 'Real-time', l: 'data sync' },
                    { n: 'Zero code', l: 'required' },
                  ].map(s => (
                    <div key={s.l} className="text-center">
                      <p className="text-sm font-extrabold text-slate-900">{s.n}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Visual side ── */}
              <div className="p-7 lg:p-8 bg-slate-50/50 flex flex-col gap-4">

                {/* Metric highlight */}
                <div className={`flex items-center gap-3 border rounded-2xl px-5 py-4 ${role.metricStyle}`}>
                  <div>
                    <p className="text-3xl font-black" style={{color:role.accent}}>{role.metric.value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{role.metric.label}</p>
                  </div>
                  <div className="ml-auto">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor:`${role.accent}15`}}>
                      <Zap size={18} style={{color:role.accent}}/>
                    </div>
                  </div>
                </div>

                {/* Mini dashboard panel */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex-1 shadow-sm">
                  {/* Chrome bar */}
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"/>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"/>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"/>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <span className="bg-white border border-slate-200 rounded px-3 text-[10px] text-slate-400 py-0.5">
                        app.getparallels.io
                      </span>
                    </div>
                    <BarChart2 size={12} className="text-slate-300"/>
                  </div>

                  <div className="p-4">
                    {/* Nav row */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                          <span className="text-white text-[8px] font-black">P</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">Parallels</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                        Syncing
                      </div>
                    </div>

                    {/* Alert banner */}
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
                      <Bell size={11} className="text-amber-500 shrink-0"/>
                      <p className="text-[10px] font-semibold text-amber-700">
                        {active==='marketers'
                          ? 'Prospecting ROAS fell below 3x threshold'
                          : active==='agencies'
                          ? 'UrbanEdge Co. needs attention (-21%)'
                          : active==='growth'
                          ? 'Revenue trend: 12-week all-time high'
                          : 'Meta CPC increased 18% — review bids'}
                      </p>
                    </div>

                    {/* Channel bars */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <BarChart2 size={11} className="text-slate-400"/>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {active==='agencies' ? 'Client ROAS' : 'Channel Performance'}
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        {role.mini.map((m,i)=>(
                          <div key={m.label} className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 w-14 shrink-0">{m.label}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{backgroundColor:m.color}}
                                initial={{width:0}}
                                animate={{width:`${m.pct}%`}}
                                transition={{duration:0.8,delay:0.1+i*0.1,ease:'easeOut'}}
                              />
                            </div>
                            <span className="text-[10px] font-bold shrink-0" style={{color:m.color}}>{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom KPIs */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {[
                        { l:'ROAS',    v: active==='agencies'?'4.8x':active==='growth'?'5.1x':active==='marketers'?'6.1x':'4.8x', up:true  },
                        { l:'Revenue', v: active==='agencies'?'$94k':active==='growth'?'$312k':active==='marketers'?'$58k':'$148k', up:true  },
                        { l:'CAC',     v: active==='growth'?'$22':active==='dtc'?'$19':'$24', up:false },
                      ].map(k=>(
                        <div key={k.l} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                          <p className="text-[9px] text-slate-400 mb-0.5">{k.l}</p>
                          <p className="text-xs font-extrabold text-slate-900">{k.v}</p>
                          <p className={`text-[8px] font-semibold flex items-center justify-center gap-0.5 mt-0.5 ${k.up?'text-emerald-600':'text-rose-500'}`}>
                            {k.up?<TrendingUp size={7}/>:<TrendingDown size={7}/>}
                            {k.up?'+':''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

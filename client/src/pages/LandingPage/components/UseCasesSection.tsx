import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import {
  Store, Target, TrendingUp, Users, TrendingDown,
  ArrowUpRight, Bell, Zap, BarChart2, CheckCircle2,
} from 'lucide-react'

/* ─── Mock UIs ───────────────────────────────────────────────────── */

function DtcMock() {
  const channels = [
    { name: 'Meta Ads', roas: 4.2, spend: '$18.4k', rev: '$77.3k', color: '#6366f1', pct: 84 },
    { name: 'Google Ads', roas: 3.8, spend: '$12.1k', rev: '$45.9k', color: '#06b6d4', pct: 70 },
    { name: 'Email', roas: 9.1, spend: '$1.2k', rev: '$10.9k', color: '#10b981', pct: 95 },
    { name: 'Organic', roas: Infinity, spend: '—', rev: '$14.2k', color: '#f59e0b', pct: 50 },
  ]
  return (
    <div className="space-y-3.5">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Total Revenue · 30d</p>
          <p className="text-3xl font-black text-slate-900 mt-1">$148,300</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <TrendingUp size={11} /> +22% vs last month
        </span>
      </div>
      {channels.map((ch, i) => (
        <motion.div
          key={ch.name}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3"
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">{ch.name}</span>
              <span className="text-xs font-bold" style={{ color: ch.color }}>
                {ch.roas === Infinity ? '∞' : `${ch.roas}x`} ROAS
              </span>
            </div>
            <div className="h-1.5 bg-white border border-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: ch.color }}
                initial={{ width: 0 }}
                animate={{ width: `${ch.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">Spend {ch.spend}</span>
              <span className="text-[10px] text-slate-600 font-semibold">Rev {ch.rev}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function MarketerMock() {
  const campaigns = [
    { name: 'Summer Sale — Retargeting', roas: 6.1, status: 'up', badge: 'Top Performer', badgeColor: 'emerald' },
    { name: 'Prospecting — Lookalike 3%', roas: 2.9, status: 'down', badge: 'Needs Attention', badgeColor: 'amber' },
    { name: 'Google Brand — Exact Match', roas: 8.3, status: 'up', badge: 'Top Performer', badgeColor: 'emerald' },
    { name: 'Display — Awareness', roas: 1.4, status: 'down', badge: 'Underperforming', badgeColor: 'rose' },
  ]
  const bc: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold text-slate-800">Live Campaign Monitor</p>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Syncing
        </span>
      </div>
      <div className="space-y-2.5">
        {campaigns.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`shrink-0 ${c.status === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {c.status === 'up' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
            </div>
            <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full shrink-0 ${bc[c.badgeColor]}`}>{c.badge}</span>
            <span className="text-sm font-black text-indigo-600 shrink-0">{c.roas}x</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-2">
        <Bell size={13} className="text-indigo-500 shrink-0" />
        <p className="text-[11px] text-indigo-700 font-medium">Alert: Prospecting ROAS fell below 3x threshold</p>
      </div>
    </div>
  )
}

function GrowthMock() {
  const kpis = [
    { label: 'Blended ROAS', value: '4.8x', delta: '+0.6x', up: true },
    { label: 'Revenue', value: '$312k', delta: '+31%', up: true },
    { label: 'Blended CAC', value: '$22', delta: '-14%', up: false },
    { label: 'MER', value: '5.1x', delta: '+0.9x', up: true },
  ]
  const WEEKS = [30, 42, 38, 55, 50, 68, 72, 65, 80, 88, 84, 96]
  const W = 400, H = 70
  const max = Math.max(...WEEKS)
  const pts = WEEKS.map((v, i) => `${(i / (WEEKS.length - 1)) * W},${H - (v / max) * H}`).join(' ')
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            className="bg-slate-50/80 border border-slate-100 rounded-xl p-4"
          >
            <p className="text-[10px] text-slate-400 mb-1.5 font-medium">{k.label}</p>
            <p className="text-xl font-black text-slate-900">{k.value}</p>
            <p className={`text-[10px] font-semibold flex items-center gap-0.5 mt-1 ${k.up ? 'text-emerald-600' : 'text-rose-500'}`}>
              {k.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{k.delta} vs last month
            </p>
          </motion.div>
        ))}
      </div>
      <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-700">Revenue Trend — 12 Weeks</p>
          <span className="text-[10px] text-emerald-600 font-semibold">↑ Trending up</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
          <defs>
            <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.polygon
            points={`${pts} ${W},${H} 0,${H}`}
            fill="url(#growGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
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
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </div>
  )
}

function AgencyMock() {
  const clients = [
    { name: 'Luminary Skin', roas: 5.2, spend: '$24k', health: 'green', change: '+18%' },
    { name: 'Peak Performance', roas: 3.1, spend: '$41k', health: 'amber', change: '-4%' },
    { name: 'Bloom Botanics', roas: 6.8, spend: '$9k', health: 'green', change: '+33%' },
    { name: 'UrbanEdge Co.', roas: 1.9, spend: '$18k', health: 'red', change: '-21%' },
  ]
  const hc: Record<string, string> = { green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-rose-500' }
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold text-slate-800">Client Portfolio</p>
        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">4 active brands</span>
      </div>
      <div className="space-y-2.5">
        {clients.map((cl, i) => (
          <motion.div
            key={cl.name}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${hc[cl.health]}`} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-800">{cl.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Spend {cl.spend}/mo</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-indigo-600">{cl.roas}x</p>
              <p className={`text-[10px] font-semibold ${cl.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>{cl.change}</p>
            </div>
            <ArrowUpRight size={13} className="text-slate-300" />
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
        <Zap size={11} className="text-indigo-400 shrink-0" />
        Auto-reports sent every Monday at 9am for all 4 clients
      </div>
    </div>
  )
}

/* ─── Tab definitions ────────────────────────────────────────────── */
const CASES = [
  {
    value: 'dtc',
    label: 'DTC Founders',
    tagline: 'Revenue Intelligence',
    icon: Store,
    headline: 'One view of everything driving your store',
    subline: 'No more tab switching between Meta, Google, and Shopify. See blended ROAS, true CAC, and revenue by channel — live.',
    bullets: ['Blended ROAS across every paid channel', 'True CAC vs platform-reported numbers', 'Budget vs revenue per channel'],
    mock: <DtcMock />,
    accent: '#6366f1',
    accentLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    value: 'marketers',
    label: 'Performance Marketers',
    tagline: 'Campaign Intelligence',
    icon: Target,
    headline: 'Know which campaigns are actually working',
    subline: "Platform-reported conversions don't match Shopify revenue. Parallels shows your real winners and flags budget drains before they hurt.",
    bullets: ['Cross-channel attribution beyond last-click', 'Real-time ROAS alerts for underperformers', 'Funnel drop-off from ad click to purchase'],
    mock: <MarketerMock />,
    accent: '#06b6d4',
    accentLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    value: 'growth',
    label: 'Growth Leaders',
    tagline: 'Executive Analytics',
    icon: TrendingUp,
    headline: 'Board-ready metrics, always fresh',
    subline: 'Get blended MER, total revenue, and CAC trends without asking anyone to pull a spreadsheet. Strategic clarity, always up to date.',
    bullets: ['MER, blended ROAS, and CAC in one view', '12-week revenue trend with channel breakdown', 'Forecast based on current spend trajectory'],
    mock: <GrowthMock />,
    accent: '#8b5cf6',
    accentLight: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    value: 'agencies',
    label: 'Agencies',
    tagline: 'Portfolio Management',
    icon: Users,
    headline: 'All your clients. One command center.',
    subline: "Manage every brand account under one roof. See which clients need attention, auto-send weekly reports, and spend time on strategy — not spreadsheets.",
    bullets: ['Multi-brand portfolio dashboard', 'Automated white-label client reports', 'Save 6+ hours per week on manual pulls'],
    mock: <AgencyMock />,
    accent: '#10b981',
    accentLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
]

export default function UseCasesSection() {
  const [active, setActive] = useState('dtc')
  const current = CASES.find((c) => c.value === active)!
  const Icon = current.icon

  return (
    <section className="section-pad bg-slate-50/50 overflow-hidden" id="use-cases">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Use Cases</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Built for every role on your growth team
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Whether you're a founder or a media buyer — Parallels surfaces exactly what you need to act.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* ── Sidebar tabs ── */}
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            {CASES.map((c) => {
              const CIcon = c.icon
              const isActive = active === c.value
              return (
                <button
                  key={c.value}
                  onClick={() => setActive(c.value)}
                  className={`flex items-start gap-3.5 text-left px-4 py-4 rounded-2xl border transition-all duration-200 min-w-[180px] lg:min-w-0 shrink-0 lg:shrink
                    ${isActive
                      ? 'bg-white border-slate-200 shadow-md shadow-slate-100'
                      : 'bg-transparent border-transparent hover:bg-white/60 hover:border-slate-200'
                    }`}
                  style={isActive ? { borderLeftColor: c.accent, borderLeftWidth: '3px' } : {}}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                    style={{ backgroundColor: isActive ? `${c.accent}18` : '#f1f5f9' }}
                  >
                    <CIcon size={17} style={{ color: isActive ? c.accent : '#94a3b8' }} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                      {c.label}
                    </p>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                      {c.tagline}
                    </p>
                  </div>
                  {isActive && (
                    <div className="ml-auto shrink-0 hidden lg:block">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.accent }} />
                    </div>
                  )}
                </button>
              )
            })}

            {/* Bottom feature list on desktop */}
            <div className="hidden lg:block mt-4 px-2 pt-4 border-t border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Included in all plans</p>
              {['Real-time sync', 'Zero code setup', 'White-label reports', 'API access'].map((f) => (
                <div key={f} className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 size={12} className="text-indigo-400 shrink-0" />
                  <span className="text-xs text-slate-500">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Content panel ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg shadow-slate-100/50"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Copy */}
                <div className="p-8 lg:p-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
                  <div className={`inline-flex items-center gap-2 text-xs font-semibold border px-3 py-1.5 rounded-full mb-6 w-fit ${current.accentLight}`}>
                    <Icon size={12} />
                    {current.tagline}
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 leading-tight mb-4">
                    {current.headline}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-7">
                    {current.subline}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {current.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-3 text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${current.accent}18` }}>
                          <CheckCircle2 size={12} style={{ color: current.accent }} />
                        </div>
                        {b}
                      </li>
                    ))}
                  </ul>
                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100">
                    {[
                      { n: '< 10 min', label: 'to connect' },
                      { n: 'Real-time', label: 'data sync' },
                      { n: 'Zero code', label: 'required' },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-sm font-extrabold text-slate-900">{s.n}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock UI with browser chrome */}
                <div className="p-6 lg:p-8 bg-slate-50/60 flex flex-col">
                  {/* Browser chrome */}
                  <div className="bg-white border border-slate-200 rounded-t-xl px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="bg-slate-50 border border-slate-200 rounded px-3 py-0.5 text-[10px] text-slate-400 font-medium">
                        app.getparallels.io
                      </div>
                    </div>
                    <BarChart2 size={12} className="text-slate-300" />
                  </div>
                  {/* Content */}
                  <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl p-5 flex-1">
                    {/* Nav row */}
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                          <span className="text-white text-[9px] font-black">P</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">Parallels</span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    {current.mock}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import { Store, Target, TrendingUp, Users, ArrowUpRight, TrendingDown, BarChart2, Bell, Zap } from 'lucide-react'

/* ─── Persona mock UIs ─────────────────────────────────────────── */

function DtcMock() {
  const channels = [
    { name: 'Meta Ads', roas: 4.2, spend: '$18.4k', rev: '$77.3k', color: '#6366f1', pct: 84 },
    { name: 'Google Ads', roas: 3.8, spend: '$12.1k', rev: '$45.9k', color: '#06b6d4', pct: 70 },
    { name: 'Email', roas: 9.1, spend: '$1.2k', rev: '$10.9k', color: '#10b981', pct: 95 },
    { name: 'Organic', roas: '∞', spend: '$0', rev: '$14.2k', color: '#f59e0b', pct: 50 },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 font-medium">Total Revenue (30d)</p>
          <p className="text-2xl font-extrabold text-slate-900">$148,300</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <TrendingUp size={11} /> +22% vs last month
        </span>
      </div>
      {channels.map((ch, i) => (
        <motion.div
          key={ch.name}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="bg-white border border-slate-100 rounded-xl p-3.5 flex items-center gap-3"
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">{ch.name}</span>
              <span className="text-xs font-bold" style={{ color: ch.color }}>{ch.roas}{typeof ch.roas === 'number' ? 'x ROAS' : ' ROAS'}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: ch.color }}
                initial={{ width: 0 }}
                animate={{ width: `${ch.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">Spend: {ch.spend}</span>
              <span className="text-[10px] text-slate-500 font-medium">Rev: {ch.rev}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function MarketerMock() {
  const campaigns = [
    { name: 'Summer Sale — Retargeting', roas: 6.1, status: 'up', ctr: '3.4%', cpc: '$0.82', badge: 'Top Performer' },
    { name: 'Prospecting — Lookalike 3%', roas: 2.9, status: 'down', ctr: '1.1%', cpc: '$1.94', badge: 'Needs Attention' },
    { name: 'Google Brand — Exact Match', roas: 8.3, status: 'up', ctr: '5.2%', cpc: '$0.61', badge: 'Top Performer' },
    { name: 'Display — Awareness', roas: 1.4, status: 'down', ctr: '0.4%', cpc: '$3.10', badge: 'Underperforming' },
  ]
  const badgeStyle: Record<string, string> = {
    'Top Performer': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Needs Attention': 'bg-amber-50 text-amber-700 border-amber-200',
    'Underperforming': 'bg-rose-50 text-rose-600 border-rose-200',
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Bell size={13} className="text-indigo-500" />
        <p className="text-xs font-semibold text-slate-500">Live Campaign Monitor</p>
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      </div>
      <div className="space-y-2.5">
        {campaigns.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3"
          >
            <div className={`shrink-0 ${c.status === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {c.status === 'up' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-slate-400">CTR {c.ctr}</span>
                <span className="text-[10px] text-slate-400">CPC {c.cpc}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs font-bold text-indigo-600">{c.roas}x</span>
              <span className={`text-[9px] font-semibold border px-1.5 py-0.5 rounded-full ${badgeStyle[c.badge]}`}>
                {c.badge}
              </span>
            </div>
          </motion.div>
        ))}
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
  const trendPoints = [30, 42, 38, 55, 50, 68, 72, 65, 80, 88, 84, 96]
  const maxVal = Math.max(...trendPoints)
  const w = 280, h = 80
  const pts = trendPoints.map((v, i) => `${(i / (trendPoints.length - 1)) * w},${h - (v / maxVal) * h}`).join(' ')

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white border border-slate-100 rounded-xl p-3"
          >
            <p className="text-[10px] text-slate-500 mb-1">{k.label}</p>
            <p className="text-base font-extrabold text-slate-900">{k.value}</p>
            <p className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 ${k.up ? 'text-emerald-600' : 'text-rose-500'}`}>
              {k.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{k.delta}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="bg-white border border-slate-100 rounded-xl p-3">
        <p className="text-[10px] font-semibold text-slate-500 mb-2">Revenue Trend — 12 Weeks</p>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.polyline
            points={pts}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
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
  const healthColor: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-rose-500',
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500">Client Portfolio</p>
        <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">4 brands</span>
      </div>
      <div className="space-y-2.5">
        {clients.map((cl, i) => (
          <motion.div
            key={cl.name}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${healthColor[cl.health]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800">{cl.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Spend: {cl.spend}/mo</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-indigo-600">{cl.roas}x</p>
              <p className={`text-[10px] font-semibold ${cl.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>{cl.change}</p>
            </div>
            <ArrowUpRight size={13} className="text-slate-300 shrink-0" />
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <Zap size={10} className="text-indigo-400" />
        Auto-reports sent every Monday 9am
      </div>
    </div>
  )
}

/* ─── Tab definitions ──────────────────────────────────────────── */

const CASES = [
  {
    value: 'dtc',
    label: 'DTC Founders',
    icon: Store,
    tag: 'Revenue Intelligence',
    headline: 'One view of everything driving your store',
    subline: 'No more switching between Meta, Google, and Shopify. See blended ROAS, true CAC, and revenue by channel in a single live dashboard — updated in real time.',
    bullets: [
      'Blended ROAS across every paid channel',
      'True CAC vs platform-reported (inflated) numbers',
      'Budget vs revenue contribution per channel',
    ],
    mock: <DtcMock />,
    accent: 'indigo',
  },
  {
    value: 'marketers',
    label: 'Performance Marketers',
    icon: Target,
    tag: 'Campaign Intelligence',
    headline: 'Know which campaigns are actually working',
    subline: "Stop relying on platform-reported conversions that don't match your Shopify revenue. Parallels surfaces your real winners and flags underperformers before they drain budget.",
    bullets: [
      'Cross-channel attribution beyond last-click',
      'Real-time ROAS alerts for underperforming campaigns',
      'Funnel drop-off from ad click to purchase',
    ],
    mock: <MarketerMock />,
    accent: 'cyan',
  },
  {
    value: 'growth',
    label: 'Growth Leaders',
    icon: TrendingUp,
    tag: 'Executive Analytics',
    headline: 'Board-ready metrics, always up to date',
    subline: 'Get the blended metrics that matter — MER, total revenue, CAC trends — without asking anyone to pull a spreadsheet. Strategic clarity at a glance.',
    bullets: [
      'MER, blended ROAS, and CAC in one view',
      '12-week revenue trend with channel breakdown',
      'Forecast based on current spend trajectory',
    ],
    mock: <GrowthMock />,
    accent: 'violet',
  },
  {
    value: 'agencies',
    label: 'Agencies',
    icon: Users,
    tag: 'Portfolio Management',
    headline: 'Run every client from a single command center',
    subline: "Manage all your brand accounts under one roof. Spot which clients need attention, automate weekly reports, and spend time on strategy — not data wrangling.",
    bullets: [
      'Multi-brand portfolio dashboard',
      'Automated white-label client reports',
      'Save 6+ hours per week on manual pulls',
    ],
    mock: <AgencyMock />,
    accent: 'emerald',
  },
]

const ACCENT: Record<string, { pill: string; active: string; bar: string; glow: string }> = {
  indigo:  { pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',  active: 'bg-indigo-600 text-white border-indigo-600',  bar: 'bg-indigo-600', glow: 'shadow-indigo-100' },
  cyan:    { pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',        active: 'bg-cyan-600 text-white border-cyan-600',        bar: 'bg-cyan-600',   glow: 'shadow-cyan-100' },
  violet:  { pill: 'bg-violet-50 text-violet-700 border-violet-200',  active: 'bg-violet-600 text-white border-violet-600',  bar: 'bg-violet-600', glow: 'shadow-violet-100' },
  emerald: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-600', bar: 'bg-emerald-600', glow: 'shadow-emerald-100' },
}

export default function UseCasesSection() {
  const [active, setActive] = useState('dtc')
  const current = CASES.find((c) => c.value === active)!
  const Icon = current.icon
  const ac = ACCENT[current.accent]

  return (
    <section className="section-pad bg-slate-50 overflow-hidden" id="use-cases">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Use Cases</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Built for every role on your growth team
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Whether you're a founder, media buyer, or agency — Parallels surfaces exactly what you need to act.
          </p>
        </FadeIn>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CASES.map((c) => {
            const CIcon = c.icon
            const isActive = active === c.value
            const a = ACCENT[c.accent]
            return (
              <button
                key={c.value}
                onClick={() => setActive(c.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                  isActive ? a.active + ' shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <CIcon size={15} />
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Content panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`bg-white border border-slate-200 rounded-3xl shadow-xl ${ac.glow} overflow-hidden`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left: copy */}
              <div className="p-8 lg:p-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
                {/* Tag */}
                <div className={`inline-flex items-center gap-2 text-xs font-semibold border px-3 py-1.5 rounded-full mb-5 w-fit ${ac.pill}`}>
                  <Icon size={12} />
                  {current.tag}
                </div>

                <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                  {current.headline}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-7">
                  {current.subline}
                </p>

                <ul className="space-y-3.5 mb-8">
                  {current.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${ac.bar}`} />
                      {b}
                    </li>
                  ))}
                </ul>

                {/* Stat strip */}
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

              {/* Right: mock UI */}
              <div className="p-8 lg:p-10 bg-slate-50/60 flex flex-col">
                {/* Browser chrome bar */}
                <div className="bg-white border border-slate-200 rounded-t-xl px-4 py-2.5 flex items-center gap-2 mb-0">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-slate-100 rounded-md px-4 py-1 text-[10px] text-slate-400 font-medium">
                      app.getparallels.io / dashboard
                    </div>
                  </div>
                </div>
                {/* Mock content */}
                <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl p-5 flex-1">
                  {/* Nav row */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white text-[9px] font-bold">P</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">Parallels</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart2 size={12} className="text-slate-400" />
                      <span className="text-[10px] text-slate-400">Analytics</span>
                    </div>
                  </div>
                  {current.mock}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

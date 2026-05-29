import { motion } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import {
  Store, Target, TrendingUp, Users, ChevronRight,
  BarChart2, Bell, Zap, CheckCircle2,
} from 'lucide-react'

const ROLES = [
  {
    icon: Store,
    label: 'DTC Founders',
    tagline: 'Revenue Intelligence',
    headline: 'Know exactly where every dollar of revenue comes from.',
    desc: 'Stop guessing which channel is actually working. See blended ROAS, true CAC, and revenue by channel in one live view — not five disconnected dashboards.',
    metric: { value: '4.8x', label: 'avg. blended ROAS seen by DTC founders' },
    bullets: [
      'Blended ROAS across Meta, Google & Email',
      'True CAC — not inflated platform numbers',
      'Revenue contribution per channel, live',
    ],
    color: '#6366f1',
    bg: 'from-indigo-950/70 to-slate-900/70',
    border: 'border-indigo-500/20',
    glow: 'bg-indigo-600/10',
    tagColor: 'text-indigo-300 bg-indigo-950/60 border-indigo-800/50',
    accentBar: 'bg-indigo-500',
    mini: [
      { label: 'Meta ROAS', value: '4.2x', color: '#6366f1', pct: 80 },
      { label: 'Google', value: '3.8x', color: '#06b6d4', pct: 65 },
      { label: 'Email', value: '9.1x', color: '#10b981', pct: 95 },
    ],
  },
  {
    icon: Target,
    label: 'Performance Marketers',
    tagline: 'Campaign Intelligence',
    headline: "Find your winners. Kill your losers. Instantly.",
    desc: "Platform-reported conversions don't match Shopify revenue. Parallels computes real attribution so you know which campaigns to scale and which to cut — before they drain budget.",
    metric: { value: '6 hrs', label: 'saved per week on cross-platform reporting' },
    bullets: [
      'Cross-channel attribution beyond last-click',
      'Real-time alerts when ROAS drops below target',
      'Funnel drop-off: ad click → cart → purchase',
    ],
    color: '#06b6d4',
    bg: 'from-cyan-950/70 to-slate-900/70',
    border: 'border-cyan-500/20',
    glow: 'bg-cyan-600/10',
    tagColor: 'text-cyan-300 bg-cyan-950/60 border-cyan-800/50',
    accentBar: 'bg-cyan-500',
    mini: [
      { label: 'Retarget', value: '6.1x ↑', color: '#10b981', pct: 90 },
      { label: 'Prospect', value: '2.9x ↓', color: '#f59e0b', pct: 42 },
      { label: 'Brand KW', value: '8.3x ↑', color: '#06b6d4', pct: 98 },
    ],
  },
  {
    icon: TrendingUp,
    label: 'Growth Leaders',
    tagline: 'Executive Analytics',
    headline: 'Board-ready metrics. Zero analyst required.',
    desc: "Get MER, blended ROAS, and CAC trends without asking anyone to pull a spreadsheet. Parallels keeps your executive view always fresh, with 12-week trends built in.",
    metric: { value: '31%', label: 'average revenue growth reported after 60 days' },
    bullets: [
      'MER, blended ROAS, and CAC at a glance',
      '12-week revenue trend with channel breakdown',
      'One-click reports for board presentations',
    ],
    color: '#8b5cf6',
    bg: 'from-violet-950/70 to-slate-900/70',
    border: 'border-violet-500/20',
    glow: 'bg-violet-600/10',
    tagColor: 'text-violet-300 bg-violet-950/60 border-violet-800/50',
    accentBar: 'bg-violet-500',
    mini: [
      { label: 'MER',     value: '5.1x', color: '#8b5cf6', pct: 88 },
      { label: 'Revenue', value: '$312k', color: '#10b981', pct: 75 },
      { label: 'CAC',     value: '$22',  color: '#06b6d4', pct: 40 },
    ],
  },
  {
    icon: Users,
    label: 'Agencies',
    tagline: 'Portfolio Management',
    headline: 'All your clients. One command center.',
    desc: "Manage every brand under one roof. See instantly which clients need attention, auto-deliver white-label reports, and stop wasting 11 hours a week pulling data manually.",
    metric: { value: '4×', label: 'more clients managed per analyst with Parallels' },
    bullets: [
      'Multi-brand portfolio with health indicators',
      'Automated white-label client reports',
      'Instant view: which clients need attention',
    ],
    color: '#10b981',
    bg: 'from-emerald-950/70 to-slate-900/70',
    border: 'border-emerald-500/20',
    glow: 'bg-emerald-600/10',
    tagColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/50',
    accentBar: 'bg-emerald-500',
    mini: [
      { label: 'Luminary', value: '5.2x ↑', color: '#10b981', pct: 85 },
      { label: 'Peak',     value: '3.1x →', color: '#f59e0b', pct: 52 },
      { label: 'Bloom',    value: '6.8x ↑', color: '#06b6d4', pct: 95 },
    ],
  },
]

export default function UseCasesSection() {
  return (
    <section className="relative bg-[#07071a] py-28 overflow-hidden" id="use-cases">
      <div className="absolute inset-0 dot-grid-dark opacity-30 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 glow-line" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-4 border border-indigo-900/60 bg-indigo-950/40 px-3 py-1 rounded-full">
            Who it's for
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-5">
            Built for every role on your{' '}
            <span className="gradient-text-hero">growth team</span>
          </h2>
          <p className="text-lg text-white/45 max-w-xl mx-auto">
            Whether you run the brand or run the ads — Parallels surfaces exactly what you need to make the next right move.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ROLES.map((role, i) => {
            const Icon = role.icon
            return (
              <motion.div
                key={role.label}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                className="group relative"
              >
                {/* Glow bg */}
                <div className={`absolute -inset-2 ${role.glow} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className={`relative bg-gradient-to-br ${role.bg} border ${role.border} rounded-3xl p-7 overflow-hidden h-full flex flex-col`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${role.color}22`, border: `1px solid ${role.color}40` }}>
                        <Icon size={20} style={{ color: role.color }} />
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-white">{role.label}</p>
                        <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${role.tagColor}`}>
                          {role.tagline}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-colors mt-1" />
                  </div>

                  {/* Headline */}
                  <h3 className="text-xl font-extrabold text-white leading-snug mb-3">
                    {role.headline}
                  </h3>
                  <p className="text-sm text-white/45 leading-relaxed mb-6 flex-1">
                    {role.desc}
                  </p>

                  {/* Mini metric bar */}
                  <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 size={12} style={{ color: role.color }} />
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Live snapshot</p>
                    </div>
                    <div className="space-y-2.5">
                      {role.mini.map((m) => (
                        <div key={m.label} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40 w-14 shrink-0">{m.label}</span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: m.color }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${m.pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.9, delay: 0.2 }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-white/70 shrink-0 w-10 text-right">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bullets */}
                  <ul className="space-y-2 mb-5">
                    {role.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-sm text-white/60">
                        <CheckCircle2 size={14} style={{ color: role.color }} className="shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* Bottom metric */}
                  <div className={`flex items-center gap-3 pt-4 border-t border-white/8`}>
                    <div>
                      <p className="text-2xl font-black text-white">{role.metric.value}</p>
                      <p className="text-[11px] text-white/35 leading-snug">{role.metric.label}</p>
                    </div>
                    <div className="ml-auto">
                      <div className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: `${role.color}18`, color: role.color, border: `1px solid ${role.color}30` }}>
                        <Zap size={10} />
                        See how
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-14 text-center"
        >
          <div className="inline-flex items-center gap-3 glass-dark border border-white/10 rounded-2xl px-6 py-3.5">
            <Bell size={15} className="text-indigo-400 shrink-0" />
            <p className="text-sm text-white/60">
              All plans include real-time alerts, automated reports, and zero-code setup.
            </p>
            <span className="text-indigo-400 text-sm font-semibold whitespace-nowrap">14-day free →</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

import * as Tabs from '@radix-ui/react-tabs'
import { FadeIn } from './AnimationHelpers'
import { Store, Target, TrendingUp, Users, CheckCircle } from 'lucide-react'

const CASES = [
  {
    value: 'dtc',
    label: 'DTC Owners',
    icon: Store,
    headline: "Know exactly what's growing your store",
    bullets: [
      'See total revenue attributed to each ad channel in one place',
      'Track blended ROAS and true CAC across Meta and Google',
      'Stop second-guessing budget allocation — let data decide',
    ],
  },
  {
    value: 'marketers',
    label: 'Performance Marketers',
    icon: Target,
    headline: 'Optimize campaigns with the full picture',
    bullets: [
      'Cross-channel attribution beyond platform-reported conversions',
      'Real-time ROAS alerts when campaigns underperform',
      'Funnel drop-off analysis from ad click to purchase',
    ],
  },
  {
    value: 'growth',
    label: 'Growth Leaders',
    icon: TrendingUp,
    headline: 'Make strategic decisions faster',
    bullets: [
      'Executive-ready dashboards with blended channel metrics',
      'Identify highest-leverage growth opportunities automatically',
      'Forecast revenue based on current spend trajectory',
    ],
  },
  {
    value: 'agencies',
    label: 'Agencies',
    icon: Users,
    headline: 'Deliver better results for every client',
    bullets: [
      'Multi-client dashboard — manage all brands from one view',
      'White-label reporting with your brand',
      'Save 6+ hours per week on manual data pulls',
    ],
  },
]

export default function UseCasesSection() {
  return (
    <section className="section-pad bg-slate-50" id="use-cases">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Use Cases</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Built for every role on your team
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Whether you're a founder or a media buyer, Parallels surfaces what matters to you.
          </p>
        </FadeIn>

        <Tabs.Root defaultValue="dtc">
          <Tabs.List className="flex flex-wrap gap-2 justify-center mb-10">
            {CASES.map((c) => {
              const Icon = c.icon
              return (
                <Tabs.Trigger
                  key={c.value}
                  value={c.value}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 bg-white transition-all
                    data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 data-[state=active]:shadow-md"
                >
                  <Icon size={15} />
                  {c.label}
                </Tabs.Trigger>
              )
            })}
          </Tabs.List>

          {CASES.map((c) => {
            const Icon = c.icon
            return (
              <Tabs.Content key={c.value} value={c.value}>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center shadow-sm">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">{c.headline}</h3>
                    <ul className="space-y-4">
                      {c.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3 text-slate-600">
                          <CheckCircle size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                          <span className="text-sm leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100 flex items-center justify-center">
                      <Icon size={56} className="text-indigo-400" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            )
          })}
        </Tabs.Root>
      </div>
    </section>
  )
}

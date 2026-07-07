import { FadeIn } from './AnimationHelpers'
import { Shield, Lock, Globe, Star, Quote } from 'lucide-react'

const TRUST_ITEMS = [
  { icon: Shield, title: 'SOC 2 Type II', desc: 'Enterprise-grade security controls (certification in progress).', color: 'indigo' },
  { icon: Globe, title: 'GDPR Compliant', desc: 'Data residency controls and DPA available for EU customers.', color: 'cyan' },
  { icon: Lock, title: 'TLS Encrypted', desc: 'All data encrypted in transit and at rest. No exceptions.', color: 'emerald' },
]

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600' },
  cyan:    { bg: 'bg-cyan-50',    icon: 'text-cyan-600' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
}

export default function TrustSection() {
  return (
    <section className="section-pad bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Trust & Security</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Built for security-conscious teams</h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">Your data is never sold, never shared, and never used to train models.</p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {TRUST_ITEMS.map((it, i) => {
            const Icon = it.icon; const c = COLOR_MAP[it.color]
            return (
              <FadeIn key={it.title} delay={i * 0.1}>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                  <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}><Icon size={22} className={c.icon} /></div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{it.title}</h3>
                  <p className="text-sm text-slate-500">{it.desc}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
        <FadeIn>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 lg:p-12 text-center shadow-sm max-w-3xl mx-auto">
            <div className="flex justify-center gap-1 mb-4">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={18} className="text-amber-400 fill-amber-400" />))}</div>
            <Quote size={32} className="text-indigo-200 mx-auto mb-4" />
            <blockquote className="text-lg font-medium text-slate-700 leading-relaxed mb-6">
              "Parallels replaced three separate dashboards and saved my team 8 hours a week on reporting. We finally know which channels are actually profitable."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">SR</div>
              <div className="text-left"><p className="text-sm font-semibold text-slate-900">Sarah R.</p><p className="text-xs text-slate-500">CMO, DTC Fashion Brand · Early Access User</p></div>
            </div>
            <p className="text-xs text-slate-400 mt-6">Trusted by <span className="font-semibold text-slate-600">50+ D2C brands</span> in early access</p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

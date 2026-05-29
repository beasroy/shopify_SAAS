import { FadeIn } from './AnimationHelpers'
import { AlertTriangle, ArrowRight, Layers } from 'lucide-react'

const SILOS = [
  { name: 'Meta Ads', color: '#1877F2', problem: 'Reach & engagement data locked in Ads Manager' },
  { name: 'Google Ads', color: '#4285F4', problem: 'Keyword spend & conversions in a separate silo' },
  { name: 'Shopify', color: '#96BF48', problem: 'Revenue & orders disconnected from ad data' },
]

export default function DataChallengeSection() {
  return (
    <section className="section-pad bg-slate-50 overflow-hidden" id="problem">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">The Problem</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Your data is fragmented.{' '}<span className="gradient-text">Your decisions shouldn’t be.</span></h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">Every platform tells a different story. Without a unified view, you’re making six-figure decisions in the dark.</p>
        </FadeIn>
        <div className="flex flex-col lg:flex-row items-center gap-6 justify-center">
          <div className="flex flex-col gap-4 w-full lg:w-auto">
            {SILOS.map((silo, i) => (
              <FadeIn key={silo.name} delay={i * 0.1} direction="left">
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-sm w-full lg:w-64">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: silo.color }}>{silo.name[0]}</div>
                  <div><p className="text-sm font-semibold text-slate-800">{silo.name}</p><p className="text-xs text-slate-500 mt-0.5">{silo.problem}</p></div>
                  <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.3} direction="none" className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="hidden lg:block w-px h-16 bg-gradient-to-b from-slate-200 to-indigo-400" />
              <div className="bg-indigo-600 rounded-full p-3 shadow-lg shadow-indigo-200"><ArrowRight size={20} className="text-white" /></div>
              <div className="hidden lg:block w-px h-16 bg-gradient-to-b from-indigo-400 to-slate-200" />
            </div>
          </FadeIn>
          <FadeIn delay={0.45} direction="right">
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-xl shadow-indigo-100 w-full lg:w-72">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center"><Layers size={18} className="text-white" /></div>
                <div><p className="text-sm font-bold text-slate-900">Parallels</p><p className="text-xs text-indigo-600">Unified source of truth</p></div>
              </div>
              <div className="space-y-2">
                {['Cross-channel ROAS', 'Revenue attribution', 'Unified funnel', 'Real-time sync'].map((it) => (
                  <div key={it} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 block" /></span>{it}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'

const INTEGRATIONS = [
  { name: 'Meta Ads', color: '#1877F2', bg: '#E7F0FF', abbr: 'M' },
  { name: 'Google Ads', color: '#4285F4', bg: '#E8F0FE', abbr: 'G' },
  { name: 'Google Analytics 4', color: '#E37400', bg: '#FFF3E0', abbr: 'GA4' },
  { name: 'Shopify', color: '#96BF48', bg: '#F1F8E9', abbr: 'S' },
  { name: 'Meta Ads', color: '#1877F2', bg: '#E7F0FF', abbr: 'M' },
  { name: 'Google Ads', color: '#4285F4', bg: '#E8F0FE', abbr: 'G' },
  { name: 'Google Analytics 4', color: '#E37400', bg: '#FFF3E0', abbr: 'GA4' },
  { name: 'Shopify', color: '#96BF48', bg: '#F1F8E9', abbr: 'S' },
]

export default function WhyParallelsSection() {
  return (
    <section className="section-pad bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Integrations</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Works with your entire stack</h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">Native integrations — data syncs automatically, no webhooks to maintain.</p>
        </FadeIn>
        <div className="overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4 marquee-track w-max">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((integ, i) => (
              <div key={`${integ.name}-${i}`} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm shrink-0 min-w-[180px]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: integ.bg, color: integ.color }}>{integ.abbr}</div>
                <span className="text-sm font-medium text-slate-700">{integ.name}</span>
              </div>
            ))}
          </div>
        </div>
        <motion.div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          {[
            { title: '5-minute setup', desc: 'Connect all platforms with OAuth — no engineering required.' },
            { title: 'Real-time sync', desc: 'Data refreshes every 15 minutes so you never make stale decisions.' },
            { title: 'No data limits', desc: 'Query historical data without row limits or sampling.' },
          ].map((f) => (
            <div key={f.title} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-base font-bold text-slate-900 mb-2">{f.title}</h4>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

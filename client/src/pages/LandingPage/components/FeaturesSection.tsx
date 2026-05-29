import { motion } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import { LayoutDashboard, TrendingUp, Target, PieChart, Bell, FileBarChart, Sparkles } from 'lucide-react'

const FEATURES = [
  { icon: LayoutDashboard, title: 'Unified Dashboard', desc: 'All your channels in one real-time view — no more tab switching.', color: 'indigo' },
  { icon: TrendingUp, title: 'ROAS Tracking', desc: 'True cross-channel return on ad spend, not platform-reported vanity numbers.', color: 'cyan' },
  { icon: Target, title: 'Revenue Attribution', desc: 'Know which campaigns actually drove the sale — first-touch to last.', color: 'emerald' },
  { icon: PieChart, title: 'Channel Mix', desc: 'Visualize budget allocation vs. revenue contribution across every channel.', color: 'violet' },
  { icon: Bell, title: 'Real-time Alerts', desc: 'Get notified when ROAS drops, spend spikes, or anomalies appear.', color: 'amber' },
  { icon: FileBarChart, title: 'Custom Reports', desc: 'Build and share reports that match how your team actually thinks.', color: 'rose' },
  { icon: Sparkles, title: 'AI Insights', desc: 'Surface patterns and recommendations automatically — no analyst needed.', color: 'indigo' },
]

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-indigo-100' },
  cyan:    { bg: 'bg-cyan-50',    icon: 'text-cyan-600',    border: 'border-cyan-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    border: 'border-rose-100' },
}

export default function FeaturesSection() {
  return (
    <section className="section-pad bg-white" id="features">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Features</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Everything you need to grow smarter</h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">Built for D2C brands that want insight, not just data.</p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            const c = COLOR_MAP[feature.color] ?? COLOR_MAP.indigo
            return (
              <motion.div key={feature.title} className="bento-card bg-white border border-slate-100 rounded-2xl p-6 transition-all duration-300 cursor-default" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }} whileHover={{ y: -4 }}>
                <div className={`w-10 h-10 ${c.bg} ${c.border} border rounded-xl flex items-center justify-center mb-4`}><Icon size={18} className={c.icon} /></div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

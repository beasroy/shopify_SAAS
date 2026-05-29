import { motion } from 'framer-motion'
import { CountUp, FadeIn } from './AnimationHelpers'

const STATS = [
  { value: 5, suffix: 'x', label: 'Faster insights', sub: 'vs. manual reporting' },
  { value: 40, suffix: '%', label: 'Less reporting time', sub: 'saved per week' },
  { value: 3, suffix: '+', label: 'Platforms unified', sub: 'in one dashboard' },
  { value: 99, suffix: '%', label: 'Data accuracy', sub: 'real-time sync' },
]

export default function MetricsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.04]" />
      <div className="relative max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-12">
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-2">By the numbers</p>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Results that speak for themselves
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl lg:text-5xl font-extrabold text-white mb-1">
                <CountUp end={stat.value} suffix={stat.suffix} duration={1800} />
              </div>
              <p className="text-indigo-100 font-semibold text-sm">{stat.label}</p>
              <p className="text-indigo-300 text-xs mt-0.5">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

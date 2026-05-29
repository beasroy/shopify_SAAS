import { motion } from 'framer-motion'
import { CountUp, FadeIn } from './AnimationHelpers'

const STATS = [
  { value: 5, suffix: 'x', label: 'Faster insights', sub: 'vs. manual reporting' },
  { value: 40, suffix: '%', label: 'Less reporting time', sub: 'saved per week' },
  { value: 4, suffix: '+', label: 'Platforms unified', sub: 'in one dashboard' },
  { value: 99, suffix: '%', label: 'Data accuracy', sub: 'real-time sync' },
]

export default function MetricsSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600" />
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />
      {/* Subtle top/bottom fade */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-3">By the numbers</p>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Results that speak for themselves
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative text-center bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight">
                <CountUp end={stat.value} suffix={stat.suffix} duration={1800} />
              </div>
              <p className="text-indigo-100 font-semibold text-sm">{stat.label}</p>
              <p className="text-indigo-300/70 text-xs mt-1">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

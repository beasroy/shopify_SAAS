import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function FinalCTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600" />
      <div className="absolute inset-0 bg-grid-white/[0.04]" />
      {/* orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-4">Get Started</p>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-6">
            Ready to unify your marketing data?
          </h2>
          <p className="text-indigo-200 text-lg mb-10 max-w-xl mx-auto">
            Join 50+ D2C brands already getting clearer insights with Parallels. Free 14-day trial, no credit card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-7 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-xl text-sm"
            >
              Get Demo <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border-2 border-white/40 hover:border-white/70 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
            >
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

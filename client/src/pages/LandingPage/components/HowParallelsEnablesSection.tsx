import { motion } from 'framer-motion'
import { FadeIn } from './AnimationHelpers'
import { TrendingUp, ShoppingBag, Filter, CheckCircle } from 'lucide-react'

function RoasMockChart() {
  const bars = [
    { label: 'Meta', roas: 3.8, color: '#6366f1', spend: '$12k' },
    { label: 'Google', roas: 4.9, color: '#06b6d4', spend: '$8k' },
    { label: 'GA4', roas: 2.1, color: '#f59e0b', spend: '$4k' },
  ]
  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-sm">
      <p className="text-xs font-semibold text-slate-500 mb-4">Cross-Channel ROAS</p>
      <div className="space-y-4">
        {bars.map((b, i) => (
          <div key={b.label}>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5"><span className="font-medium">{b.label}</span><span className="font-bold" style={{ color: b.color }}>{b.roas}x ROAS</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: b.color }} initial={{ width: 0 }} whileInView={{ width: `${(b.roas / 6) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: 'easeOut' }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Spend: {b.spend}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunnelMock() {
  const steps = [
    { label: 'Ad Impressions', value: '220k', pct: 100, color: '#6366f1' },
    { label: 'Clicks', value: '12.4k', pct: 60, color: '#818cf8' },
    { label: 'Product Views', value: '6.8k', pct: 40, color: '#06b6d4' },
    { label: 'Add to Cart', value: '2.1k', pct: 22, color: '#0ea5e9' },
    { label: 'Purchases', value: '890', pct: 10, color: '#10b981' },
  ]
  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-sm">
      <p className="text-xs font-semibold text-slate-500 mb-4">Conversion Funnel</p>
      <div className="flex flex-col items-center gap-1">
        {steps.map((s, i) => (
          <motion.div key={s.label} className="flex items-center gap-3 w-full" initial={{ opacity: 0, scaleX: 0.5 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
            <div className="h-8 rounded-md flex items-center justify-between px-3" style={{ width: `${s.pct}%`, backgroundColor: s.color, minWidth: '40%' }}>
              <span className="text-white text-[10px] font-semibold truncate">{s.label}</span>
              <span className="text-white text-[10px] font-bold ml-2 shrink-0">{s.value}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function RevMock() {
  return (
    <div className="glass-card rounded-2xl p-6 w-full max-w-sm">
      <p className="text-xs font-semibold text-slate-500 mb-4">Revenue Attribution (Last 30d)</p>
      <div className="flex items-center justify-center mb-4">
        <svg viewBox="0 0 120 120" className="w-28 h-28">
          {[
            { color: '#6366f1', pct: 42, offset: 0 },
            { color: '#06b6d4', pct: 31, offset: 42 },
            { color: '#10b981', pct: 20, offset: 73 },
            { color: '#f59e0b', pct: 7, offset: 93 },
          ].map((seg, i) => {
            const r = 44; const circ = 2 * Math.PI * r
            return (<motion.circle key={i} cx="60" cy="60" r={r} fill="none" stroke={seg.color} strokeWidth="16" strokeDasharray={`${(seg.pct / 100) * circ} ${circ}`} strokeDashoffset={-((seg.offset / 100) * circ)} strokeLinecap="butt" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }} />)
          })}
          <text x="60" y="55" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">$128k</text>
          <text x="60" y="68" textAnchor="middle" fontSize="7" fill="#94a3b8">Revenue</text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[{ label: 'Meta Ads', color: '#6366f1', pct: '42%' }, { label: 'Google Ads', color: '#06b6d4', pct: '31%' }, { label: 'Organic', color: '#10b981', pct: '20%' }, { label: 'Other', color: '#f59e0b', pct: '7%' }].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-slate-500">{l.label}</span><span className="font-semibold text-slate-800 ml-auto">{l.pct}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  { tag: 'Cross-Channel Visibility', title: 'See your true ROAS across every channel', desc: 'Platform-reported numbers lie. Parallels computes actual blended ROAS by unifying ad spend with Shopify revenue — so you know where every dollar is really working.', bullets: ['Meta vs Google vs Organic breakdown', 'Spend vs revenue per channel', 'Day-over-day ROAS trend'], mock: <RoasMockChart />, reverse: false, icon: TrendingUp },
  { tag: 'Revenue Attribution', title: 'Know exactly which campaigns drove sales', desc: 'Connect Shopify order data directly to your ad campaigns. Understand first-touch, last-touch, and assisted attribution — without paying for a separate attribution tool.', bullets: ['Order-level campaign attribution', 'Multi-touch attribution models', 'LTV by acquisition channel'], mock: <RevMock />, reverse: true, icon: ShoppingBag },
  { tag: 'Funnel Analytics', title: 'Find where customers drop — and why', desc: 'Visualize the full customer journey from ad impression to purchase. Identify the biggest drop-off points and fix them before they cost you revenue.', bullets: ['Full-funnel visualization', 'Step-by-step drop-off rates', 'Segment by channel or campaign'], mock: <FunnelMock />, reverse: false, icon: Filter },
]

export default function HowParallelsEnablesSection() {
  return (
    <section className="section-pad bg-slate-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3 block">Feature Deep Dives</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">The details that make the difference</h2>
        </FadeIn>
        <div className="space-y-24">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${f.reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <motion.div initial={{ opacity: 0, x: f.reverse ? 40 : -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut' }}>
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"><Icon size={12} />{f.tag}</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 leading-snug">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">{f.desc}</p>
                  <ul className="space-y-3">{f.bullets.map((b) => (<li key={b} className="flex items-center gap-2.5 text-sm text-slate-600"><CheckCircle size={16} className="text-indigo-500 shrink-0" />{b}</li>))}</ul>
                </motion.div>
                <motion.div className="flex justify-center" initial={{ opacity: 0, x: f.reverse ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}>{f.mock}</motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

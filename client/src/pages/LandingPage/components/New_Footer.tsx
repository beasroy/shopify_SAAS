import { Link } from 'react-router-dom'

type NavLink = { label: string; href: string; internal?: boolean }
type Column = { heading: string; links: NavLink[] }

const COLUMNS: Column[] = [
  { heading: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'How It Works', href: '#how-it-works' }, { label: 'Integrations', href: '#integrations' }, { label: 'Use Cases', href: '#use-cases' }] },
  { heading: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Careers', href: '#' }] },
  { heading: 'Legal', links: [{ label: 'Privacy Policy', href: '/privacy-policy', internal: true }, { label: 'Terms of Service', href: '/terms-and-conditions', internal: true }] },
]

export default function NewFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center"><span className="text-white text-xs font-bold">P</span></div>
              <span className="font-bold text-lg text-white tracking-tight">Parallels</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">Unified marketing analytics for D2C brands that want to grow smarter, not harder.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">{col.heading}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.internal
                      ? <Link to={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">{link.label}</Link>
                      : <a href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">{link.label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Parallels. All rights reserved.</p>
          <p>Built for D2C growth teams.</p>
        </div>
      </div>
    </footer>
  )
}

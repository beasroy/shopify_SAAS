
import { Button } from '@/components/ui/button'
import Logo from "@/assets/messold-icon.png";
import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="container px-10 flex h-16 items-center justify-between">
      <Link to="/">
      <div className="flex items-center gap-2 font-bold text-xl">
      <img src={Logo} alt="Messold Logo" className="h-8 w-8" />
        <span>Parallels</span>
      </div>
      </Link>
      <nav className="hidden md:flex gap-6">
        <Link to="#features" className="text-sm font-medium hover:text-primary">
          Features
        </Link>
        <Link to="#integrations" className="text-sm font-medium hover:text-primary">
          Integrations
        </Link>
        <Link to="#analytics" className="text-sm font-medium hover:text-primary">
          Analytics
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <Link to="/login" className="text-sm font-medium hover:text-primary">
          Log in
        </Link>
        <Button>Get Started</Button>
      </div>
    </div>
  </header>
  )
}

export default Navbar
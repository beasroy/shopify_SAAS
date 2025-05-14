import Logo from "@/assets/messold-icon.png";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="w-full border-t bg-slate-900 text-white">
      <div className="container px-6 pt-16 pb-12 flex justify-center items-center">
        <div className="flex flex-col items-center space-y-10">
          {/* Logo & Brand Name */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center gap-2 font-semibold text-2xl tracking-tight">
              <img src={Logo} alt="Messold Logo" className="h-8 w-8" />
              <span className="text-slate-100">Parallels</span>
            </div>

            {/* Tagline */}
            <p className="text-sm text-slate-400 text-center max-w-sm">
              The all-in-one marketing platform for growing businesses.
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-4 text-sm font-medium">
            <Link
              to="/privacy-policy"
              className="text-slate-400 transition hover:text-blue-400"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-500">|</span>
            <Link
              to="#"
              className="text-slate-400 transition hover:text-blue-400"
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

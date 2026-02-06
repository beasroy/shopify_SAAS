import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? "bg-black/95 backdrop-blur-md"
        : "bg-transparent"
        }`}
    >
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-accent-gradient rounded-lg flex items-center justify-center animate-pulse-glow">
                <span className="text-accent font-bold text-xl">P</span>
              </div>
            </div>
            <span className="text-accent font-bold text-2xl tracking-tight">
              Parallels
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {["Features", "Use Cases", "How It Works", "Why Parallels"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-accent/90 hover:text-accent transition-colors text-sm font-medium relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              className="text-accent/90 hover:text-accent hover:bg-accent/10 py-5"
            >
              Request Demo
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="bg-accent-gradient text-accent hover:opacity-90 transition-opacity py-5">
              Get Early Access
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-primary-foreground p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden  mt-4 pb-4 border-t border-primary-foreground/40 animate-fade-in-up">
            <nav className="flex flex-col gap-4 mt-4">
              {["Features", "Use Cases", "How It Works", "Why Parallels"].map((item) => (
                <Link
                  key={item}
                  to={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-accent/10 py-2  rounded-md transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-primary-foreground/40">
                <Button
                  onClick={() => navigate('/login')}
                  variant="ghost" className="text-accent/90 hover:text-accent hover:bg-accent/10 justify-start">
                  Request Demo
                </Button>
                <Button onClick={() => navigate('/login')} className="bg-accent-gradient text-primary-foreground">
                  Get Early Access
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );

}

export default Navbar;


// import { Button } from "@/components/ui/button";
// import Logo from "@/assets/messold-icon.png";
// import { useDispatch,useSelector } from "react-redux";
// import { RootState } from "@/store";
// import axios from "axios";
// import { clearUser } from "@/store/slices/UserSlice";
// import { resetBrand } from "@/store/slices/BrandSlice";
// import { baseURL } from "@/data/constant";
// import { useNavigate, Link } from "react-router-dom";

// function Navbar() {
//   const user = useSelector((state: RootState) => state.user.user);
//   const dispatch = useDispatch();
//   const navigate = useNavigate();

//   const handleLogout = async () => {
//     try {
//         const response = await axios.post(`${baseURL}/api/auth/logout`, {}, { withCredentials: true });
//         if (response.status === 200) {
//             dispatch(clearUser());
//             dispatch(resetBrand());
//             navigate('/');
//         }
//     } catch (error) {
//         console.error('Error logging out:', error);
//     }
// };
//   return (
//     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
//       <div className="container px-10 flex h-16 items-center justify-between">
//         <Link to="/">
//           <div className="flex items-center gap-2 font-bold text-xl">
//             <img src={Logo} alt="Messold Logo" className="h-8 w-8" />
//             <span>Parallels</span>
//           </div>
//         </Link>
//         <nav className="hidden md:flex gap-6">
//           <Link to="#features" className="text-sm font-medium hover:text-primary">
//             Features
//           </Link>
//           <Link to="#integrations" className="text-sm font-medium hover:text-primary">
//             Integrations
//           </Link>
//           <Link to="#analytics" className="text-sm font-medium hover:text-primary">
//             Analytics
//           </Link>
//         </nav>
//         <div className="flex items-center gap-4">
//           {user ? (
//             <div className="flex items-center gap-3">
//               <Link to="/dashboard" className="text-sm font-medium hover:text-primary">
//                 Dashboard
//               </Link>
//               <Button variant="outline" onClick={handleLogout}>Log Out</Button>
//             </div>
//           ) : (
//             <>
//               <Link to="/login" className="text-sm font-medium hover:text-primary">
//                 Log in
//               </Link>
//               <Link to="/login" >
//               <Button>Get Started</Button>
//               </Link>
//             </>
//           )}
//         </div>
//       </div>
//     </header>
//   );
// }

// export default Navbar;

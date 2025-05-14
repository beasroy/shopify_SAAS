import { Button } from "@/components/ui/button";
import Logo from "@/assets/messold-icon.png";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import axios from "axios";
import { clearUser } from "@/store/slices/UserSlice";
import { resetBrand } from "@/store/slices/BrandSlice";
import { baseURL } from "@/data/constant";
import { useNavigate, Link } from "react-router-dom";

function Navbar() {
  const user = useSelector((state: RootState) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${baseURL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        dispatch(clearUser());
        dispatch(resetBrand());
        navigate("/");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-10 flex h-16 items-center justify-between">
        <Link to="/">
          <div className="flex items-center gap-2 font-bold text-xl">
            <img src={Logo} alt="Messold Logo" className="h-8 w-8" />
            <span>Parallels</span>
          </div>
        </Link>
        {/* <nav className="hidden md:flex gap-6">
          <Link to="#features" className="text-sm font-medium hover:text-primary">
            Features
          </Link>
          <Link to="#integrations" className="text-sm font-medium hover:text-primary">
            Integrations
          </Link>
          <Link to="#analytics" className="text-sm font-medium hover:text-primary">
            Analytics
          </Link>
        </nav> */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="text-sm font-medium hover:text-primary"
              >
                Dashboard
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          ) : (
            <>
              {/* <Link
                to="/login"
                className="text-sm font-medium hover:text-primary transition duration-150"
              >
                Log in
              </Link> */}
              <Link to="/login">
                <Button className="bg-[#0A0A1B] hover:bg-[#ececef] hover:text-[#0A0A1B] transition duration-150">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

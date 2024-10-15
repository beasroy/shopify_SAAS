import React from 'react';
import { LogOut, User, ShoppingBag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext' 

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser(); 

  const handleLogout = async () => {
    try {
      await axios.post('http://3.109.203.156:8000/auth/logout', {}, {
        withCredentials: true
      });
      setUser(null); 
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <ShoppingBag className="h-8 w-8 text-purple-600 mr-2" />
            <span className="font-bold text-xl text-gray-800">Shopify</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-800 hover:bg-gray-100">
              <User className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">{user?.username || 'User'}</span>
            </Button>
            <Button 
              variant="outline" 
              className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" 
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};



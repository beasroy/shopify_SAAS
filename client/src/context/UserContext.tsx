import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  brands: [];
  hasSeenLandingSlides?: boolean;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  showLandingPopup: boolean;
  setShowLandingPopup: (show: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [showLandingPopup, setShowLandingPopup] = useState(() => {
    if (!user) return false;
    // Only show landing popup if user has no brands
    return !user.hasSeenLandingSlides && (!user.brands || user.brands.length === 0);
  });

  // Sync localStorage whenever user data changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Show landing popup when user logs in and hasn't seen it
  useEffect(() => {
    if (user && !user.hasSeenLandingSlides && (!user.brands || user.brands.length === 0)) {
      setShowLandingPopup(true);
    }
  }, [user]);

  const updateUser = (newUser: User | null) => {
    if (newUser && !newUser.hasSeenLandingSlides && (!newUser.brands || newUser.brands.length === 0)) {
      setShowLandingPopup(true);
    }
    setUser(newUser);
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser: updateUser,
      showLandingPopup,
      setShowLandingPopup
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

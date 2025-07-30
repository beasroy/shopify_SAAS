import React from 'react';
import { useTokenExpire } from '@/hooks/useTokenExpire';

interface AutoLogoutProps {
  children: React.ReactNode;
}

const AutoLogout: React.FC<AutoLogoutProps> = ({ children }) => {
 
 
  useTokenExpire();

  return <>{children}</>;
};

export default AutoLogout; 
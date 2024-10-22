import React, { createContext, useContext, useState } from 'react';

interface BrandContextType {
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;
  resetBrand: () => void; 
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const resetBrand = () => {
    setSelectedBrandId(null);
  };

  return (
    <BrandContext.Provider value={{ selectedBrandId, setSelectedBrandId, resetBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};

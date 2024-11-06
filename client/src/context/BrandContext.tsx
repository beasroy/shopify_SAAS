import React, { createContext, useContext, useState } from 'react';

interface Brand {
  _id: string;
  name: string;
  brandId:string;
  fbAdAccounts?: []; 
}

interface BrandContextType {
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;
  resetBrand: () => void;
  brands: Brand[];
  setBrands: (brands: Brand[]) => void; // New setter function for brands
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]); // New state for brands

  const resetBrand = () => {
    setSelectedBrandId(null);
  };

  return (
    <BrandContext.Provider value={{ selectedBrandId, setSelectedBrandId, resetBrand, brands, setBrands }}>
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

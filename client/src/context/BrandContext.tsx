import React, { createContext, useContext, useState, useEffect } from 'react';

interface Brand {
  _id: string;
  name: string;
  brandId: string;
  fbAdAccounts?: [];
  googleAdAccount?: string;
}

interface BrandContextType {
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;
  resetBrand: () => void;
  brands: Brand[];
  setBrands: (brands: Brand[]) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Load brands from local storage when the component mounts
  useEffect(() => {
    const storedBrands = localStorage.getItem('brands');
    if (storedBrands) {
      setBrands(JSON.parse(storedBrands));
    }
  }, []);

  // Whenever brands state changes, save them to local storage
  useEffect(() => {
    if (brands.length > 0) {
      localStorage.setItem('brands', JSON.stringify(brands));
    }
  }, [brands]);

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

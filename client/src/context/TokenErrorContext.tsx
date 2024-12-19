import React, { createContext, useContext, useState } from "react";

interface TokenErrorContextType {
  tokenError: boolean;
  setTokenError: React.Dispatch<React.SetStateAction<boolean>>;
}

const TokenErrorContext = createContext<TokenErrorContextType>({
  tokenError: false,
  setTokenError: () => {}
});

export const TokenErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokenError, setTokenError] = useState(false);

  return (
    <TokenErrorContext.Provider value={{ tokenError, setTokenError }}>
      {children}
    </TokenErrorContext.Provider>
  );
};

export const useTokenError = () => useContext(TokenErrorContext);

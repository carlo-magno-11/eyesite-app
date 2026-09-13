import React, { createContext, useContext, useState } from "react";

type ThemeContextType = {
  colorScheme: "light" | "dark";
  setColorScheme: (s: "light" | "dark") => void;
};

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: "light",
  setColorScheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeProvider;
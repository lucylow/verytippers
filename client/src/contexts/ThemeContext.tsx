import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      try {
        const stored = localStorage.getItem("theme");
        if (stored === "light" || stored === "dark") {
          return stored as Theme;
        }
      } catch (error) {
        // localStorage might not be available (e.g., private browsing, disabled)
        console.warn("Failed to read theme from localStorage:", error);
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (!root) {
        throw new Error("Document root element not found");
      }

      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      if (switchable) {
        try {
          localStorage.setItem("theme", theme);
        } catch (storageError) {
          // localStorage might not be available (e.g., private browsing, quota exceeded)
          console.warn("Failed to save theme to localStorage:", storageError);
          // Continue without saving - theme will still work for current session
        }
      }
    } catch (error) {
      console.error("Failed to apply theme:", error);
      // Fallback: try to apply theme without DOM manipulation
      // This is a last resort and shouldn't normally happen
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        try {
          setTheme(prev => {
            const newTheme = prev === "light" ? "dark" : "light";
            
            // Optimistically update localStorage
            try {
              localStorage.setItem("theme", newTheme);
            } catch (storageError) {
              console.warn("Failed to save theme preference:", storageError);
              // Continue anyway - theme state will still update
            }
            
            return newTheme;
          });
        } catch (error) {
          console.error("Failed to toggle theme:", error);
          // Don't update state if toggle fails
        }
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Enhanced error message with recovery suggestion
    const error = new Error(
      "useTheme must be used within ThemeProvider. " +
      "Make sure your component is wrapped with <ThemeProvider>."
    );
    
    // Log with context
    console.error("ThemeContext error:", {
      error: error.message,
      stack: error.stack,
      componentStack: new Error().stack,
    });
    
    throw error;
  }
  return context;
}

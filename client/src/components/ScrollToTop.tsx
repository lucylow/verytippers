import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Component that scrolls to top when route changes
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Smooth scroll to top on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [location]);

  return null;
}


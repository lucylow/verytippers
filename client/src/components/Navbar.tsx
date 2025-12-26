import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { WalletButton } from "./WalletButton";
import { VeryLogo } from "./brand";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

// Navigation routes configuration
const navRoutes = [
  { href: "/", label: "Home", exact: true },
  { href: "/demo", label: "Live Demo" },
  { href: "/nft", label: "NFT Marketplace" },
  { href: "/p2p", label: "P2P Demo" },
  { href: "/tokens", label: "Token Ecosystem" },
  { href: "/dao", label: "DAO" },
  { href: "/verychain", label: "Verychain" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        backdropRef.current &&
        !backdropRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop for mobile menu */}
      {isOpen && (
        <div
          ref={backdropRef}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <VeryLogo size="md" variant="full" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              {navRoutes.map((route) => (
                <NavLink
                  key={route.href}
                  href={route.href}
                  exact={route.exact}
                  className="pb-1"
                  activeClassName="font-semibold"
                >
                  {route.label}
                </NavLink>
              ))}
              <WalletButton />
              <button className="gradient-bg text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Try in VeryChat
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden text-foreground p-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          ref={mobileMenuRef}
          className={cn(
            "md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border shadow-lg transition-all duration-300 ease-in-out overflow-hidden",
            isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 py-4 space-y-1">
            {navRoutes.map((route) => (
              <NavLink
                key={route.href}
                href={route.href}
                exact={route.exact}
                className="block px-4 py-3 rounded-lg hover:bg-accent transition-colors"
                activeClassName="bg-accent font-semibold"
              >
                {route.label}
              </NavLink>
            ))}
            <div className="pt-4 mt-4 border-t border-border">
              <WalletButton />
            </div>
            <button className="gradient-bg text-primary-foreground px-5 py-3 rounded-xl font-semibold w-full mt-4 hover:opacity-90 transition-opacity">
              Try in VeryChat
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

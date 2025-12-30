import { useState, useEffect, useRef } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { WalletButton } from "./WalletButton";
import { VeryLogo } from "./brand";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";
import { useDemo } from "@/contexts/DemoContext";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";

// Navigation routes configuration - all 10 pages
const navRoutes = [
  { href: "/", label: "Home", exact: true },
  { href: "/demo", label: "Tip Demo" },
  { href: "/p2p", label: "P2P" },
  { href: "/nft", label: "NFT" },
  { href: "/tokens", label: "Tokens" },
  { href: "/dao", label: "DAO" },
  { href: "/verychain", label: "Chain" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  
  // Safe access to demo context (may not be wrapped yet)
  let demoMode = true;
  let setDemoMode = (_: boolean) => {};
  let user = null;
  
  try {
    const demoContext = useDemo();
    demoMode = demoContext.demoMode;
    setDemoMode = demoContext.setDemoMode;
    user = demoContext.user;
  } catch {
    // Context not available, use defaults
  }

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
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              {navRoutes.map((route) => (
                <NavLink
                  key={route.href}
                  href={route.href}
                  exact={route.exact}
                  className="pb-1 text-sm"
                  activeClassName="font-semibold"
                >
                  {route.label}
                </NavLink>
              ))}
              
              {/* Demo Mode Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Demo</span>
                <Switch
                  checked={demoMode}
                  onCheckedChange={setDemoMode}
                  className="scale-75"
                />
              </div>
              
              {demoMode && (
                <Badge variant="secondary" className="text-xs">
                  {user?.displayName || 'Demo User'}
                </Badge>
              )}
              
              <WalletButton />
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              {demoMode && (
                <Badge variant="secondary" className="text-xs">
                  Demo
                </Badge>
              )}
              <button
                className="text-foreground p-2 rounded-md hover:bg-accent transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
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
            
            {/* Demo Mode Toggle - Mobile */}
            <div className="flex items-center justify-between px-4 py-3 mt-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Demo Mode</span>
              </div>
              <Switch
                checked={demoMode}
                onCheckedChange={setDemoMode}
              />
            </div>
            
            <div className="pt-4 mt-4 border-t border-border">
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "wouter";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💸</span>
            <span className="text-xl font-bold">
              Very<span className="gradient-text">Tippers</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Features
            </a>
            <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Live Demo
            </a>
            <a href="#integration" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Integration
            </a>
            <Link href="/dao" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              DAO
            </Link>
            <a href="#team" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Team
            </a>
            <button className="gradient-bg text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Try in VeryChat
            </button>
          </div>

          <button 
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">Live Demo</a>
            <a href="#integration" className="text-muted-foreground hover:text-foreground transition-colors">Integration</a>
            <Link href="/dao" className="text-muted-foreground hover:text-foreground transition-colors">DAO</Link>
            <a href="#team" className="text-muted-foreground hover:text-foreground transition-colors">Team</a>
            <button className="gradient-bg text-primary-foreground px-5 py-2.5 rounded-xl font-semibold w-full">
              Try in VeryChat
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

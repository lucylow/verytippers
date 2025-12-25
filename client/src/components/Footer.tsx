import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Leaderboards", href: "#leaderboard" },
      { label: "Badges", href: "#badges" },
    ],
    Resources: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "Blog", href: "#" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Team", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: <Twitter size={20} />, href: "#", label: "Twitter" },
    { icon: <Github size={20} />, href: "#", label: "GitHub" },
    { icon: <Linkedin size={20} />, href: "#", label: "LinkedIn" },
    { icon: <Mail size={20} />, href: "#", label: "Email" },
  ];

  return (
    <footer className="bg-foreground/5 border-t border-border">
      <div className="container py-16">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <span className="font-bold text-lg">VeryTippers</span>
            </div>
            <p className="text-sm text-foreground/70 mb-6">
              The first social micro-tipping bot for Very Network.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  className="w-10 h-10 rounded-lg bg-foreground/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-foreground/70 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-foreground/70">
            © {currentYear} VeryTippers. All rights reserved. Built for VERY Network.
          </div>
          <div className="flex items-center gap-6 text-sm text-foreground/70">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>

        {/* Hackathon Badge */}
        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-xs text-foreground/60 mb-2">
            🏆 Finalist in VERY Hackathon 2025 (Extended)
          </p>
          <p className="text-xs text-foreground/50">
            Prize Pool: $73,000 USD | Powered by DoraHacks
          </p>
        </div>
      </div>
    </footer>
  );
}

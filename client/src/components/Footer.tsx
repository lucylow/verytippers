import { VeryLogo } from "./brand";

const footerLinks = {
  resources: [
    { 
      label: "VeryChat API Docs", 
      url: "https://developers.verylabs.io/",
      description: "Complete API documentation and setup guide"
    },
    { 
      label: "Project Registration", 
      url: "https://developers.verylabs.io/",
      description: "Register your project to get API credentials"
    },
    { 
      label: "VERY Chain Docs", 
      url: "https://wp.verylabs.io/verychain",
      description: "VERY Chain network specifications"
    },
    { 
      label: "Wepin Wallet Docs", 
      url: "https://docs.wepin.io/en",
      description: "Web3 wallet integration guide"
    },
  ],
  project: [
    { label: "Live Demo", url: "#demo" },
    { label: "Features", url: "#features" },
    { label: "Integration", url: "#integration" },
    { label: "Team", url: "#team" },
  ],
  hackathon: [
    { label: "VERY Hackathon Page", url: "https://dorahacks.io/very-hackathon" },
    { label: "Our Submission", url: "#" },
    { label: "Judging Criteria", url: "#" },
    { label: "Timeline", url: "#" },
  ],
};

export const Footer = () => {
  return (
    <footer className="py-16 bg-very-gray-900 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="mb-4">
              <VeryLogo size="lg" variant="full" />
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Social micro-tipping bot for Very Network. Part of the VERY Hackathon 2025.
            </p>
            <div className="flex gap-4">
              {["GitHub", "Twitter", "Telegram", "Discord"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-muted-foreground hover:text-secondary transition-colors text-sm"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target={link.url.startsWith("http") ? "_blank" : undefined}
                    rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm group"
                    title={link.description}
                  >
                    <span className="flex items-center gap-1">
                      {link.label}
                      {link.url.startsWith("http") && (
                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </span>
                    {link.description && (
                      <span className="block text-xs text-muted-foreground/70 mt-0.5">
                        {link.description}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Project</h4>
            <ul className="space-y-3">
              {footerLinks.project.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Hackathon</h4>
            <ul className="space-y-3">
              {footerLinks.hackathon.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target={link.url.startsWith("http") ? "_blank" : undefined}
                    rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© 2025 SocialFi Labs. VeryTippers is a submission for the VERY Hackathon.</p>
          <p className="mt-2">
            Built on <span className="text-primary">Very Network</span> • Powered by{" "}
            <span className="text-secondary">Very Chain</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

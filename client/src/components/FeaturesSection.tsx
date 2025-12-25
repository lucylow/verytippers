import { Zap, Users, Trophy, Coins, Shield, Zap as ZapIcon } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: <Coins className="w-8 h-8" />,
      title: "Micro-Tipping",
      description: "Send VERY, USDC, or other tokens as tips directly in chat. Minimum friction, maximum impact.",
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: "Real-Time Leaderboards",
      description: "Compete on weekly and all-time leaderboards. See who's the most generous tipper.",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Community Engagement",
      description: "Reward great content and helpful answers. Build stronger communities through appreciation.",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure & Verified",
      description: "KYC-verified users ensure safe transactions. All tips are immutable on-chain.",
    },
    {
      icon: <ZapIcon className="w-8 h-8" />,
      title: "Gasless Transactions",
      description: "No gas fees for users. Relayer service sponsors transactions for optimal UX.",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Achievement Badges",
      description: "Unlock NFT badges for milestones. Community-funded badge pools for extra rewards.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold">Powerful Features</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Everything you need to reward creators and build engaged communities on Very Network
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                <div className="text-primary">{feature.icon}</div>
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-foreground/70 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-foreground/70 mb-4">Ready to get started?</p>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
          >
            Explore the full platform
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

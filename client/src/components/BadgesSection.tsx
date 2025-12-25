import { Award, Zap, Users, Target } from "lucide-react";

export function BadgesSection() {
  const badges = [
    {
      icon: "🎯",
      name: "First Tip",
      description: "Send your first tip",
      rarity: "Common",
    },
    {
      icon: "💎",
      name: "Generous Soul",
      description: "Send 10+ tips",
      rarity: "Uncommon",
    },
    {
      icon: "👑",
      name: "Community Pillar",
      description: "Tip 50+ unique users",
      rarity: "Rare",
    },
    {
      icon: "⚡",
      name: "7-Day Streak",
      description: "Tip for 7 consecutive days",
      rarity: "Epic",
    },
    {
      icon: "🌟",
      name: "Legendary Tipper",
      description: "Reach #1 on leaderboard",
      rarity: "Legendary",
    },
    {
      icon: "🚀",
      name: "Early Adopter",
      description: "Join VeryTippers in first month",
      rarity: "Exclusive",
    },
  ];

  const rarityColors = {
    Common: "from-slate-400 to-slate-500",
    Uncommon: "from-green-400 to-green-500",
    Rare: "from-blue-400 to-blue-500",
    Epic: "from-purple-400 to-purple-500",
    Legendary: "from-yellow-400 to-yellow-500",
    Exclusive: "from-pink-400 to-pink-500",
  };

  return (
    <section id="badges" className="py-20">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 w-fit mx-auto">
            <Award size={18} className="text-primary" />
            <span className="text-sm font-medium">Achievements</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold">Unlock Badges</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Earn NFT badges for milestones and achievements. Showcase your contributions to the community.
          </p>
        </div>

        {/* Badges Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge, i) => {
            const rarityKey = badge.rarity as keyof typeof rarityColors;
            return (
              <div
                key={i}
                className="glass-card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Badge Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${rarityColors[rarityKey]} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <span className="text-3xl">{badge.icon}</span>
                </div>

                {/* Badge Info */}
                <h3 className="text-lg font-semibold mb-2">{badge.name}</h3>
                <p className="text-foreground/70 text-sm mb-4">{badge.description}</p>

                {/* Rarity Badge */}
                <div className="inline-block">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r ${rarityColors[rarityKey]} text-white`}>
                    {badge.rarity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Community Funding Section */}
        <div className="mt-16 glass-card p-12 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">Community-Funded Badge Pools</h3>
            <p className="text-foreground/70 mb-6">
              Community members can fund badge pools to add rewards. When users unlock badges, they receive tokens from the pool!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="glass-card p-4">
                <div className="text-2xl font-bold gradient-text">$12.5K</div>
                <div className="text-sm text-foreground/70">Total Pool Funding</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-2xl font-bold gradient-text">847</div>
                <div className="text-sm text-foreground/70">Community Contributors</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-2xl font-bold gradient-text">$45K</div>
                <div className="text-sm text-foreground/70">Distributed to Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

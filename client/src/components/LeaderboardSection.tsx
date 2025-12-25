import { Trophy, TrendingUp } from "lucide-react";

export function LeaderboardSection() {
  const leaderboardData = [
    { rank: 1, name: "Alice Chen", tips: 2847, badge: "🏆" },
    { rank: 2, name: "Bob Martinez", tips: 2156, badge: "🥈" },
    { rank: 3, name: "Carol Smith", tips: 1923, badge: "🥉" },
    { rank: 4, name: "David Lee", tips: 1654, badge: "⭐" },
    { rank: 5, name: "Emma Wilson", tips: 1421, badge: "⭐" },
  ];

  return (
    <section id="leaderboard" className="py-20 bg-gradient-to-b from-transparent via-accent/5 to-transparent">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 w-fit mx-auto">
            <Trophy size={18} className="text-primary" />
            <span className="text-sm font-medium">Leaderboards</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold">Top Tippers</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Celebrate the most generous members of our community
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="max-w-2xl mx-auto glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/70">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/70">User</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground/70">Tips Sent</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((user, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-primary/5 transition-colors last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{user.badge}</span>
                        <span className="font-bold text-lg text-primary">#{user.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp size={16} className="text-accent" />
                        <span className="font-semibold text-primary">{user.tips.toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-2xl mx-auto">
          {[
            { label: "Weekly Leaders", value: "5" },
            { label: "All-Time Champions", value: "∞" },
            { label: "Active Participants", value: "3.4K" },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-6 text-center">
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-foreground/70 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

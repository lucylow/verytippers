import { VeryEcosystem } from '@/components/VeryEcosystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Zap, Shield, Users } from 'lucide-react';

export default function TokenEcosystem() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Coins className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">$VERY Token Ecosystem</h1>
            <p className="text-muted-foreground mt-1">
              Complete utility token system for VeryTippers
            </p>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Medium of Appreciation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use $VERY to tip creators and show appreciation for quality content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <CardTitle className="text-base">Reputation Signal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Build reputation through tips received, unlock multipliers and leaderboard boosts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base">Anti-Spam Mechanism</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Stake $VERY to unlock tipping capacity and prevent sybil attacks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base">Governance Weight</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Voting power based on tokens, reputation, and NFTs - rewards contribution over whales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Utility Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What $VERY Does</CardTitle>
          <CardDescription>
            $VERY is not just a currency. It's a complete economic system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Medium of Appreciation
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Tips consume VERY, not ETH. Gasless UX preserved.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Reputation Signal
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Leaderboards, boosts, and multipliers based on lifetime tips received.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Governance Weight
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                DAO voting power = Token Balance + (Received × 100) + NFT Multiplier
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                Gamification Fuel
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Badges, multipliers, and achievements powered by $VERY.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">5</Badge>
                Anti-Spam Mechanism
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Stake-based rate limits prevent sybil attacks economically.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">6</Badge>
                Programmable Incentive Layer
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                AI suggests, contracts enforce. Separation of powers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Ecosystem Dashboard */}
      <VeryEcosystem />
    </div>
  );
}


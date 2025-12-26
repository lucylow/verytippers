import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Network, 
  Code, 
  Settings, 
  Award, 
  Users, 
  Zap, 
  Shield, 
  ArrowRight,
  Link as LinkIcon,
  CheckCircle2,
  Sparkles
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  {
    icon: Network,
    title: "EVM Compatible",
    description: "Fully compatible with Ethereum Virtual Machine, enabling seamless migration of existing dApps and smart contracts.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Code,
    title: "Smart Contract Development",
    description: "Develop and deploy smart contracts using familiar Ethereum tooling and standards.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Settings,
    title: "Network Specification",
    description: "Optimized network specifications designed for high performance and scalability.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Award,
    title: "Node Reward Policy",
    description: "Validators receive 20% of total issuance (2 billion VERY tokens) as rewards for network participation.",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: Users,
    title: "Node-Driven",
    description: "Decentralized network powered by validators holding Node NFTs, ensuring true decentralization.",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: Shield,
    title: "Ethereum Fork",
    description: "Built on Ethereum's proven architecture, following all Ethereum network upgrades for compatibility.",
    color: "from-red-500 to-rose-500"
  }
];

const specifications = [
  { label: "Chain ID", value: "4613" },
  { label: "Network Type", value: "EVM Compatible" },
  { label: "Consensus", value: "Proof of Stake" },
  { label: "RPC URL", value: "https://rpc.verychain.org" },
  { label: "Testnet RPC", value: "https://rpc.testnet.verychain.org" },
  { label: "Block Time", value: "~12 seconds" }
];

const rewardInfo = {
  totalRewards: "2 Billion VERY",
  percentage: "20%",
  description: "of total issuance allocated to validators"
};

export default function Verychain() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Very Network Blockchain</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Verychain
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              A decentralized blockchain network powered by validators holding Node NFTs. 
              Built as an Ethereum fork with enhanced reward mechanisms for network participants.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://wp.verylabs.io/verychain"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                View Full Documentation
                <LinkIcon className="w-4 h-4" />
              </a>
              <a
                href="https://rpc.verychain.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Connect to Network
                <Zap className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Key Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary mb-2">{rewardInfo.percentage}</div>
                <div className="text-muted-foreground">Total Issuance Allocation</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-secondary mb-2">{rewardInfo.totalRewards}</div>
                <div className="text-muted-foreground">Validator Rewards</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-pink-900/30 to-pink-800/20 border-pink-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-pink-400 mb-2">EVM</div>
                <div className="text-muted-foreground">Fully Compatible</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-20 bg-very-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-3xl mb-4">About Verychain</CardTitle>
                <CardDescription className="text-lg">
                  Verychain is a fork of Ethereum, designed to provide enhanced rewards for network validators 
                  while maintaining full compatibility with the Ethereum ecosystem.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Verychain follows all Ethereum network upgrades, ensuring seamless compatibility with 
                    existing Ethereum tooling, wallets, and dApps.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Validators participating in the node proofing of Verychain are allocated 20% of the 
                    total issuance, which amounts to 2 billion VERY tokens as rewards.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    The network is driven by validators holding Node NFTs, creating a truly decentralized 
                    and community-governed blockchain infrastructure.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Key Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore the powerful features that make Verychain a leading EVM-compatible blockchain
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-primary/50 transition-all duration-300 group">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Network Specifications */}
      <section className="py-20 bg-very-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Network Specifications</h2>
              <p className="text-xl text-muted-foreground">
                Technical details for developers and network participants
              </p>
            </div>

            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-xl">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {specifications.map((spec, index) => (
                    <motion.div
                      key={spec.label}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-primary/50 transition-colors"
                    >
                      <span className="text-muted-foreground font-medium">{spec.label}</span>
                      <span className="text-foreground font-mono font-semibold">{spec.value}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Reward Policy Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <Card className="bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-pink-900/30 border-primary/30 backdrop-blur-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10" />
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-3xl">Node Reward Policy</CardTitle>
                </div>
                <CardDescription className="text-lg">
                  Incentivizing network participation through fair and transparent rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="text-5xl font-bold text-primary mb-2">{rewardInfo.percentage}</div>
                    <div className="text-muted-foreground">of Total Issuance</div>
                  </div>
                  <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="text-5xl font-bold text-secondary mb-2">{rewardInfo.totalRewards}</div>
                    <div className="text-muted-foreground">Total Rewards Pool</div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Validators participating in the node proofing of Verychain are allocated 20% of the total 
                  issuance, which amounts to 2 billion VERY tokens as rewards. The final amount of rewards 
                  is determined through the total number of validators and their participation in network consensus.
                </p>
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <span>Learn more about node rewards</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-20 bg-very-gray-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Explore More</h2>
            <p className="text-xl text-muted-foreground">
              Dive deeper into Verychain documentation and resources
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {[
              { title: "Introduce Verychain", href: "https://wp.verylabs.io/verychain", icon: Network },
              { title: "EVM Basics", href: "https://wp.verylabs.io/verychain", icon: Code },
              { title: "Smart Contract Development", href: "https://wp.verylabs.io/verychain", icon: Settings },
              { title: "Network Specification", href: "https://wp.verylabs.io/verychain", icon: Zap },
              { title: "Node Reward Policy", href: "https://wp.verylabs.io/verychain", icon: Award },
              { title: "Node-Driven Architecture", href: "https://wp.verylabs.io/verychain", icon: Users },
            ].map((link, index) => (
              <motion.a
                key={link.title}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                variants={fadeInUp}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-primary/50 transition-all duration-300 cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                        <link.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                          {link.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Read more</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}


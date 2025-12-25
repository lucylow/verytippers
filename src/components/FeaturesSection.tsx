import { useState } from "react";
import { Zap, Shield, Gamepad2, Bot } from "lucide-react";
import { toast } from "sonner";

export const FeaturesSection = () => {
  const [gasLevel, setGasLevel] = useState(0);

  const showGaslessDemo = () => {
    setGasLevel(0);
    setTimeout(() => {
      setGasLevel(100);
      setTimeout(() => {
        setGasLevel(0);
        toast.success("Gas fees sponsored by VeryTippers relayer! 🎁");
      }, 1000);
    }, 500);
  };

  const features = [
    {
      icon: Zap,
      title: "Gasless Tipping",
      description: "Meta-transaction relayer pays gas fees. Users tip without worrying about blockchain fees.",
      demo: (
        <div className="bg-very-gray-900 rounded-xl p-4 mt-4 cursor-pointer hover:bg-very-gray-800 transition-colors" onClick={showGaslessDemo}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Gas Fee</span>
            <span className="text-secondary font-semibold">{gasLevel === 0 ? "0 VERY 🎁" : "Calculating..."}</span>
          </div>
          <div className="w-full h-2 bg-very-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000" 
              style={{ width: `${gasLevel}%` }}
            />
          </div>
          <button className="text-secondary text-sm font-semibold mt-3 hover:underline">Click to See Demo →</button>
        </div>
      ),
    },
    {
      icon: Shield,
      title: "KYC-Verified Safety",
      description: "Leverages Very Network's KYC system. Tips are secure and compliant with regulations.",
      demo: (
        <div className="flex gap-2 mt-4">
          {[
            { level: "Level 2", label: "Full KYC", active: true },
            { level: "Level 1", label: "Basic KYC", active: false },
            { level: "Level 0", label: "No KYC", active: false },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex-1 text-center p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                item.active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-semibold text-sm">{item.level}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Gamepad2,
      title: "Gamification Layer",
      description: "Earn badges, climb leaderboards, and build streaks. Make tipping fun and engaging.",
      demo: (
        <div className="flex gap-3 mt-4 justify-center">
          {[
            { emoji: "🥇", title: "First Tip" },
            { emoji: "💖", title: "Generous Soul" },
            { emoji: "🔥", title: "Streak Master" },
            { emoji: "🏛️", title: "Community Pillar" },
          ].map((badge, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-very-gray-900 rounded-xl flex items-center justify-center text-2xl border-2 border-border hover:border-primary hover:scale-110 transition-all cursor-pointer"
              title={badge.title}
              onClick={() => toast.info(`Badge: ${badge.title}`)}
            >
              {badge.emoji}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Bot,
      title: "VeryChat Native",
      description: "Direct integration with VeryChat messenger. Works where your community already is.",
      demo: (
        <div className="flex gap-3 mt-4 justify-center">
          {[
            { icon: "💬", label: "VeryChat" },
            { icon: "👛", label: "Wepin" },
            { icon: "⛓️", label: "VERY Chain" },
          ].map((item, i) => (
            <div
              key={i}
              className="w-14 h-14 bg-very-gray-900 rounded-xl flex flex-col items-center justify-center border-2 border-border hover:border-primary transition-all cursor-pointer group"
              title={item.label}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="py-24 bg-very-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Why <span className="gradient-text">VeryTippers</span> Wins
          </h2>
          <p className="text-muted-foreground text-lg">
            Built specifically for Very Network's live ecosystem
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-2xl p-8 hover:border-primary transition-all hover:-translate-y-1 group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-5xl mb-4">
                <feature.icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              {feature.demo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

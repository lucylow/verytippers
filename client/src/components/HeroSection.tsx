import { useEffect, useState } from "react";
import { ArrowRight, Zap, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendTipToBackend } from "@/lib/web3";
import { toast } from "sonner";

export function HeroSection() {
  const [stats, setStats] = useState({
    tips: 12847,
    users: 3456,
    volume: 48750,
  });

  const [animatedStats, setAnimatedStats] = useState({
    tips: 0,
    users: 0,
    volume: 0,
  });

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimatedStats({
        tips: Math.floor(stats.tips * progress),
        users: Math.floor(stats.users * progress),
        volume: Math.floor(stats.volume * progress),
      });

      if (step >= steps) {
        clearInterval(interval);
        setAnimatedStats(stats);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        tips: prev.tips + Math.floor(Math.random() * 10),
        users: prev.users + Math.floor(Math.random() * 3),
        volume: prev.volume + Math.floor(Math.random() * 100),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-24 pb-32 overflow-hidden">
      {/* Background gradient orb */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-slide-up space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 w-fit">
              <span className="text-lg">🏆</span>
              <span className="text-sm font-medium">VERY Hackathon 2025 Finalist</span>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Send <span className="gradient-text">Tips</span>, Not Just Messages
              </h1>
              <p className="text-lg text-foreground/70 leading-relaxed">
                The first social micro-tipping bot for Very Network. Reward great content,
                support creators, and build communities with instant crypto tips.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 gap-2"
                onClick={async () => {
                  try {
                    toast.info("Simulating tip to @alice...");
                    const result = await sendTipToBackend("userA", "userB", 1, "Great job on the hackathon!");
                    if (result.success) {
                      toast.success(result.message);
                    } else {
                      toast.error(result.message || "Failed to send tip");
                    }
                  } catch (error) {
                    console.error("Error sending tip:", error);
                    const errorMessage = error instanceof Error 
                      ? error.message 
                      : "An unexpected error occurred while sending the tip";
                    toast.error(errorMessage);
                  }
                }}
              >
                Send Mock Tip (API Test)
                <Send size={18} />
              </Button>
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-border">
              {[
                { value: animatedStats.tips.toLocaleString(), label: "Tips Sent" },
                { value: animatedStats.users.toLocaleString(), label: "Active Users" },
                { value: `$${animatedStats.volume.toLocaleString()}`, label: "Total Volume" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-xs lg:text-sm text-foreground/60 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Feature Highlights */}
          <div className="hidden lg:flex flex-col gap-6">
            {[
              {
                icon: "⚡",
                title: "Gasless Transactions",
                desc: "Send tips without worrying about gas fees",
              },
              {
                icon: "🔐",
                title: "KYC-Verified",
                desc: "Safe and secure community interactions",
              },
              {
                icon: "🎯",
                title: "Real-Time Leaderboards",
                desc: "Compete and celebrate top contributors",
              },
              {
                icon: "🏅",
                title: "Achievement Badges",
                desc: "Unlock badges for milestones and achievements",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{feature.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-foreground/60 mt-1">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

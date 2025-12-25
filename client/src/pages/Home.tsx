import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { LeaderboardSection } from "@/components/LeaderboardSection";
import { BadgesSection } from "@/components/BadgesSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <LeaderboardSection />
        <BadgesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

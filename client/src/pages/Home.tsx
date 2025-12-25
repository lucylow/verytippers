import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { DemoSection } from "@/components/DemoSection";
import { IntegrationSection } from "@/components/IntegrationSection";
import { TeamSection } from "@/components/TeamSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <IntegrationSection />
        <TeamSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

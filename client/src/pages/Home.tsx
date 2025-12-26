import React from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { DemoSection } from "@/components/DemoSection";
import { IntegrationSection } from "@/components/IntegrationSection";
import { TeamSection } from "@/components/TeamSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";

// Component-level error boundary wrapper
function SectionErrorBoundary({ children, sectionName }: { children: React.ReactNode; sectionName: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="py-8 px-4 text-center">
          <p className="text-muted-foreground">
            Failed to load {sectionName}. The rest of the page should still work.
          </p>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error(`Error in ${sectionName}:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Failed to load navigation</h1>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        <Navbar />
      </ErrorBoundary>
      <main>
        <SectionErrorBoundary sectionName="Hero Section">
          <HeroSection />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="Features Section">
          <FeaturesSection />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="Demo Section">
          <DemoSection />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="Integration Section">
          <IntegrationSection />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="Team Section">
          <TeamSection />
        </SectionErrorBoundary>
        <SectionErrorBoundary sectionName="CTA Section">
          <CTASection />
        </SectionErrorBoundary>
      </main>
      <ErrorBoundary
        fallback={
          <div className="py-4 px-4 text-center text-sm text-muted-foreground">
            Footer unavailable
          </div>
        }
      >
        <Footer />
      </ErrorBoundary>
    </div>
  );
}

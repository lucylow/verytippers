import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

export function CTASection() {
  return (
    <section id="cta" className="py-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10" />

      <div className="container relative z-10">
        <div className="glass-card p-12 lg:p-16 text-center max-w-3xl mx-auto">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>

          {/* Content */}
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Revolutionize Tipping?
          </h2>
          <p className="text-lg text-foreground/70 mb-8 leading-relaxed">
            Join thousands of users already rewarding creators and building communities on Very Network.
            Start sending tips today and unlock a new way to support the people you care about.
          </p>

          {/* Features List */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10 py-8 border-y border-border">
            {[
              "🚀 Instant Setup",
              "⚡ Gasless Transactions",
              "🏆 Real-Time Leaderboards",
            ].map((feature, i) => (
              <div key={i} className="text-sm font-medium text-foreground/80">
                {feature}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2">
              Launch VeryTippers
              <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="outline">
              Read Documentation
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-foreground/70">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <span>VERY Hackathon Finalist</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-border rounded-full" />
            <div className="flex items-center gap-2">
              <span className="text-lg">🔐</span>
              <span>KYC-Verified & Secure</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-border rounded-full" />
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span>Powered by VERY Chain</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Connect Wallet",
      description: "Link your Verychat wallet to VeryTippers bot in seconds",
    },
    {
      number: "02",
      title: "Send Tips",
      description: "Use /tip command to send VERY, USDC, or other tokens to users",
    },
    {
      number: "03",
      title: "Earn Rewards",
      description: "Climb leaderboards and unlock achievement badges",
    },
    {
      number: "04",
      title: "Withdraw Anytime",
      description: "Withdraw your tips to your wallet whenever you want",
    },
  ];

  return (
    <section id="how-it-works" className="py-20">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold">How It Works</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Get started with VeryTippers in just a few simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-[60%] w-[calc(100%+2rem)] h-0.5 bg-gradient-to-r from-primary to-accent" />
              )}

              {/* Step Card */}
              <div className="glass-card p-8 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-foreground/70">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Demo Code Block */}
        <div className="mt-16 glass-card p-8 max-w-2xl mx-auto">
          <div className="text-sm font-mono space-y-2 text-foreground/80">
            <div className="text-primary"># Send a tip in VeryChat</div>
            <div className="text-accent">/tip @alice 10 VERY "Great post!"</div>
            <div className="mt-4 text-primary"># View your stats</div>
            <div className="text-accent">/stats</div>
            <div className="mt-4 text-primary"># Check leaderboard</div>
            <div className="text-accent">/leaderboard</div>
          </div>
        </div>
      </div>
    </section>
  );
}

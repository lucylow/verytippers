import { Github, Play } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Transform Social Tipping?
        </h2>
        <p className="text-xl text-muted-foreground mb-10">
          Join the VERY Hackathon and help us bring VeryTippers to life.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-bg text-primary-foreground px-10 py-5 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1 flex items-center gap-3"
          >
            <Github className="w-6 h-6" />
            View on GitHub
          </a>
          <button className="border-2 border-border text-foreground px-10 py-5 rounded-xl font-semibold text-lg hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-3">
            <Play className="w-6 h-6" />
            Watch Demo Video
          </button>
        </div>
      </div>
    </section>
  );
};

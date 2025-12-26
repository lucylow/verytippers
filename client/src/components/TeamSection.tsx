const teamMembers = [
  {
    avatar: "👨‍💻",
    name: "Alex Chen",
    role: "Smart Contract Dev",
    bio: "Previously at ConsenSys. 5+ years in blockchain development.",
    links: ["GitHub", "Twitter"],
  },
  {
    avatar: "👩‍🎨",
    name: "Sarah Kim",
    role: "UX/UI Designer",
    bio: "Ex-Google designer. Focused on making Web3 accessible.",
    links: ["Dribbble", "LinkedIn"],
  },
  {
    avatar: "👨‍💼",
    name: "Marcus Wong",
    role: "Backend Architect",
    bio: "Scaled fintech systems to 10M+ users. Now building Web3 infra.",
    links: ["GitHub", "Twitter"],
  },
];

export const TeamSection = () => {
  return (
    <section id="team" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Team <span className="gradient-text">SocialFi Labs</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Building the future of social finance on Very Network
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {teamMembers.map((member, i) => (
            <div
              key={i}
              className="bg-very-gray-900 rounded-2xl border border-border p-8 text-center hover:border-primary transition-all hover:-translate-y-1"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full gradient-bg flex items-center justify-center text-5xl">
                {member.avatar}
              </div>
              <h3 className="text-xl font-bold mb-1">{member.name}</h3>
              <p className="text-primary font-medium mb-3">{member.role}</p>
              <p className="text-muted-foreground text-sm mb-6">{member.bio}</p>
              <div className="flex justify-center gap-4">
                {member.links.map((link, j) => (
                  <a
                    key={j}
                    href="#"
                    className="text-muted-foreground hover:text-secondary transition-colors text-sm font-medium"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};



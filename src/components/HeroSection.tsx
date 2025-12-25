import { useEffect, useState } from "react";

export const HeroSection = () => {
  const [stats, setStats] = useState({ tips: 0, users: 0, volume: 0, response: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        tips: Math.floor(Math.random() * 1000) + 12500,
        users: Math.floor(Math.random() * 100) + 3400,
        volume: Math.floor(Math.random() * 10000) + 45000,
        response: Math.floor(Math.random() * 50) + 150,
      });
    }, 3000);
    setStats({ tips: 12847, users: 3456, volume: 48750, response: 187 });
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-32 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/50 px-4 py-2 rounded-full mb-8">
              <span className="text-xl">🏆</span>
              <span className="text-sm font-medium">VERY Hackathon 2025 Finalist</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Send <span className="gradient-text">Tips</span>, Not Just Messages
            </h1>

            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              The first social micro-tipping bot for Very Network. Reward great content, 
              support creators, and build communities with instant crypto tips.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <a 
                href="#demo"
                className="gradient-bg text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1 flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Try Live Demo
              </a>
              <button className="border-2 border-border text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                View Documentation
              </button>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {[
                { value: stats.tips.toLocaleString(), label: "Tips Sent" },
                { value: stats.users.toLocaleString(), label: "Active Users" },
                { value: `$${stats.volume.toLocaleString()}`, label: "Total Volume" },
                { value: `${stats.response}ms`, label: "Response" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative w-[340px] h-[680px] mx-auto bg-very-gray-900 rounded-[40px] p-5 shadow-2xl shadow-primary/20 border border-border">
              <div className="w-full h-full bg-very-gray-800 rounded-[25px] overflow-hidden">
                <PhoneChatDemo />
              </div>
            </div>
            
            <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-4">
              <div className="bg-very-gray-900 border border-border px-4 py-2 rounded-full font-medium animate-float">
                🏆 #1 Trending
              </div>
              <div className="bg-very-gray-900 border border-border px-4 py-2 rounded-full font-medium animate-float-delayed">
                ⚡ Gasless
              </div>
              <div className="bg-very-gray-900 border border-border px-4 py-2 rounded-full font-medium animate-float-delayed-2">
                🔐 KYC-Verified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg className="w-full h-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="fill-primary"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="fill-primary"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="fill-primary"></path>
        </svg>
      </div>
    </section>
  );
};

const PhoneChatDemo = () => {
  const messages = [
    { type: "incoming", sender: "@alice", text: "Just launched my new NFT collection! 🎨", time: "10:42" },
    { type: "outgoing", text: "Congrats! That's amazing work!", time: "10:43" },
    { type: "system", text: "💸 You sent 10 VERY to @alice" },
    { type: "incoming", sender: "@alice", text: "Thank you so much for the tip! 🙏", time: "10:44" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-very-gray-900 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span className="font-semibold">VeryChat</span>
        </div>
        <div className="flex items-center gap-2 text-secondary text-sm">
          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
          Live
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.type === "incoming" 
                ? "bg-very-gray-800 rounded-bl-sm self-start" 
                : msg.type === "outgoing"
                ? "bg-primary rounded-br-sm ml-auto"
                : "bg-very-gray-900 mx-auto text-center text-muted-foreground border border-primary/50"
            }`}
          >
            {msg.sender && <div className="font-semibold text-xs mb-1">{msg.sender}</div>}
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  );
};

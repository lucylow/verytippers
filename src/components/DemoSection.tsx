import { useState } from "react";
import { Send, RefreshCw } from "lucide-react";

const recipients = [
  { id: "alice", name: "@alice", role: "Content Creator" },
  { id: "bob", name: "@bob", role: "Community Helper" },
  { id: "charlie", name: "@charlie", role: "Developer" },
  { id: "diana", name: "@diana", role: "Artist" },
];

const leaderboardData = [
  { rank: 1, user: "@cryptoking", amount: "2,450 VERY" },
  { rank: 2, user: "@web3wizard", amount: "1,890 VERY" },
  { rank: 3, user: "@nftqueen", amount: "1,234 VERY" },
  { rank: 4, user: "@defimaster", amount: "987 VERY" },
];

export const DemoSection = () => {
  const [balance, setBalance] = useState(100);
  const [tipsSent, setTipsSent] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [recipient, setRecipient] = useState("alice");
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ type: string; text: string; sender?: string; amount?: number }>>([
    { type: "system", text: "Welcome to VeryTippers Demo! 👋" },
    { type: "incoming", sender: "@alice", text: "Hey everyone! Just posted my latest artwork 🎨" },
  ]);
  const [transactions, setTransactions] = useState<Array<{ to: string; amount: number; time: string }>>([]);

  const sendTip = () => {
    if (balance < amount) return;
    
    const recipientData = recipients.find(r => r.id === recipient);
    
    setBalance(prev => prev - amount);
    setTipsSent(prev => prev + 1);
    
    setMessages(prev => [
      ...prev,
      { type: "outgoing", text: message || "Great content! Keep it up! 🙌" },
      { type: "tip", text: `💸 You sent ${amount} VERY to ${recipientData?.name}`, amount },
      { type: "incoming", sender: recipientData?.name, text: "Thank you so much for the tip! 🙏" },
    ]);
    
    setTransactions(prev => [
      { to: recipientData?.name || "", amount, time: "Just now" },
      ...prev.slice(0, 4),
    ]);
    
    if (tipsSent === 0 && !badges.includes("🥇")) {
      setBadges(prev => [...prev, "🥇"]);
    }
    if (amount >= 50 && !badges.includes("💖")) {
      setBadges(prev => [...prev, "💖"]);
    }
    
    setMessage("");
  };

  return (
    <section id="demo" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Interactive <span className="gradient-text">Live Demo</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Experience VeryTippers in action. Try tipping below!
          </p>
        </div>

        <div className="grid lg:grid-cols-[350px_1fr] gap-6 bg-very-gray-900 rounded-3xl border border-border overflow-hidden">
          {/* Sidebar */}
          <div className="bg-background p-6 border-r border-border">
            {/* User Profile */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-bg flex items-center justify-center text-4xl">
                👤
              </div>
              <h3 className="font-bold text-lg">Your Profile</h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className="font-bold text-secondary">{balance} VERY</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tips Sent</div>
                  <div className="font-bold">{tipsSent}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Badges</div>
                  <div className="font-bold">{badges.length}</div>
                </div>
              </div>
              {badges.length > 0 && (
                <div className="flex justify-center gap-2 mt-4">
                  {badges.map((badge, i) => (
                    <span key={i} className="text-2xl">{badge}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-5">
              <h4 className="font-bold text-secondary">Send a Tip</h4>
              
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Recipient</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-very-gray-900 border border-border rounded-xl p-3 text-foreground focus:border-primary outline-none"
                >
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Amount (VERY)</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="text-center text-2xl font-bold text-secondary mt-2">{amount} VERY</div>
                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${
                        amount === val ? "border-primary bg-primary/20" : "border-border hover:border-primary"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message with your tip..."
                  className="w-full bg-very-gray-900 border border-border rounded-xl p-3 text-foreground focus:border-primary outline-none min-h-[80px] resize-none"
                />
              </div>

              <button
                onClick={sendTip}
                disabled={balance < amount}
                className="w-full gradient-bg text-primary-foreground py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                Send Tip
              </button>

              <div className="bg-very-gray-900 rounded-xl p-4 border border-border">
                <div className="text-secondary font-semibold mb-3">💸 Transaction Preview</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From:</span>
                    <span>Your Wallet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To:</span>
                    <span>@{recipient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span>{amount} VERY</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gas Fee:</span>
                    <span className="text-secondary font-semibold">Sponsored 🎁</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{amount} VERY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="p-6 flex flex-col gap-6">
            {/* Chat */}
            <div className="flex-1 bg-background rounded-2xl border border-border overflow-hidden flex flex-col">
              <div className="p-4 bg-very-gray-900 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💬</span>
                  <span className="font-semibold">VeryChat Demo</span>
                </div>
                <div className="flex items-center gap-2 text-secondary text-sm">
                  <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                  Live
                </div>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[300px]">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                      msg.type === "incoming"
                        ? "bg-very-gray-800 rounded-bl-sm"
                        : msg.type === "outgoing"
                        ? "bg-primary rounded-br-sm ml-auto"
                        : msg.type === "tip"
                        ? "bg-primary/20 border border-primary mx-auto text-center"
                        : "bg-very-gray-900 mx-auto text-center text-muted-foreground"
                    }`}
                  >
                    {msg.sender && <div className="font-semibold text-xs mb-1">{msg.sender}</div>}
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Panel */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-background rounded-xl border border-border p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-secondary">Live Leaderboard</h4>
                  <button className="text-muted-foreground hover:text-foreground">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {leaderboardData.map((entry) => (
                    <div key={entry.rank} className="flex items-center justify-between p-3 bg-very-gray-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-secondary font-bold w-6">{entry.rank}</span>
                        <span>{entry.user}</span>
                      </div>
                      <span className="font-semibold">{entry.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-background rounded-xl border border-border p-4">
                <h4 className="font-bold text-secondary mb-4">Transaction Log</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {transactions.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No transactions yet. Send your first tip!</p>
                  ) : (
                    transactions.map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-very-gray-900 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span>💸</span>
                          <span>→ {tx.to}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-secondary font-semibold">{tx.amount} VERY</div>
                          <div className="text-xs text-muted-foreground">{tx.time}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

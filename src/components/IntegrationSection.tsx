import { Copy, Check } from "lucide-react";
import { useState } from "react";

export const IntegrationSection = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section id="integration" className="py-24 bg-very-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            VERY Network <span className="gradient-text">Integration</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Built on Very Chain, integrated with VeryChat and Wepin Wallet
          </p>
        </div>

        <div className="space-y-8">
          {/* Step 1 */}
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center font-bold text-xl shrink-0">
              1
            </div>
            <div className="flex-1 bg-background rounded-2xl border border-border p-6">
              <h3 className="text-xl font-bold mb-2">VeryChat Bot API</h3>
              <p className="text-muted-foreground mb-4">
                Direct integration with VeryChat messenger for seamless user experience
              </p>
              <pre className="bg-very-gray-900 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm font-mono text-very-gray-300">
{`// VeryChat Bot Integration
const bot = new VerychatBot({
  token: VERYCHAT_BOT_TOKEN,
  webhook: 'https://api.verytippers.com/webhook'
});

bot.on('message', async (msg) => {
  if (msg.text.startsWith('/tip')) {
    await processTipCommand(msg);
  }
});`}
                </code>
              </pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center font-bold text-xl shrink-0">
              2
            </div>
            <div className="flex-1 bg-background rounded-2xl border border-border p-6">
              <h3 className="text-xl font-bold mb-2">VERY Chain Smart Contracts</h3>
              <p className="text-muted-foreground mb-4">
                Gas-efficient contracts deployed on VERY Chain mainnet
              </p>
              <div className="space-y-3">
                {[
                  { name: "Tip.sol", address: "0x7a3b8c9d4e5f6a1b2c3d4e5f6a7b8c9d4e5f6c4f2" },
                  { name: "BadgeFactory.sol", address: "0x9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9e5d8" },
                ].map((contract) => (
                  <div
                    key={contract.name}
                    className="flex items-center justify-between bg-very-gray-900 rounded-xl p-4"
                  >
                    <span className="font-semibold">{contract.name}</span>
                    <div className="flex items-center gap-3">
                      <code className="text-secondary text-sm font-mono">
                        {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(contract.address, contract.name)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied === contract.name ? (
                          <Check className="w-4 h-4 text-secondary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center font-bold text-xl shrink-0">
              3
            </div>
            <div className="flex-1 bg-background rounded-2xl border border-border p-6">
              <h3 className="text-xl font-bold mb-2">Wepin Wallet Integration</h3>
              <p className="text-muted-foreground mb-4">
                Seamless wallet connection and transaction signing
              </p>
              <pre className="bg-very-gray-900 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm font-mono text-very-gray-300">
{`// Initialize Wepin SDK
const wepin = new Wepin({
  appId: 'verytippers-app',
  appKey: 'YOUR_APP_KEY'
});

// Connect wallet
const wallet = await wepin.connect();
const address = wallet.getAddress();`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

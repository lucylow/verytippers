import { useState } from "react";
import { CheckCircle2, ExternalLink, AlertCircle, Copy } from "lucide-react";

interface SetupStep {
  id: number;
  title: string;
  description: string;
  action?: {
    label: string;
    url: string;
  };
  code?: string;
  completed?: boolean;
}

export const VeryLabsSetupGuide = () => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const steps: SetupStep[] = [
    {
      id: 1,
      title: "Register Your Project",
      description: "Visit the VeryLabs Developer Portal to register your project and get your credentials.",
      action: {
        label: "Go to Developer Portal",
        url: "https://developers.verylabs.io/"
      }
    },
    {
      id: 2,
      title: "Get Your Project ID",
      description: "After registration, you'll receive a Project ID. Copy it from the developer console.",
      code: "VERYCHAT_PROJECT_ID=your_project_id_here"
    },
    {
      id: 3,
      title: "Get Your API Key",
      description: "Generate an API Key from your project dashboard. Keep it secure!",
      code: "VERYCHAT_API_KEY=your_api_key_here"
    },
    {
      id: 4,
      title: "Configure Environment Variables",
      description: "Add your credentials to your .env file in the backend directory.",
      code: `# VeryChat API Configuration
VERYCHAT_API_URL=https://gapi.veryapi.io
VERYCHAT_PROJECT_ID=your_project_id_here
VERYCHAT_API_KEY=your_api_key_here`
    },
    {
      id: 5,
      title: "Verify Configuration",
      description: "Restart your backend server and check the logs to confirm the API is connected.",
      action: {
        label: "View API Documentation",
        url: "https://developers.verylabs.io/"
      }
    }
  ];

  const copyToClipboard = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">
          VeryLabs API Setup Guide
        </h2>
        <p className="text-muted-foreground">
          Follow these steps to integrate with the VeryChat API from{" "}
          <a
            href="https://developers.verylabs.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            developers.verylabs.io
          </a>
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="border border-border rounded-lg p-6 bg-very-gray-900/50 hover:bg-very-gray-900 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  {step.id}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                {step.code && (
                  <div className="relative">
                    <pre className="bg-very-gray-800 p-4 rounded-lg overflow-x-auto text-sm border border-border">
                      <code>{step.code}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(step.code!, step.id)}
                      className="absolute top-2 right-2 p-2 hover:bg-very-gray-700 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedStep === step.id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                )}

                {step.action && (
                  <a
                    href={step.action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    {step.action.label}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold mb-2">Need Help?</h4>
            <p className="text-sm text-muted-foreground mb-3">
              If you encounter any issues during setup, check the official documentation or contact support.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://developers.verylabs.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                API Documentation <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-muted-foreground">•</span>
              <a
                href="https://wp.verylabs.io/verychain"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                VERY Chain Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


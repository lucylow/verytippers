import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

interface ApiStatus {
  isConfigured: boolean;
  isHealthy: boolean;
  lastCheck?: string;
  rateLimitRemaining?: number;
  error?: string;
}

export const VeryLabsApiStatus = () => {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/verychat/status');
      const data = await response.json();
      setStatus(data);
      setLastRefresh(new Date());
    } catch (error) {
      setStatus({
        isConfigured: false,
        isHealthy: false,
        error: 'Failed to check API status'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="border border-border rounded-lg p-4 bg-very-gray-900/50">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking API status...</span>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (!status?.isConfigured) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    if (status.isHealthy) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!status?.isConfigured) {
      return "Not Configured";
    }
    if (status.isHealthy) {
      return "Healthy";
    }
    return "Unhealthy";
  };

  const getStatusColor = () => {
    if (!status?.isConfigured) {
      return "text-yellow-500";
    }
    if (status.isHealthy) {
      return "text-green-500";
    }
    return "text-red-500";
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-very-gray-900/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold">VeryChat API Status</h3>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="p-2 hover:bg-very-gray-800 rounded transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {status && (
        <div className="space-y-2 text-sm">
          {status.rateLimitRemaining !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate Limit Remaining:</span>
              <span className={status.rateLimitRemaining > 100 ? 'text-green-500' : 'text-yellow-500'}>
                {status.rateLimitRemaining}
              </span>
            </div>
          )}
          {status.lastCheck && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Check:</span>
              <span className="text-muted-foreground">
                {new Date(status.lastCheck).toLocaleTimeString()}
              </span>
            </div>
          )}
          {status.error && (
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
              {status.error}
            </div>
          )}
          {!status.isConfigured && (
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs">
              <p className="mb-2">API not configured. Please set up your credentials.</p>
              <a
                href="https://developers.verylabs.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-yellow-300 hover:underline"
              >
                Register at developers.verylabs.io <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <a
          href="https://developers.verylabs.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View API Documentation <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};


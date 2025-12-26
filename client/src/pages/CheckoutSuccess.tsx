import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session_id");
    setSessionId(id);
  }, []);

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
      <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your credits have been added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionId && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Session ID: <code className="text-xs">{sessionId}</code>
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation("/")}
              className="flex-1"
            >
              Go Home
            </Button>
            <Button
              onClick={() => setLocation("/demo")}
              variant="outline"
              className="flex-1"
            >
              Try Tipping
            </Button>
          </div>
        </CardContent>
      </Card>
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


import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DAOGovernance } from "@/components/DAOGovernance";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DAO() {
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
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <ErrorBoundary
          fallback={
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold mb-4">Failed to load DAO Governance</h2>
              <p className="text-muted-foreground mb-4">
                There was an error loading the DAO governance interface.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90"
                >
                  Go Home
                </button>
              </div>
            </div>
          }
          onError={(error, errorInfo) => {
            console.error("Error in DAO Governance:", error, errorInfo);
          }}
        >
          <DAOGovernance />
        </ErrorBoundary>
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


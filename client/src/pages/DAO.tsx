import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DAOGovernance } from "@/components/DAOGovernance";

export default function DAO() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <DAOGovernance />
      </main>
      <Footer />
    </div>
  );
}

